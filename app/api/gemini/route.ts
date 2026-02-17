import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { getNutritionFromCache, setNutritionCache, type NutritionData } from '@/app/lib/db';

interface FoodEstimate {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
}

interface FoodInput {
  name: string;
  servingSize: string;
  ingredients: string | null;
}

/**
 * 
 * @param name 
 * @returns 
 */
function getCacheKey(name: string): string {
  return name.toLowerCase().trim();
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { items } = body as {
    items: FoodInput[];
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Items array required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const results: Record<string, FoodEstimate> = {};
  const uncachedItems: FoodInput[] = [];

  // Check database cache for each item
  for (const item of items) {
    const key = getCacheKey(item.name);
    const cached = await getNutritionFromCache(key);
    if (cached) {
      results[key] = cached;
    } else {
      uncachedItems.push(item);
    }
  }

  if (uncachedItems.length > 0) {
    const foodList = uncachedItems
      .map((item, i) => {
        let line = `${i + 1}. "${item.name}" (dining hall serving size: ${item.servingSize})`;
        if (item.ingredients) {
          line += `\n   Ingredients: ${item.ingredients}`;
        }
        return line;
      })
      .join('\n');

    const prompt = `For each food item below from a college dining hall, estimate its nutrition for the given serving size. The serving size comes from the dining hall's own data. Use the ingredients list (when provided) to make a more accurate estimate. Return a JSON array with one object per item in the same order.

Also assign one or more nutritional category tags from this list based on the item's nutritional profile:
- "High calorie"
- "Low calorie"
- "Protein rich" — slightly prioritize and have a lower threshold for "high protein" vegetarian/vegan items
- "Low fat"
- "Nutrient-rich"

Include a "tags" array in each object. An item can have multiple tags or none.

${foodList}`;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['calories', 'protein', 'carbs', 'fat', 'tags'],
            },
          },
        },
      });

      const text = response.text;

      if (text) {
        const estimates: FoodEstimate[] = JSON.parse(text);

        // Save new estimates to database cache
        for (let i = 0; i < uncachedItems.length && i < estimates.length; i++) {
          const key = getCacheKey(uncachedItems[i].name);
          const estimate: NutritionData = {
            calories: Math.round(estimates[i].calories),
            protein: Math.round(estimates[i].protein),
            carbs: Math.round(estimates[i].carbs),
            fat: Math.round(estimates[i].fat),
            tags: estimates[i].tags || [],
          };
          results[key] = estimate;

          // Save to database (don't await to avoid blocking response)
          setNutritionCache(key, estimate).catch((err) => {
            console.error(`Failed to cache nutrition for ${key}:`, err);
          });
        }
      }
    } catch (err) {
      console.error('Gemini request failed:', err);
    }
  }

  return NextResponse.json({ results });
}

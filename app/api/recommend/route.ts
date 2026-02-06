import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

interface MenuItemInput {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
}

interface UserGoals {
  dailyCalories: number;
  dailyProtein: number;
  fitnessGoal: string;
  appetite: string;
  restrictions: string;
  taste: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { menuItems, goals, likedItems } = body as {
    menuItems: MenuItemInput[];
    goals: UserGoals;
    likedItems?: string[];
  };

  if (!menuItems || menuItems.length === 0) {
    return NextResponse.json({ error: 'Menu items required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const menuList = menuItems
    .map((item, i) => `${i + 1}. ${item.name} (serving: ${item.servingSize}) — ${item.calories} cal, ${item.protein}g protein, ${item.carbs}g carbs, ${item.fat}g fat`)
    .join('\n');

  const prompt = `You are a meal planning assistant for a college dining hall. A student wants recommendations for THIS MEAL based on their goals. Here are the available menu items with their per-serving nutrition:

${menuList}

Student's profile:
- Daily calorie target: ${goals.dailyCalories} cal
- Daily protein target: ${goals.dailyProtein}g
- Goal: ${goals.fitnessGoal || 'general health'}
- Appetite for this meal: ${goals.appetite || 'medium'}
- Taste preference: ${goals.taste || 'balanced'}${goals.taste === 'tasty' ? ' (IMPORTANT: strongly prioritize items that taste great and that students love — nutrition is secondary to enjoyment)' : ''}
- Dietary restrictions: ${goals.restrictions || 'none'}${likedItems && likedItems.length > 0 ? `\n- Preferred/liked items (prioritize these${goals.taste === 'tasty' ? ' HEAVILY' : ' when possible'}): ${likedItems.join(', ')}` : ''}

Note: Disliked items have already been removed from the list above, so all items shown are acceptable.

Since this is ONE meal of the day, aim for roughly 1/3 of the daily targets unless the student's appetite suggests otherwise.

Return a JSON object with exactly this structure:
{
  "mealPlan": [
    {
      "name": "Item Name",
      "quantity": "human-readable quantity (e.g. '2 pieces', '1 cup', '1 bowl')",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ],
  "mealPlanTotals": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "mealPlanReasoning": "1-2 sentence explanation of why this combination works for the student's goals",
  "extras": [
    {
      "name": "Item Name",
      "quantity": "human-readable quantity",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ]
}

Rules:
- Quantities should be in common terms (cups, pieces, bowls, slices) not grams
- You can suggest multiple servings of the same item (e.g. "2 pieces" of chicken)
- Scale the nutrition numbers to match the suggested quantity
- The "extras" list should have about 4 items — include both add-ons that complement the meal plan AND alternative items/combinations the student could eat instead to hit similar calorie and protein targets
- Respect dietary restrictions strictly
- Round all numbers to whole values
- Return ONLY the JSON, no explanation`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mealPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  calories: { type: Type.NUMBER },
                  protein: { type: Type.NUMBER },
                  carbs: { type: Type.NUMBER },
                  fat: { type: Type.NUMBER },
                },
                required: ['name', 'quantity', 'calories', 'protein', 'carbs', 'fat'],
              },
            },
            mealPlanTotals: {
              type: Type.OBJECT,
              properties: {
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
              },
              required: ['calories', 'protein', 'carbs', 'fat'],
            },
            mealPlanReasoning: { type: Type.STRING },
            extras: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  calories: { type: Type.NUMBER },
                  protein: { type: Type.NUMBER },
                  carbs: { type: Type.NUMBER },
                  fat: { type: Type.NUMBER },
                },
                required: ['name', 'quantity', 'calories', 'protein', 'carbs', 'fat'],
              },
            },
          },
          required: ['mealPlan', 'mealPlanTotals', 'mealPlanReasoning', 'extras'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: 'No response from Gemini' }, { status: 500 });
    }

    const recommendation = JSON.parse(text);
    return NextResponse.json({ recommendation });
  } catch (err) {
    console.error('Recommendation request failed:', err);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}

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
  const { breakfastItems, lunchItems, dinnerItems, goals, likedItems } = body as {
    breakfastItems: MenuItemInput[];
    lunchItems: MenuItemInput[];
    dinnerItems: MenuItemInput[];
    goals: UserGoals;
    likedItems?: string[];
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const formatMenu = (items: MenuItemInput[]) =>
    items.length === 0
      ? '(No items available)'
      : items
          .map((item, i) => `${i + 1}. ${item.name} (serving: ${item.servingSize}) — ${item.calories} cal, ${item.protein}g protein, ${item.carbs}g carbs, ${item.fat}g fat`)
          .join('\n');

  const prompt = `You are a meal planning assistant for a college dining hall. A student wants a FULL DAY meal plan — breakfast, lunch, AND dinner — that is varied and balanced across the whole day. Each meal has a DIFFERENT menu of available items.

=== BREAKFAST MENU ===
${formatMenu(breakfastItems)}

=== LUNCH MENU ===
${formatMenu(lunchItems)}

=== DINNER MENU ===
${formatMenu(dinnerItems)}

Student's profile:
- Daily calorie target: ${goals.dailyCalories} cal
- Daily protein target: ${goals.dailyProtein}g
- Goal: ${goals.fitnessGoal || 'general health'}
- General appetite: ${goals.appetite || 'medium'}
- Taste preference: ${goals.taste || 'balanced'}${goals.taste === 'tasty' ? ' (IMPORTANT: strongly prioritize items that taste great and that students love — nutrition is secondary to enjoyment)' : ''}
- Dietary restrictions: ${goals.restrictions || 'none'}${likedItems && likedItems.length > 0 ? `\n- Preferred/liked items (prioritize these${goals.taste === 'tasty' ? ' HEAVILY' : ' when possible'}): ${likedItems.join(', ')}` : ''}

CRITICAL RULES FOR VARIETY:
- Each meal should feature DIFFERENT main items — do NOT repeat the same protein or main dish across meals
- Distribute calories and protein across the day to hit the daily totals (not 1/3 per meal — a lighter breakfast and heavier lunch/dinner is fine)
- If an item appears in multiple meal menus (e.g. always-available items), use it in at most ONE meal
- Make each meal feel like a distinct, complete meal

For each meal, return a mealPlan (main items) and extras (4 add-ons or alternative swaps).

Return ONLY JSON. Round all numbers to whole values. Use common quantity terms (cups, pieces, bowls).`;

  try {
    const mealSchema = {
      type: Type.OBJECT as const,
      properties: {
        mealPlan: {
          type: Type.ARRAY as const,
          items: {
            type: Type.OBJECT as const,
            properties: {
              name: { type: Type.STRING as const },
              quantity: { type: Type.STRING as const },
              calories: { type: Type.NUMBER as const },
              protein: { type: Type.NUMBER as const },
              carbs: { type: Type.NUMBER as const },
              fat: { type: Type.NUMBER as const },
            },
            required: ['name', 'quantity', 'calories', 'protein', 'carbs', 'fat'] as const,
          },
        },
        mealPlanTotals: {
          type: Type.OBJECT as const,
          properties: {
            calories: { type: Type.NUMBER as const },
            protein: { type: Type.NUMBER as const },
            carbs: { type: Type.NUMBER as const },
            fat: { type: Type.NUMBER as const },
          },
          required: ['calories', 'protein', 'carbs', 'fat'] as const,
        },
        extras: {
          type: Type.ARRAY as const,
          items: {
            type: Type.OBJECT as const,
            properties: {
              name: { type: Type.STRING as const },
              quantity: { type: Type.STRING as const },
              calories: { type: Type.NUMBER as const },
              protein: { type: Type.NUMBER as const },
              carbs: { type: Type.NUMBER as const },
              fat: { type: Type.NUMBER as const },
            },
            required: ['name', 'quantity', 'calories', 'protein', 'carbs', 'fat'] as const,
          },
        },
      },
      required: ['mealPlan', 'mealPlanTotals', 'extras'] as const,
    };

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
            breakfast: mealSchema,
            lunch: mealSchema,
            dinner: mealSchema,
            dayTotals: {
              type: Type.OBJECT,
              properties: {
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
              },
              required: ['calories', 'protein', 'carbs', 'fat'],
            },
          },
          required: ['breakfast', 'lunch', 'dinner', 'dayTotals'],
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
    console.error('Day recommendation request failed:', err);
    return NextResponse.json({ error: 'Failed to generate day recommendations' }, { status: 500 });
  }
}

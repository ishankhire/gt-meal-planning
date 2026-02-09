import { useState, useEffect, useCallback } from 'react';
import type { Food, MenuItem, FoodEstimate } from '@/app/types/menu';
import { getCacheKey, getServingSize } from '@/app/utils/menu';

export function useGeminiNutrition(allFoodItems: MenuItem[]) {
  const [geminiData, setGeminiData] = useState<Record<string, FoodEstimate>>({});
  const [loadingGemini, setLoadingGemini] = useState(false);

  useEffect(() => {
    if (allFoodItems.length === 0) return;

    const seen = new Set<string>();
    const foodInputs: { name: string; servingSize: string; ingredients: string | null }[] = [];

    for (const item of allFoodItems) {
      const food = item.food!;
      const key = getCacheKey(food.name);
      if (seen.has(key) || key in geminiData) continue;
      seen.add(key);
      foodInputs.push({
        name: food.name,
        servingSize: getServingSize(food),
        ingredients: food.ingredients,
      });
    }

    if (foodInputs.length === 0) return;

    const fetchEstimates = async () => {
      setLoadingGemini(true);
      try {
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: foodInputs }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.results) {
            setGeminiData(prev => ({ ...prev, ...data.results }));
          }
        }
      } catch (err) {
        console.error('Gemini fetch failed:', err);
      } finally {
        setLoadingGemini(false);
      }
    };

    fetchEstimates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFoodItems.length]);

  const getEstimate = useCallback((food: Food): FoodEstimate | null => {
    return geminiData[getCacheKey(food.name)] ?? null;
  }, [geminiData]);

  return {
    geminiData,
    loadingGemini,
    getEstimate,
  };
}

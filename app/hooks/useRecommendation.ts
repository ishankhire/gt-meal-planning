import { useState, useCallback } from 'react';
import type { Food, MenuItem, FoodEstimate, Recommendation, RecGoals } from '@/app/types/menu';
import { getServingSize } from '@/app/utils/menu';

export function useRecommendation(
  allFoodItems: MenuItem[],
  recGoals: RecGoals,
  getEstimate: (food: Food) => FoodEstimate | null,
  getFoodRating: (foodName: string) => 'like' | 'dislike' | null,
  savePreferences: (goals: RecGoals) => Promise<void>,
) {
  const [showRecommender, setShowRecommender] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const fetchRecommendation = useCallback(async () => {
    if (allFoodItems.length === 0) return;
    setLoadingRec(true);
    setRecError(null);
    setRecommendation(null);

    // Save preferences whenever the user generates recommendations
    savePreferences(recGoals);

    try {
      // Exclude disliked items from recommendations entirely
      const eligibleItems = allFoodItems.filter(item => {
        const rating = getFoodRating(item.food!.name);
        return rating !== 'dislike';
      });
      const menuItems = eligibleItems.map(item => {
        const food = item.food!;
        const est = getEstimate(food);
        return {
          name: food.name,
          calories: est?.calories ?? 0,
          protein: est?.protein ?? 0,
          carbs: est?.carbs ?? 0,
          fat: est?.fat ?? 0,
          servingSize: getServingSize(food),
        };
      });
      const likedItems = eligibleItems
        .filter(item => getFoodRating(item.food!.name) === 'like')
        .map(item => item.food!.name);
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItems, goals: recGoals, likedItems }),
      });
      if (!response.ok) throw new Error('Failed to get recommendations');
      const data = await response.json();
      if (data.recommendation) {
        setRecommendation(data.recommendation);
      } else {
        setRecError(data.error || 'No recommendations returned');
      }
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingRec(false);
    }
  }, [allFoodItems, recGoals, getEstimate, getFoodRating, savePreferences]);

  return {
    showRecommender,
    setShowRecommender,
    recommendation,
    loadingRec,
    recError,
    fetchRecommendation,
  };
}

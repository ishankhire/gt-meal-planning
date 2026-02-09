import { useState, useEffect, useCallback } from 'react';
import type { Session } from 'next-auth';
import { getCacheKey } from '@/app/utils/menu';

export function useFoodRatings(session: Session | null) {
  const [foodRatings, setFoodRatings] = useState<Record<string, 'like' | 'dislike'>>({});
  const [sortRatings, setSortRatings] = useState<Record<string, 'like' | 'dislike'>>({});
  const [ratingsLoaded, setRatingsLoaded] = useState(false);

  const loadFoodRatings = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/food-ratings');
      if (res.ok) {
        const data = await res.json();
        if (data.ratings) {
          setFoodRatings(data.ratings);
          setSortRatings(data.ratings);
        }
      }
    } catch (err) {
      console.error('Failed to load food ratings:', err);
    } finally {
      setRatingsLoaded(true);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user && !ratingsLoaded) {
      loadFoodRatings();
    }
  }, [session?.user, ratingsLoaded, loadFoodRatings]);

  const toggleFoodRating = useCallback(async (foodName: string, rating: 'like' | 'dislike') => {
    const key = getCacheKey(foodName);
    const current = foodRatings[key];
    const newRating = current === rating ? null : rating;

    // Immediate visual update
    const updatedRatings: Record<string, 'like' | 'dislike'> = { ...foodRatings };
    if (newRating === null) {
      delete updatedRatings[key];
    } else {
      updatedRatings[key] = newRating;
    }
    setFoodRatings(updatedRatings);

    // Delay the sort reorder so the user sees the visual feedback first
    setTimeout(() => {
      setSortRatings({ ...updatedRatings });
    }, 600);

    // Persist to server (only if signed in)
    if (session?.user) {
      try {
        await fetch('/api/food-ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foodKey: key, rating: newRating }),
        });
      } catch (err) {
        console.error('Failed to save food rating:', err);
      }
    }
  }, [foodRatings, session?.user]);

  const getFoodRating = useCallback((foodName: string): 'like' | 'dislike' | null => {
    return foodRatings[getCacheKey(foodName)] ?? null;
  }, [foodRatings]);

  return {
    foodRatings,
    sortRatings,
    ratingsLoaded,
    toggleFoodRating,
    getFoodRating,
  };
}

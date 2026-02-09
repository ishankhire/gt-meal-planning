import { useState, useEffect, useCallback } from 'react';
import type { Session } from 'next-auth';
import type { DietaryFilters, NutritionalFilters, RecGoals } from '@/app/types/menu';

export function usePreferences(session: Session | null) {
  const [filters, setFilters] = useState<DietaryFilters>({
    vegetarian: false,
    vegan: false,
    eggless: false,
    glutenFree: false,
    noDairy: false,
  });
  const [nutritionalFilters, setNutritionalFilters] = useState<NutritionalFilters>({
    highCalorie: false,
    lowCalorie: false,
    proteinRich: false,
    lowFat: false,
    nutrientRich: false,
  });
  const [recGoals, setRecGoals] = useState<RecGoals>({
    dailyCalories: 2000,
    dailyProtein: 150,
    fitnessGoal: '',
    appetite: 'medium',
    taste: 'balanced',
    restrictions: '',
  });
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/preferences');
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          const { filters: savedFilters, nutritionalFilters: savedNutritional, ...goals } = data.preferences;
          setRecGoals(goals);
          if (savedFilters) {
            setFilters(savedFilters);
          }
          if (savedNutritional) {
            setNutritionalFilters(savedNutritional);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setPrefsLoaded(true);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user && !prefsLoaded) {
      loadPreferences();
    }
  }, [session?.user, prefsLoaded, loadPreferences]);

  const savePreferences = useCallback(async (
    goals: RecGoals,
    currentFilters?: DietaryFilters,
    currentNutritional?: NutritionalFilters
  ) => {
    if (!session?.user) return;
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            ...goals,
            filters: currentFilters ?? filters,
            nutritionalFilters: currentNutritional ?? nutritionalFilters,
          },
        }),
      });
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  }, [session?.user, filters, nutritionalFilters]);

  return {
    filters,
    setFilters,
    nutritionalFilters,
    setNutritionalFilters,
    recGoals,
    setRecGoals,
    prefsLoaded,
    savePreferences,
  };
}

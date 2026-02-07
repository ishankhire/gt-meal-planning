'use client';

// Imported files
import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

interface FoodIcon {
  id: number;
  synced_name: string;
  enabled: boolean;
}

interface Food {
  id: number;
  name: string;
  description: string | null;
  rounded_nutrition_info: Record<string, unknown> | null;
  serving_size_info: {
    serving_size_amount: string | null;
    serving_size_unit: string | null;
  } | null;
  icons: {
    food_icons: FoodIcon[];
  } | null;
  ingredients: string | null;
}

interface MenuItem {
  id: number;
  food: Food | null;
  is_section_title: boolean;
  text: string;
}

interface DayMenu {
  date: string;
  menu_items: MenuItem[];
}

interface MenuData {
  days: DayMenu[];
}

interface FoodEstimate {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
}

interface RecommendedItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Recommendation {
  mealPlan: RecommendedItem[];
  mealPlanTotals: { calories: number; protein: number; carbs: number; fat: number };
  mealPlanReasoning: string;
  extras: RecommendedItem[];
}

type MealType = 'breakfast' | 'lunch' | 'dinner';

function getCacheKey(name: string): string {
  return name.toLowerCase().trim();
}

export default function Home() {
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filters, setFilters] = useState({
    vegetarian: false,
    vegan: false,
    eggless: false,
    glutenFree: false,
    noDairy: false,
  });
  const [nutritionalFilters, setNutritionalFilters] = useState({
    highCalorie: false,
    lowCalorie: false,
    proteinRich: false,
    lowFat: false,
    nutrientRich: false,
  });
  const [dietaryOpen, setDietaryOpen] = useState(true);
  const [nutritionalOpen, setNutritionalOpen] = useState(false);

  // Gemini nutrition data for all items
  const [geminiData, setGeminiData] = useState<Record<string, FoodEstimate>>({});
  const [loadingGemini, setLoadingGemini] = useState(false);

  // Recommendation state
  const [showRecommender, setShowRecommender] = useState(false);
  const [recGoals, setRecGoals] = useState({
    dailyCalories: 2000,
    dailyProtein: 150,
    fitnessGoal: '',
    appetite: 'medium',
    taste: 'balanced',
    restrictions: '',
  });
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Email opt-in state
  const [emailOptIn, setEmailOptIn] = useState<boolean | null>(null);
  const [emailOptInChoice, setEmailOptInChoice] = useState<'yes' | 'no' | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  // Food like/dislike ratings: keyed by food name (lowercase), value is 'like' | 'dislike'
  const [foodRatings, setFoodRatings] = useState<Record<string, 'like' | 'dislike'>>({});
  // Delayed copy of ratings used for sorting only — gives visual feedback time before reordering
  const [sortRatings, setSortRatings] = useState<Record<string, 'like' | 'dislike'>>({});
  const [ratingsLoaded, setRatingsLoaded] = useState(false);

  const { data: session } = useSession();

  // Load saved preferences when the user is signed in
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

  // Load food ratings when signed in
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

  // Load email opt-in status when signed in
  useEffect(() => {
    if (!session?.user) return;
    const loadEmailStatus = async () => {
      try {
        const res = await fetch('/api/email');
        if (res.ok) {
          const data = await res.json();
          setEmailOptIn(data.optedIn ?? false);
          setEmailOptInChoice(data.optedIn ? 'yes' : 'no');
        }
      } catch (err) {
        console.error('Failed to load email status:', err);
      }
    };
    loadEmailStatus();
  }, [session?.user]);

  // Save email opt-in preference and optionally send email
  const saveEmailPreference = async () => {
    if (emailOptInChoice === null) return;
    setEmailSaving(true);
    setEmailStatus(null);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optIn: emailOptInChoice === 'yes' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailStatus(data.error || 'Something went wrong');
      } else if (data.emailSent) {
        setEmailOptIn(true);
        setEmailStatus('Subscribed! Check your inbox for tomorrow\'s meal plan.');
      } else {
        setEmailOptIn(false);
        setEmailStatus('Preference saved. You will not receive emails.');
      }
    } catch (err) {
      setEmailStatus('Failed to save preference');
      console.error(err);
    } finally {
      setEmailSaving(false);
    }
  };

  // Toggle a food item's rating
  const toggleFoodRating = async (foodName: string, rating: 'like' | 'dislike') => {
    const key = getCacheKey(foodName);
    const current = foodRatings[key];
    // If already set to this rating, remove it (toggle off). Otherwise set it.
    const newRating = current === rating ? null : rating;

    // Immediate visual update (color change)
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
  };

  // Helper to get the rating for a food item
  const getFoodRating = (foodName: string): 'like' | 'dislike' | null => {
    return foodRatings[getCacheKey(foodName)] ?? null;
  };

  // Save preferences to server
  const savePreferences = async (goals: typeof recGoals, currentFilters?: typeof filters, currentNutritional?: typeof nutritionalFilters) => {
    if (!session?.user) return;
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { ...goals, filters: currentFilters ?? filters, nutritionalFilters: currentNutritional ?? nutritionalFilters } }),
      });
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  // Fetch menu data
  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/menu?mealType=${mealType}&date=${selectedDate}`);
        if (!response.ok) throw new Error('Failed to fetch menu');
        const data = await response.json();
        setMenuData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [mealType, selectedDate]);

  // Get menu items for the selected date
  const getTodayMenu = (): MenuItem[] => {
    if (!menuData?.days) return [];
    const today = menuData.days.find(day => day.date === selectedDate);
    return today?.menu_items || [];
  };

  const hasIcon = (food: Food, iconName: string): boolean => {
    return food.icons?.food_icons?.some(icon => icon.synced_name === iconName) ?? false;
  };

  const allFoodItems = getTodayMenu().filter(item => item.food && !item.is_section_title);

  const passesAllFilters = (food: Food): boolean => {
    // Dietary filters (AND exclusion)
    if (filters.vegan && !hasIcon(food, 'Vegan')) return false;
    if (filters.vegetarian && !hasIcon(food, 'Vegetarian') && !hasIcon(food, 'Vegan')) return false;
    if (filters.eggless && hasIcon(food, 'Eggs Allergen')) return false;
    if (filters.glutenFree && hasIcon(food, 'Gluten')) return false;
    if (filters.noDairy && hasIcon(food, 'Milk')) return false;

    // Nutritional filters (OR inclusion — match ANY selected tag)
    const selectedTags: string[] = [];
    if (nutritionalFilters.highCalorie) selectedTags.push('High calorie');
    if (nutritionalFilters.lowCalorie) selectedTags.push('Low calorie');
    if (nutritionalFilters.proteinRich) selectedTags.push('Protein rich');
    if (nutritionalFilters.lowFat) selectedTags.push('Low fat');
    if (nutritionalFilters.nutrientRich) selectedTags.push('Nutrient-rich');

    if (selectedTags.length > 0) {
      const est = geminiData[getCacheKey(food.name)];
      if (!est) return false;
      if (!est.tags.some(tag => selectedTags.includes(tag))) return false;
    }
    return true;
  };

  // Group menu items by their section title (category)
  const groupedCategories: { category: string; items: MenuItem[] }[] = (() => {
    const menuItems = getTodayMenu();
    const groups: { category: string; items: MenuItem[] }[] = [];
    let currentCategory = 'Other';

    for (const item of menuItems) {
      if (item.is_section_title) {
        currentCategory = item.text;
        continue;
      }
      if (!item.food) continue;
      if (!passesAllFilters(item.food)) continue;

      // Skip disliked items here — they go to a separate section
      if (sortRatings[getCacheKey(item.food.name)] === 'dislike') continue;

      let group = groups.find(g => g.category === currentCategory);
      if (!group) {
        group = { category: currentCategory, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }

    // Sort liked items to top within each category
    for (const group of groups) {
      group.items.sort((a, b) => {
        const aLiked = sortRatings[getCacheKey(a.food!.name)] === 'like' ? 0 : 1;
        const bLiked = sortRatings[getCacheKey(b.food!.name)] === 'like' ? 0 : 1;
        return aLiked - bLiked;
      });
    }

    // Collect disliked items into a separate section at the bottom
    const dislikedItems: MenuItem[] = [];
    for (const item of menuItems) {
      if (!item.food || item.is_section_title) continue;
      if (!passesAllFilters(item.food)) continue;
      if (sortRatings[getCacheKey(item.food.name)] === 'dislike') {
        dislikedItems.push(item);
      }
    }
    if (dislikedItems.length > 0) {
      groups.push({ category: 'Disliked Items', items: dislikedItems });
    }

    return groups;
  })();

  const totalFilteredItems = groupedCategories.reduce((sum, g) => sum + g.items.length, 0);

  // Build serving size string from Nutrislice data
  const getServingSize = (food: Food): string => {
    const info = food.serving_size_info;
    if (info?.serving_size_amount && info?.serving_size_unit) {
      return `${info.serving_size_amount} ${info.serving_size_unit}`;
    }
    return '1 serving';
  };

  // Fetch Gemini estimates for ALL food items
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

  // Get Gemini data for a food item
  const getEstimate = (food: Food): FoodEstimate | null => {
    return geminiData[getCacheKey(food.name)] ?? null;
  };

  // Fetch meal recommendations from Gemini
  const fetchRecommendation = async () => {
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
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 relative pt-12 md:pt-0">
          {/* Auth button */}
          <div className="absolute right-0 top-0">
            {session?.user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 md:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cute-bee.svg" alt="Nav Bee Logo" className="w-8 h-8 md:w-12 md:h-12" />
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Nav Meal Planner
            </h1>
          </div>
        </header>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div>
            <label htmlFor="date-select" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Select Date
            </label>
            <input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48 max-w-full md:w-48 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="meal-type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Select Meal
            </label>
            <select
              id="meal-type"
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-48 max-w-full md:w-48 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <button
            onClick={() => setDietaryOpen(!dietaryOpen)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            <span>Dietary Filters</span>
            <svg className={`w-4 h-4 transition-transform ${dietaryOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {dietaryOpen && (
            <div className="flex flex-wrap gap-4">
              {([
                ['vegetarian', 'Vegetarian'],
                ['vegan', 'Vegan'],
                ['eggless', 'Eggless'],
                ['glutenFree', 'Gluten-free'],
                ['noDairy', 'No Dairy'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters[key]}
                    onChange={(e) => {
                      const newFilters = { ...filters, [key]: e.target.checked };
                      setFilters(newFilters);
                      savePreferences(recGoals, newFilters);
                    }}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <button
            onClick={() => setNutritionalOpen(!nutritionalOpen)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            <span>Nutritional Filters</span>
            <svg className={`w-4 h-4 transition-transform ${nutritionalOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {nutritionalOpen && (
            <div>
              {loadingGemini && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Loading nutrition data...</p>
              )}
              <div className="flex flex-wrap gap-4">
                {([
                  ['highCalorie', 'High Calorie'],
                  ['lowCalorie', 'Low Calorie'],
                  ['proteinRich', 'Protein Rich'],
                  ['lowFat', 'Low Fat'],
                  ['nutrientRich', 'Nutrient-rich'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nutritionalFilters[key]}
                      onChange={(e) => {
                        const newNutritional = { ...nutritionalFilters, [key]: e.target.checked };
                        setNutritionalFilters(newNutritional);
                        savePreferences(recGoals, filters, newNutritional);
                      }}
                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Email Opt-In */}
        {session?.user && (
          <div className="mb-6 bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
              Daily Meal Plan Emails
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Would you like to receive daily meal plan recommendations and highlights of your favorite NAV meals?
            </p>
            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="emailOptIn"
                  checked={emailOptInChoice === 'yes'}
                  onChange={() => setEmailOptInChoice('yes')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="emailOptIn"
                  checked={emailOptInChoice === 'no'}
                  onChange={() => setEmailOptInChoice('no')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300">No</span>
              </label>
            </div>
            <button
              onClick={saveEmailPreference}
              disabled={emailSaving || emailOptInChoice === null}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-medium text-sm transition-colors"
            >
              {emailSaving ? 'Saving...' : 'Save'}
            </button>
            {emailStatus && (
              <p className={`mt-3 text-sm ${emailStatus.includes('inbox') ? 'text-green-600 dark:text-green-400' : emailStatus.includes('not') ? 'text-zinc-500 dark:text-zinc-400' : 'text-red-600 dark:text-red-400'}`}>
                {emailStatus}
              </p>
            )}
          </div>
        )}

        {/* Meal Recommender */}
        <div className="mb-6 bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <button
            onClick={() => setShowRecommender(!showRecommender)}
            className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors"
          >
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Meal Recommender</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Get personalized meal suggestions based on your goals</p>
            </div>
            <span className="text-zinc-400 text-xl">{showRecommender ? '−' : '+'}</span>
          </button>

          {showRecommender && (
            <div className="px-6 pb-6 border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Daily Calorie Target
                  </label>
                  <input
                    type="number"
                    value={recGoals.dailyCalories}
                    onChange={(e) => setRecGoals(g => ({ ...g, dailyCalories: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. 2000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Daily Protein Target (g)
                  </label>
                  <input
                    type="number"
                    value={recGoals.dailyProtein}
                    onChange={(e) => setRecGoals(g => ({ ...g, dailyProtein: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. 150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Goal
                  </label>
                  <select
                    value={recGoals.fitnessGoal}
                    onChange={(e) => setRecGoals(g => ({ ...g, fitnessGoal: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">General health</option>
                    <option value="muscle gain">Muscle gain</option>
                    <option value="fat loss">Fat loss</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="bulking">Bulking</option>
                    <option value="cutting">Cutting</option>
                    <option value="endurance training">Endurance training</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Taste
                  </label>
                  <select
                    value={recGoals.taste}
                    onChange={(e) => setRecGoals(g => ({ ...g, taste: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="balanced">Balanced — mix of nutrition and taste</option>
                    <option value="tasty">Tasty — prioritize what I like</option>
                    <option value="strict">Strict — nutrition goals first</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Appetite for this meal
                  </label>
                  <select
                    value={recGoals.appetite}
                    onChange={(e) => setRecGoals(g => ({ ...g, appetite: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="small">Small — light meal</option>
                    <option value="medium">Medium — regular meal</option>
                    <option value="large">Large — hungry</option>
                    <option value="very large">Very large — starving</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Dietary Restrictions / Preferences
                </label>
                <input
                  type="text"
                  value={recGoals.restrictions}
                  onChange={(e) => setRecGoals(g => ({ ...g, restrictions: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. vegetarian, no dairy, halal, gluten-free..."
                />
              </div>
              <button
                onClick={fetchRecommendation}
                disabled={loadingRec || loading || allFoodItems.length === 0}
                className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-medium transition-colors"
              >
                {loadingRec ? 'Generating...' : 'Get Recommendations'}
              </button>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 italic mt-2">
                Feel free to like or dislike any recommended items, then hit &ldquo;Get Recommendations&rdquo; again to regenerate!
              </p>

              {recError && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                  {recError}
                </div>
              )}

              {recommendation && (
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-md font-semibold text-zinc-900 dark:text-white mb-3">Suggested Meal Plan</h3>
                    <div className="space-y-2">
                      {recommendation.mealPlan.map((item, i) => {
                        const rating = getFoodRating(item.name);
                        return (
                          <div key={i} className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleFoodRating(item.name, 'like')}
                                className={`p-1 rounded transition-colors ${rating === 'like' ? 'text-blue-500' : 'text-zinc-300 dark:text-zinc-600 hover:text-blue-400'}`}
                                title="Like"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 1 1 3 0v6a1.5 1.5 0 0 1-3 0v-6ZM6 10.333v5.43a2 2 0 0 0 1.106 1.79l.05.025A4 4 0 0 0 8.943 18h5.416a2 2 0 0 0 1.962-1.608l1.2-6A2 2 0 0 0 15.56 8H12V4a2 2 0 0 0-2-2 1 1 0 0 0-1 1v.667a4 4 0 0 1-.8 2.4L6.8 7.933a4 4 0 0 0-.8 2.4Z" /></svg>
                              </button>
                              <button
                                onClick={() => toggleFoodRating(item.name, 'dislike')}
                                className={`p-1 rounded transition-colors ${rating === 'dislike' ? 'text-red-500' : 'text-zinc-300 dark:text-zinc-600 hover:text-red-400'}`}
                                title="Dislike"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 0 1 3 0v6ZM14 9.667V4.236a2 2 0 0 0-1.106-1.789l-.05-.025A4 4 0 0 0 11.057 2H5.64a2 2 0 0 0-1.962 1.608l-1.2 6A2 2 0 0 0 4.44 12H8v4a2 2 0 0 0 2 2 1 1 0 0 0 1-1v-.667a4 4 0 0 1 .8-2.4l1.4-1.867a4 4 0 0 0 .8-2.4Z" /></svg>
                              </button>
                              <span className="font-medium text-zinc-900 dark:text-white">{item.name}</span>
                              <span className="text-sm text-zinc-500 dark:text-zinc-400">({item.quantity})</span>
                            </div>
                            <div className="flex gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                              <span>{item.calories} cal</span>
                              <span>{item.protein}g P</span>
                              <span>{item.carbs}g C</span>
                              <span>{item.fat}g F</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex justify-end gap-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-green-100 dark:bg-green-900/40 rounded-lg p-3">
                      <span>Total:</span>
                      <span>{recommendation.mealPlanTotals.calories} cal</span>
                      <span>{recommendation.mealPlanTotals.protein}g P</span>
                      <span>{recommendation.mealPlanTotals.carbs}g C</span>
                      <span>{recommendation.mealPlanTotals.fat}g F</span>
                    </div>
                  </div>

                  {recommendation.extras && recommendation.extras.length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold text-zinc-900 dark:text-white mb-1">Good Add-Ons and Alternatives</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">Extra items to complement the plan, or alternatives to swap in</p>
                      <div className="space-y-2">
                        {recommendation.extras.map((item, i) => {
                          const rating = getFoodRating(item.name);
                          return (
                            <div key={i} className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleFoodRating(item.name, 'like')}
                                  className={`p-1 rounded transition-colors ${rating === 'like' ? 'text-blue-500' : 'text-zinc-300 dark:text-zinc-600 hover:text-blue-400'}`}
                                  title="Like"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 1 1 3 0v6a1.5 1.5 0 0 1-3 0v-6ZM6 10.333v5.43a2 2 0 0 0 1.106 1.79l.05.025A4 4 0 0 0 8.943 18h5.416a2 2 0 0 0 1.962-1.608l1.2-6A2 2 0 0 0 15.56 8H12V4a2 2 0 0 0-2-2 1 1 0 0 0-1 1v.667a4 4 0 0 1-.8 2.4L6.8 7.933a4 4 0 0 0-.8 2.4Z" /></svg>
                                </button>
                                <button
                                  onClick={() => toggleFoodRating(item.name, 'dislike')}
                                  className={`p-1 rounded transition-colors ${rating === 'dislike' ? 'text-red-500' : 'text-zinc-300 dark:text-zinc-600 hover:text-red-400'}`}
                                  title="Dislike"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 0 1 3 0v6ZM14 9.667V4.236a2 2 0 0 0-1.106-1.789l-.05-.025A4 4 0 0 0 11.057 2H5.64a2 2 0 0 0-1.962 1.608l-1.2 6A2 2 0 0 0 4.44 12H8v4a2 2 0 0 0 2 2 1 1 0 0 0 1-1v-.667a4 4 0 0 1 .8-2.4l1.4-1.867a4 4 0 0 0 .8-2.4Z" /></svg>
                                </button>
                                <span className="font-medium text-zinc-900 dark:text-white">{item.name}</span>
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">({item.quantity})</span>
                              </div>
                              <div className="flex gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <span>{item.calories} cal</span>
                                <span>{item.protein}g P</span>
                                <span>{item.carbs}g C</span>
                                <span>{item.fat}g F</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-zinc-300 border-t-blue-500"></div>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading menu...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && totalFilteredItems === 0 && (
          <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
            No menu items available for this meal.
          </div>
        )}

        {!loading && !error && totalFilteredItems > 0 && (
          <div className="grid gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                  All Items — Like/Dislike to save your preferences!
                </h3>
                {loadingGemini && (
                  <span className="text-xs text-zinc-500">Loading nutrition data...</span>
                )}
              </div>
              <div className="space-y-5 max-w-2xl md:max-w-none mx-auto">
                {groupedCategories.map((group) => (
                  <div key={group.category}>
                    <h4 className={`text-sm font-semibold uppercase tracking-wide mb-1.5 ${
                      group.category === 'Disliked Items'
                        ? 'text-zinc-400 dark:text-zinc-500'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {group.category}
                    </h4>
                    <div className="grid gap-1.5 md:gap-2">
                      {group.items.map((item) => {
                        const est = getEstimate(item.food!);
                        const rating = getFoodRating(item.food!.name);
                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg p-2 md:p-3 border transition-colors overflow-hidden ${
                              rating === 'dislike'
                                ? 'bg-zinc-100 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-700 opacity-60'
                                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500'
                            }`}
                          >
                            {/* Desktop: single row */}
                            <div className="hidden md:flex justify-between items-center gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFoodRating(item.food!.name, 'like'); }}
                                  className={`p-1 rounded transition-colors shrink-0 ${
                                    rating === 'like'
                                      ? 'text-blue-500'
                                      : 'text-zinc-300 dark:text-zinc-600 hover:text-blue-400'
                                  }`}
                                  title="Like this item"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 10.5a1.5 1.5 0 1 1 3 0v6a1.5 1.5 0 0 1-3 0v-6ZM6 10.333v5.43a2 2 0 0 0 1.106 1.79l.05.025A4 4 0 0 0 8.943 18h5.416a2 2 0 0 0 1.962-1.608l1.2-6A2 2 0 0 0 15.56 8H12V4a2 2 0 0 0-2-2 1 1 0 0 0-1 1v.667a4 4 0 0 1-.8 2.4L6.8 7.933a4 4 0 0 0-.8 2.4Z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFoodRating(item.food!.name, 'dislike'); }}
                                  className={`p-1 rounded transition-colors shrink-0 ${
                                    rating === 'dislike'
                                      ? 'text-red-500'
                                      : 'text-zinc-300 dark:text-zinc-600 hover:text-red-400'
                                  }`}
                                  title="Dislike this item"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M18 9.5a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 0 1 3 0v6ZM14 9.667V4.236a2 2 0 0 0-1.106-1.789l-.05-.025A4 4 0 0 0 11.057 2H5.64a2 2 0 0 0-1.962 1.608l-1.2 6A2 2 0 0 0 4.44 12H8v4a2 2 0 0 0 2 2 1 1 0 0 0 1-1v-.667a4 4 0 0 1 .8-2.4l1.4-1.867a4 4 0 0 0 .8-2.4Z" />
                                  </svg>
                                </button>
                                <span className={`font-medium truncate ${
                                  rating === 'dislike' ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-900 dark:text-white'
                                }`}>
                                  {item.food?.name}
                                </span>
                                <span className="text-xs text-zinc-400 whitespace-nowrap">({getServingSize(item.food!)})</span>
                              </div>
                              {est ? (
                                <div className="flex gap-3 text-sm text-zinc-600 dark:text-zinc-400 shrink-0">
                                  <span>{est.calories} cal</span>
                                  <span>{est.protein}g P</span>
                                  <span>{est.carbs}g C</span>
                                  <span>{est.fat}g F</span>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-400">...</span>
                              )}
                            </div>

                            {/* Mobile: thumbs left, two lines right */}
                            <div className="flex md:hidden gap-2">
                              {/* Thumbs row */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFoodRating(item.food!.name, 'like'); }}
                                  className={`p-1 rounded transition-colors ${
                                    rating === 'like'
                                      ? 'text-blue-500'
                                      : 'text-zinc-300 dark:text-zinc-600 hover:text-blue-400'
                                  }`}
                                  title="Like this item"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 10.5a1.5 1.5 0 1 1 3 0v6a1.5 1.5 0 0 1-3 0v-6ZM6 10.333v5.43a2 2 0 0 0 1.106 1.79l.05.025A4 4 0 0 0 8.943 18h5.416a2 2 0 0 0 1.962-1.608l1.2-6A2 2 0 0 0 15.56 8H12V4a2 2 0 0 0-2-2 1 1 0 0 0-1 1v.667a4 4 0 0 1-.8 2.4L6.8 7.933a4 4 0 0 0-.8 2.4Z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFoodRating(item.food!.name, 'dislike'); }}
                                  className={`p-1 rounded transition-colors ${
                                    rating === 'dislike'
                                      ? 'text-red-500'
                                      : 'text-zinc-300 dark:text-zinc-600 hover:text-red-400'
                                  }`}
                                  title="Dislike this item"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M18 9.5a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 0 1 3 0v6ZM14 9.667V4.236a2 2 0 0 0-1.106-1.789l-.05-.025A4 4 0 0 0 11.057 2H5.64a2 2 0 0 0-1.962 1.608l-1.2 6A2 2 0 0 0 4.44 12H8v4a2 2 0 0 0 2 2 1 1 0 0 0 1-1v-.667a4 4 0 0 1 .8-2.4l1.4-1.867a4 4 0 0 0 .8-2.4Z" />
                                  </svg>
                                </button>
                              </div>
                              {/* Content column: two lines */}
                              <div className="min-w-0 flex-1">
                                {/* Line 1: Name + serving size */}
                                <div className="flex items-baseline gap-1.5 overflow-hidden">
                                  <span className={`text-sm font-medium truncate ${
                                    rating === 'dislike' ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-900 dark:text-white'
                                  }`}>
                                    {item.food?.name}
                                  </span>
                                  <span className="text-xs text-zinc-400 whitespace-nowrap">{getServingSize(item.food!)}</span>
                                </div>
                                {/* Line 2: Nutrition stats */}
                                {est ? (
                                  <div className="flex gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                    <span>{est.calories} cal</span>
                                    <span>{est.protein}g P</span>
                                    <span>{est.carbs}g C</span>
                                    <span>{est.fat}g F</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-zinc-400 mt-0.5 block">...</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-400 mt-3">
                Nutrition estimated by Gemini. Dietary icons from dining hall API.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

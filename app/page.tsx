'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { groupMenuByCategory } from '@/app/utils/menu';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';
import { useMenuData } from '@/app/hooks/useMenuData';
import { usePreferences } from '@/app/hooks/usePreferences';
import { useFoodRatings } from '@/app/hooks/useFoodRatings';
import { useEmailOptIn } from '@/app/hooks/useEmailOptIn';
import { useGeminiNutrition } from '@/app/hooks/useGeminiNutrition';
import { useRecommendation } from '@/app/hooks/useRecommendation';
import { Header } from '@/app/components/Header';
import { MealControls } from '@/app/components/MealControls';
import { FilterSection } from '@/app/components/FilterSection';
import { EmailPreferences } from '@/app/components/EmailPreferences';
import { MealRecommender } from '@/app/components/MealRecommender';
import { MenuDisplay } from '@/app/components/MenuDisplay';
import { Footer } from '@/app/components/Footer';

const DIETARY_OPTIONS = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'eggless', label: 'Eggless' },
  { key: 'glutenFree', label: 'Gluten-free' },
  { key: 'noDairy', label: 'No Dairy' },
] as const;

const NUTRITIONAL_OPTIONS = [
  { key: 'highCalorie', label: 'High Calorie' },
  { key: 'lowCalorie', label: 'Low Calorie' },
  { key: 'proteinRich', label: 'Protein Rich' },
  { key: 'lowFat', label: 'Low Fat' },
  { key: 'nutrientRich', label: 'Nutrient-rich' },
] as const;

export default function Home() {
  const { data: session } = useSession();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Hooks
  const { mealType, setMealType, selectedDate, setSelectedDate, loading, error, todayMenuItems, allFoodItems } = useMenuData();
  const { filters, setFilters, nutritionalFilters, setNutritionalFilters, recGoals, setRecGoals, savePreferences } = usePreferences(session);
  const { sortRatings, toggleFoodRating, getFoodRating } = useFoodRatings(session);
  const { emailOptInChoice, setEmailOptInChoice, emailSaving, emailStatus, saveEmailPreference } = useEmailOptIn(session);
  const { geminiData, loadingGemini, getEstimate } = useGeminiNutrition(allFoodItems);
  const { showRecommender, setShowRecommender, recommendation, loadingRec, recError, fetchRecommendation } = useRecommendation(
    allFoodItems, recGoals, getEstimate, getFoodRating, savePreferences
  );

  // Collapsible panel state
  const [dietaryOpen, setDietaryOpen] = useState(false);
  const [nutritionalOpen, setNutritionalOpen] = useState(false);

  // Open filter dropdowns by default on desktop
  useEffect(() => {
    if (isDesktop) {
      setDietaryOpen(true); // eslint-disable-line react-hooks/set-state-in-effect
      setNutritionalOpen(true);
    }
  }, [isDesktop]);

  // Derived data
  const groupedCategories = groupMenuByCategory(todayMenuItems, filters, nutritionalFilters, geminiData, sortRatings);
  const totalFilteredItems = groupedCategories.reduce((sum, g) => sum + g.items.length, 0);

  // Filter change handlers (save preferences on change)
  const handleDietaryChange = (key: string, checked: boolean) => {
    const newFilters = { ...filters, [key]: checked };
    setFilters(newFilters);
    savePreferences(recGoals, newFilters);
  };

  const handleNutritionalChange = (key: string, checked: boolean) => {
    const newNutritional = { ...nutritionalFilters, [key]: checked };
    setNutritionalFilters(newNutritional);
    savePreferences(recGoals, filters, newNutritional);
  };

  return (
    <div className="min-h-screen bg-sky-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Header session={session} />
        <MealControls
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          mealType={mealType}
          onMealTypeChange={setMealType}
        />
        <FilterSection
          title="Dietary Filters"
          isOpen={dietaryOpen}
          onToggle={() => setDietaryOpen(!dietaryOpen)}
          options={DIETARY_OPTIONS}
          values={filters}
          onChange={handleDietaryChange}
        />
        <FilterSection
          title="Nutritional Filters"
          isOpen={nutritionalOpen}
          onToggle={() => setNutritionalOpen(!nutritionalOpen)}
          options={NUTRITIONAL_OPTIONS}
          values={nutritionalFilters}
          onChange={handleNutritionalChange}
          loadingMessage={loadingGemini ? 'Loading nutrition data...' : undefined}
          className="mb-6"
        />
        {session?.user && (
          <EmailPreferences
            emailOptInChoice={emailOptInChoice}
            onChoiceChange={setEmailOptInChoice}
            onSave={saveEmailPreference}
            saving={emailSaving}
            status={emailStatus}
          />
        )}
        <MealRecommender
          isOpen={showRecommender}
          onToggle={() => setShowRecommender(!showRecommender)}
          recGoals={recGoals}
          onGoalsChange={setRecGoals}
          onFetchRecommendation={fetchRecommendation}
          loadingRec={loadingRec}
          menuLoading={loading}
          menuHasItems={allFoodItems.length > 0}
          recError={recError}
          recommendation={recommendation}
          getFoodRating={getFoodRating}
          onToggleRating={toggleFoodRating}
        />
        <MenuDisplay
          loading={loading}
          error={error}
          groupedCategories={groupedCategories}
          totalFilteredItems={totalFilteredItems}
          loadingGemini={loadingGemini}
          getEstimate={getEstimate}
          getFoodRating={getFoodRating}
          onToggleRating={toggleFoodRating}
        />
        <Footer />
      </div>
    </div>
  );
}

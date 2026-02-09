import type { Recommendation, RecGoals } from '@/app/types/menu';
import { RatingButtons } from './RatingButtons';
import { NutritionStats } from './NutritionStats';

interface MealRecommenderProps {
  isOpen: boolean;
  onToggle: () => void;
  recGoals: RecGoals;
  onGoalsChange: React.Dispatch<React.SetStateAction<RecGoals>>;
  onFetchRecommendation: () => void;
  loadingRec: boolean;
  menuLoading: boolean;
  menuHasItems: boolean;
  recError: string | null;
  recommendation: Recommendation | null;
  getFoodRating: (name: string) => 'like' | 'dislike' | null;
  onToggleRating: (name: string, rating: 'like' | 'dislike') => void;
}

export function MealRecommender({
  isOpen,
  onToggle,
  recGoals,
  onGoalsChange,
  onFetchRecommendation,
  loadingRec,
  menuLoading,
  menuHasItems,
  recError,
  recommendation,
  getFoodRating,
  onToggleRating,
}: MealRecommenderProps) {
  return (
    <div className="mb-6 bg-white rounded-lg shadow-md border border-zinc-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-zinc-50 transition-colors"
      >
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Meal Recommender</h2>
          <p className="text-sm text-zinc-500">Get personalized meal suggestions based on your goals</p>
        </div>
        <span className="text-zinc-400 text-xl">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-zinc-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Daily Calorie Target
              </label>
              <input
                type="number"
                value={recGoals.dailyCalories}
                onChange={(e) => onGoalsChange(g => ({ ...g, dailyCalories: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. 2000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Daily Protein Target (g)
              </label>
              <input
                type="number"
                value={recGoals.dailyProtein}
                onChange={(e) => onGoalsChange(g => ({ ...g, dailyProtein: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. 150"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Goal
              </label>
              <select
                value={recGoals.fitnessGoal}
                onChange={(e) => onGoalsChange(g => ({ ...g, fitnessGoal: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Taste
              </label>
              <select
                value={recGoals.taste}
                onChange={(e) => onGoalsChange(g => ({ ...g, taste: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="balanced">Balanced — mix of nutrition and taste</option>
                <option value="tasty">Tasty — prioritize what I like</option>
                <option value="strict">Strict — nutrition goals first</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Appetite for this meal
              </label>
              <select
                value={recGoals.appetite}
                onChange={(e) => onGoalsChange(g => ({ ...g, appetite: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="small">Small — light meal</option>
                <option value="medium">Medium — regular meal</option>
                <option value="large">Large — hungry</option>
                <option value="very large">Very large — starving</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Dietary Restrictions / Preferences
            </label>
            <input
              type="text"
              value={recGoals.restrictions}
              onChange={(e) => onGoalsChange(g => ({ ...g, restrictions: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. vegetarian, no dairy, halal, gluten-free..."
            />
          </div>
          <button
            onClick={onFetchRecommendation}
            disabled={loadingRec || menuLoading || !menuHasItems}
            className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-medium transition-colors"
          >
            {loadingRec ? 'Generating...' : 'Get Recommendations'}
          </button>
          <p className="text-sm text-zinc-500 italic mt-2">
            Feel free to like or dislike any recommended items, then hit &ldquo;Get Recommendations&rdquo; again to regenerate!
          </p>

          {recError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {recError}
            </div>
          )}

          {recommendation && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-md font-semibold text-zinc-900 mb-3">Suggested Meal Plan</h3>
                <div className="space-y-2">
                  {recommendation.mealPlan.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <RatingButtons foodName={item.name} rating={getFoodRating(item.name)} onToggle={onToggleRating} />
                        <span className="font-medium text-zinc-900">{item.name}</span>
                        <span className="text-sm text-zinc-500">({item.quantity})</span>
                      </div>
                      <NutritionStats calories={item.calories} protein={item.protein} carbs={item.carbs} fat={item.fat} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end gap-4 text-sm font-semibold text-zinc-700 bg-green-100 rounded-lg p-3">
                  <span>Total:</span>
                  <NutritionStats
                    calories={recommendation.mealPlanTotals.calories}
                    protein={recommendation.mealPlanTotals.protein}
                    carbs={recommendation.mealPlanTotals.carbs}
                    fat={recommendation.mealPlanTotals.fat}
                    className="flex gap-4 text-sm font-semibold text-zinc-700"
                  />
                </div>
              </div>

              {recommendation.extras && recommendation.extras.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-zinc-900 mb-1">Good Add-Ons and Alternatives</h3>
                  <p className="text-sm text-zinc-500 mb-3">Extra items to complement the plan, or alternatives to swap in</p>
                  <div className="space-y-2">
                    {recommendation.extras.map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <RatingButtons foodName={item.name} rating={getFoodRating(item.name)} onToggle={onToggleRating} />
                          <span className="font-medium text-zinc-900">{item.name}</span>
                          <span className="text-sm text-zinc-500">({item.quantity})</span>
                        </div>
                        <NutritionStats calories={item.calories} protein={item.protein} carbs={item.carbs} fat={item.fat} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

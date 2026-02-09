import type { MenuItem, Food, FoodEstimate } from '@/app/types/menu';
import { getServingSize } from '@/app/utils/menu';
import { FoodItemCard } from './FoodItemCard';

interface MenuDisplayProps {
  loading: boolean;
  error: string | null;
  groupedCategories: { category: string; items: MenuItem[] }[];
  totalFilteredItems: number;
  loadingGemini: boolean;
  getEstimate: (food: Food) => FoodEstimate | null;
  getFoodRating: (foodName: string) => 'like' | 'dislike' | null;
  onToggleRating: (foodName: string, rating: 'like' | 'dislike') => void;
}

export function MenuDisplay({
  loading,
  error,
  groupedCategories,
  totalFilteredItems,
  loadingGemini,
  getEstimate,
  getFoodRating,
  onToggleRating,
}: MenuDisplayProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-zinc-300 border-t-blue-500"></div>
        <p className="mt-4 text-zinc-600">Loading menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (totalFilteredItems === 0) {
    return (
      <div className="text-center py-12 text-zinc-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-zinc-900">
              All Items
            </h3>
            {loadingGemini && (
              <span className="text-xs text-zinc-500">Loading nutrition data...</span>
            )}
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">Login and like/dislike to save preferences!</p>
          <p className="text-xs text-amber-600 mt-2">Note: All nutritional data is approximated by Gemini and should be taken with a pinch of salt.</p>
        </div>
        <div className="space-y-5 max-w-2xl md:max-w-none mx-auto">
          {groupedCategories.map((group) => (
            <div key={group.category}>
              <h4 className={`text-sm font-semibold uppercase tracking-wide mb-1.5 ${
                group.category === 'Disliked Items'
                  ? 'text-zinc-400'
                  : 'text-blue-600'
              }`}>
                {group.category}
              </h4>
              <div className="grid gap-1.5 md:gap-2">
                {group.items.map((item) => (
                  <FoodItemCard
                    key={item.id}
                    item={item}
                    rating={getFoodRating(item.food!.name)}
                    estimate={getEstimate(item.food!)}
                    servingSize={getServingSize(item.food!)}
                    onToggleRating={onToggleRating}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

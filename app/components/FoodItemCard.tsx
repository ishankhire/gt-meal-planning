import type { MenuItem, FoodEstimate } from '@/app/types/menu';
import { RatingButtons } from './RatingButtons';
import { NutritionStats } from './NutritionStats';

interface FoodItemCardProps {
  item: MenuItem;
  rating: 'like' | 'dislike' | null;
  estimate: FoodEstimate | null;
  servingSize: string;
  onToggleRating: (foodName: string, rating: 'like' | 'dislike') => void;
}

export function FoodItemCard({ item, rating, estimate, servingSize, onToggleRating }: FoodItemCardProps) {
  return (
    <div
      className={`rounded-lg p-2 md:p-3 border transition-colors overflow-hidden ${
        rating === 'dislike'
          ? 'bg-zinc-100 border-zinc-200 opacity-60'
          : 'bg-white border-zinc-200 hover:border-blue-500'
      }`}
    >
      {/* Desktop: single row */}
      <div className="hidden md:flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <RatingButtons foodName={item.food!.name} rating={rating} onToggle={onToggleRating} stopPropagation />
          <span className={`font-medium truncate ${
            rating === 'dislike' ? 'text-zinc-500' : 'text-zinc-900'
          }`}>
            {item.food?.name}
          </span>
          <span className="text-xs text-zinc-400 whitespace-nowrap">({servingSize})</span>
        </div>
        {estimate ? (
          <NutritionStats calories={estimate.calories} protein={estimate.protein} carbs={estimate.carbs} fat={estimate.fat} className="flex gap-3 text-sm text-zinc-600 shrink-0" />
        ) : (
          <span className="text-xs text-zinc-400">...</span>
        )}
      </div>

      {/* Mobile: thumbs left, two lines right */}
      <div className="flex md:hidden gap-2">
        <div className="flex items-center gap-0.5 shrink-0">
          <RatingButtons foodName={item.food!.name} rating={rating} onToggle={onToggleRating} stopPropagation />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 overflow-hidden">
            <span className={`text-sm font-medium truncate ${
              rating === 'dislike' ? 'text-zinc-500' : 'text-zinc-900'
            }`}>
              {item.food?.name}
            </span>
            <span className="text-xs text-zinc-400 whitespace-nowrap">{servingSize}</span>
          </div>
          {estimate ? (
            <NutritionStats calories={estimate.calories} protein={estimate.protein} carbs={estimate.carbs} fat={estimate.fat} className="flex gap-2 mt-0.5 text-xs text-zinc-500" />
          ) : (
            <span className="text-xs text-zinc-400 mt-0.5 block">...</span>
          )}
        </div>
      </div>
    </div>
  );
}

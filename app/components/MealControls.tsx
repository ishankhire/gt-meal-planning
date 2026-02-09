import type { MealType } from '@/app/types/menu';

interface MealControlsProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  mealType: MealType;
  onMealTypeChange: (meal: MealType) => void;
}

export function MealControls({ selectedDate, onDateChange, mealType, onMealTypeChange }: MealControlsProps) {
  return (
    <div className="mb-6 flex flex-col md:flex-row gap-4">
      <div>
        <label htmlFor="date-select" className="block text-sm font-medium text-zinc-700 mb-2">
          Select Date
        </label>
        <input
          id="date-select"
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-48 max-w-full md:w-48 px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label htmlFor="meal-type" className="block text-sm font-medium text-zinc-700 mb-2">
          Select Meal
        </label>
        <select
          id="meal-type"
          value={mealType}
          onChange={(e) => onMealTypeChange(e.target.value as MealType)}
          className="w-48 max-w-full md:w-48 px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
        </select>
      </div>
    </div>
  );
}

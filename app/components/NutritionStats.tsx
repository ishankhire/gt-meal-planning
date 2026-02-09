interface NutritionStatsProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  className?: string;
}

export function NutritionStats({ calories, protein, carbs, fat, className = 'text-sm text-zinc-600' }: NutritionStatsProps) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <span>{calories} cal</span>
      <span>{protein}g P</span>
      <span>{carbs}g C</span>
      <span>{fat}g F</span>
    </div>
  );
}

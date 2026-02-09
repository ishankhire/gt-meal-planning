export interface FoodIcon {
  id: number;
  synced_name: string;
  enabled: boolean;
}

export interface Food {
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

export interface MenuItem {
  id: number;
  food: Food | null;
  is_section_title: boolean;
  text: string;
}

export interface DayMenu {
  date: string;
  menu_items: MenuItem[];
}

export interface MenuData {
  days: DayMenu[];
}

export interface FoodEstimate {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
}

export interface RecommendedItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recommendation {
  mealPlan: RecommendedItem[];
  mealPlanTotals: { calories: number; protein: number; carbs: number; fat: number };
  mealPlanReasoning: string;
  extras: RecommendedItem[];
}

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface DietaryFilters {
  [key: string]: boolean;
  vegetarian: boolean;
  vegan: boolean;
  eggless: boolean;
  glutenFree: boolean;
  noDairy: boolean;
}

export interface NutritionalFilters {
  [key: string]: boolean;
  highCalorie: boolean;
  lowCalorie: boolean;
  proteinRich: boolean;
  lowFat: boolean;
  nutrientRich: boolean;
}

export interface RecGoals {
  dailyCalories: number;
  dailyProtein: number;
  fitnessGoal: string;
  appetite: string;
  taste: string;
  restrictions: string;
}

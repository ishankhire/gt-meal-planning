import type { Food, MenuItem, FoodEstimate, DietaryFilters, NutritionalFilters } from '@/app/types/menu';

export function getCacheKey(name: string): string {
  return name.toLowerCase().trim();
}

export function hasIcon(food: Food, iconName: string): boolean {
  return food.icons?.food_icons?.some(icon => icon.synced_name === iconName) ?? false;
}

export function getServingSize(food: Food): string {
  const info = food.serving_size_info;
  if (info?.serving_size_amount && info?.serving_size_unit) {
    return `${info.serving_size_amount} ${info.serving_size_unit}`;
  }
  return '1 serving';
}

export function passesAllFilters(
  food: Food,
  filters: DietaryFilters,
  nutritionalFilters: NutritionalFilters,
  geminiData: Record<string, FoodEstimate>
): boolean {
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
}

export function groupMenuByCategory(
  menuItems: MenuItem[],
  filters: DietaryFilters,
  nutritionalFilters: NutritionalFilters,
  geminiData: Record<string, FoodEstimate>,
  sortRatings: Record<string, 'like' | 'dislike'>
): { category: string; items: MenuItem[] }[] {
  const groups: { category: string; items: MenuItem[] }[] = [];
  let currentCategory = 'Other';

  for (const item of menuItems) {
    if (item.is_section_title) {
      currentCategory = item.text;
      continue;
    }
    if (!item.food) continue;
    if (!passesAllFilters(item.food, filters, nutritionalFilters, geminiData)) continue;

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
    if (!passesAllFilters(item.food, filters, nutritionalFilters, geminiData)) continue;
    if (sortRatings[getCacheKey(item.food.name)] === 'dislike') {
      dislikedItems.push(item);
    }
  }
  if (dislikedItems.length > 0) {
    groups.push({ category: 'Disliked Items', items: dislikedItems });
  }

  return groups;
}

import { useState, useEffect } from 'react';
import type { MealType, MenuData, MenuItem } from '@/app/types/menu';

export function useMenuData() {
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

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

  const todayMenuItems: MenuItem[] = (() => {
    if (!menuData?.days) return [];
    const today = menuData.days.find(day => day.date === selectedDate);
    return today?.menu_items || [];
  })();

  const allFoodItems = todayMenuItems.filter(item => item.food && !item.is_section_title);

  return {
    mealType,
    setMealType,
    selectedDate,
    setSelectedDate,
    menuData,
    loading,
    error,
    todayMenuItems,
    allFoodItems,
  };
}

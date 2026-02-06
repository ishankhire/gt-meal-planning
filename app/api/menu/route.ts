import { NextRequest, NextResponse } from 'next/server';

// Hardcoded items that are always available at the dining hall
// These items don't always show up in the API but are always present

interface HardcodedItem {
  name: string;
  servingSize: string;
  servingUnit: string;
  dietaryIcons: string[];
}

// Items available at ALL meals (breakfast, lunch, dinner)
const ALWAYS_AVAILABLE_ITEMS: HardcodedItem[] = [
  { name: 'Chocolate Milk', servingSize: '8', servingUnit: 'fl oz', dietaryIcons: ['Vegan', 'Vegetarian'] },
  { name: 'Hot Chocolate', servingSize: '8', servingUnit: 'fl oz', dietaryIcons: ['Vegetarian'] },
  { name: 'Tofu (Raw)', servingSize: '1', servingUnit: 'cup', dietaryIcons: ['Vegan', 'Vegetarian'] },
  { name: 'Garbanzo Beans', servingSize: '1', servingUnit: 'cup', dietaryIcons: ['Vegan', 'Vegetarian'] },
  { name: 'Cherry Tomatoes', servingSize: '0.5', servingUnit: 'cup', dietaryIcons: ['Vegan', 'Vegetarian'] },
  { name: 'Shredded Cheese', servingSize: '1', servingUnit: 'tbsp', dietaryIcons: ['Vegetarian'] },
  { name: 'Olives', servingSize: '1', servingUnit: 'tbsp', dietaryIcons: ['Vegan', 'Vegetarian'] },
];

// Items available ONLY at breakfast
const BREAKFAST_ONLY_ITEMS: HardcodedItem[] = [
  { name: 'Honeydew Melon', servingSize: '1', servingUnit: 'cup', dietaryIcons: ['Vegan', 'Vegetarian'] },
  { name: 'Cantaloupe (Musk Melon)', servingSize: '1', servingUnit: 'cup', dietaryIcons: ['Vegan', 'Vegetarian'] },
  { name: 'Granola', servingSize: '1', servingUnit: 'cup', dietaryIcons: ['Vegan', 'Vegetarian'] },
];

// Generate a unique negative ID to avoid conflicts with API items
let hardcodedIdCounter = -1;

function createMenuItem(item: HardcodedItem) {
  const id = hardcodedIdCounter--;
  return {
    id,
    food: {
      id,
      name: item.name,
      description: null,
      rounded_nutrition_info: null,
      serving_size_info: {
        serving_size_amount: item.servingSize,
        serving_size_unit: item.servingUnit,
      },
      icons: {
        food_icons: item.dietaryIcons.map((iconName, i) => ({
          id: id * 100 - i,
          synced_name: iconName,
          enabled: true,
        })),
      },
      ingredients: null,
    },
    is_section_title: false,
    text: item.name,
  };
}

function getHardcodedMenuItems(mealType: string) {
  // Reset counter for each request to keep IDs consistent
  hardcodedIdCounter = -1;

  const items = [...ALWAYS_AVAILABLE_ITEMS];

  // Add breakfast-only items if it's breakfast
  if (mealType === 'breakfast') {
    items.push(...BREAKFAST_ONLY_ITEMS);
  }

  return items.map(createMenuItem);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mealType = searchParams.get('mealType') || 'lunch';
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [year, month, day] = date.split('-');

  const url = `https://techdining.api.nutrislice.com/menu/api/weeks/school/north-ave-dining-hall/menu-type/${mealType}/${year}/${parseInt(month)}/${parseInt(day)}/`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch menu data' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Inject hardcoded items into each day's menu
    const hardcodedItems = getHardcodedMenuItems(mealType);

    if (data.days && Array.isArray(data.days)) {
      for (const day of data.days) {
        if (day.menu_items && Array.isArray(day.menu_items)) {
          // Add a section title for the always-available items
          const sectionTitle = {
            id: -999,
            food: null,
            is_section_title: true,
            text: 'Always Available',
          };
          day.menu_items.push(sectionTitle, ...hardcodedItems);
        }
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

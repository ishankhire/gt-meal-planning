import prisma from "./prisma";
import type { User, UserPreferences, FoodRating, EmailSubscription, NutritionCache } from "@prisma/client";

// =============================================================================
// USER OPERATIONS
// =============================================================================

export async function findOrCreateUser(email: string, name?: string | null, image?: string | null): Promise<User> {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    // Update name/image if they changed
    if (name !== existingUser.name || image !== existingUser.image) {
      return prisma.user.update({
        where: { email },
        data: { name, image },
      });
    }
    return existingUser;
  }

  return prisma.user.create({
    data: { email, name, image },
  });
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function getUserWithRelations(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      preferences: true,
      foodRatings: true,
      emailSubscription: true,
    },
  });
}

// =============================================================================
// USER PREFERENCES OPERATIONS
// =============================================================================

export interface UserPreferencesInput {
  dailyCalories?: number;
  dailyProtein?: number;
  fitnessGoal?: string;
  appetite?: string;
  restrictions?: string | null;
  vegetarian?: boolean;
  vegan?: boolean;
  eggless?: boolean;
  glutenFree?: boolean;
  noDairy?: boolean;
  highCalorie?: boolean;
  lowCalorie?: boolean;
  proteinRich?: boolean;
  lowFat?: boolean;
  nutrientRich?: boolean;
}

export async function getUserPreferences(email: string): Promise<UserPreferences | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { preferences: true },
  });
  return user?.preferences ?? null;
}

export async function upsertUserPreferences(email: string, preferences: UserPreferencesInput): Promise<UserPreferences> {
  // Ensure user exists first
  const user = await findOrCreateUser(email);

  return prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: preferences,
    create: {
      userId: user.id,
      ...preferences,
    },
  });
}

// Convert to the JSON format used by API routes
export function preferencesToJson(prefs: UserPreferences | null) {
  if (!prefs) return null;

  return {
    dailyCalories: prefs.dailyCalories,
    dailyProtein: prefs.dailyProtein,
    fitnessGoal: prefs.fitnessGoal,
    appetite: prefs.appetite,
    restrictions: prefs.restrictions ?? "",
    filters: {
      vegetarian: prefs.vegetarian,
      vegan: prefs.vegan,
      eggless: prefs.eggless,
      glutenFree: prefs.glutenFree,
      noDairy: prefs.noDairy,
    },
    nutritionalFilters: {
      highCalorie: prefs.highCalorie,
      lowCalorie: prefs.lowCalorie,
      proteinRich: prefs.proteinRich,
      lowFat: prefs.lowFat,
      nutrientRich: prefs.nutrientRich,
    },
  };
}

// =============================================================================
// FOOD RATINGS OPERATIONS
// =============================================================================

export type RatingType = "like" | "dislike";

export async function getFoodRatings(email: string): Promise<Record<string, RatingType>> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { foodRatings: true },
  });

  if (!user) return {};

  const ratings: Record<string, RatingType> = {};
  for (const rating of user.foodRatings) {
    ratings[rating.foodName] = rating.rating as RatingType;
  }
  return ratings;
}

export async function setFoodRating(email: string, foodName: string, rating: RatingType | null): Promise<void> {
  const user = await findOrCreateUser(email);
  const normalizedFoodName = foodName.toLowerCase();

  if (rating === null) {
    // Remove rating
    await prisma.foodRating.deleteMany({
      where: { userId: user.id, foodName: normalizedFoodName },
    });
  } else {
    // Upsert rating
    await prisma.foodRating.upsert({
      where: {
        userId_foodName: { userId: user.id, foodName: normalizedFoodName },
      },
      update: { rating },
      create: {
        userId: user.id,
        foodName: normalizedFoodName,
        rating,
      },
    });
  }
}

export async function getLikedFoods(email: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      foodRatings: {
        where: { rating: "like" },
      },
    },
  });

  return user?.foodRatings.map((r) => r.foodName) ?? [];
}

export async function getDislikedFoods(email: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      foodRatings: {
        where: { rating: "dislike" },
      },
    },
  });

  return user?.foodRatings.map((r) => r.foodName) ?? [];
}

// =============================================================================
// EMAIL SUBSCRIPTION OPERATIONS
// =============================================================================

export async function getEmailSubscription(email: string): Promise<EmailSubscription | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { emailSubscription: true },
  });
  return user?.emailSubscription ?? null;
}

export async function isUserSubscribed(email: string): Promise<boolean> {
  const subscription = await getEmailSubscription(email);
  return subscription?.optedIn ?? false;
}

export async function setEmailSubscription(email: string, optedIn: boolean): Promise<EmailSubscription> {
  const user = await findOrCreateUser(email);

  return prisma.emailSubscription.upsert({
    where: { userId: user.id },
    update: { optedIn },
    create: {
      userId: user.id,
      optedIn,
    },
  });
}

// =============================================================================
// NUTRITION CACHE OPERATIONS
// =============================================================================

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
}

export async function getNutritionFromCache(foodName: string): Promise<NutritionData | null> {
  const normalizedName = foodName.toLowerCase();
  const cached = await prisma.nutritionCache.findUnique({
    where: { foodName: normalizedName },
  });

  if (!cached) return null;

  return {
    calories: cached.calories,
    protein: cached.protein,
    carbs: cached.carbs,
    fat: cached.fat,
    tags: cached.tags,
  };
}

export async function getNutritionBatch(foodNames: string[]): Promise<Map<string, NutritionData>> {
  const normalizedNames = foodNames.map((n) => n.toLowerCase());

  const cached = await prisma.nutritionCache.findMany({
    where: { foodName: { in: normalizedNames } },
  });

  const result = new Map<string, NutritionData>();
  for (const item of cached) {
    result.set(item.foodName, {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      tags: item.tags,
    });
  }
  return result;
}

export async function setNutritionCache(foodName: string, nutrition: NutritionData): Promise<NutritionCache> {
  const normalizedName = foodName.toLowerCase();

  return prisma.nutritionCache.upsert({
    where: { foodName: normalizedName },
    update: {
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      tags: nutrition.tags,
    },
    create: {
      foodName: normalizedName,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      tags: nutrition.tags,
    },
  });
}

export async function setNutritionCacheBatch(items: Array<{ foodName: string; nutrition: NutritionData }>): Promise<void> {
  await prisma.$transaction(
    items.map(({ foodName, nutrition }) =>
      prisma.nutritionCache.upsert({
        where: { foodName: foodName.toLowerCase() },
        update: {
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          tags: nutrition.tags,
        },
        create: {
          foodName: foodName.toLowerCase(),
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          tags: nutrition.tags,
        },
      })
    )
  );
}

// Get all cached nutrition data (for migration or backup)
export async function getAllNutritionCache(): Promise<Record<string, NutritionData>> {
  const all = await prisma.nutritionCache.findMany();

  const result: Record<string, NutritionData> = {};
  for (const item of all) {
    result[item.foodName] = {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      tags: item.tags,
    };
  }
  return result;
}

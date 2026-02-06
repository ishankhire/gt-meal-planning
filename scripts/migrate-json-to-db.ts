/**
 * Migration script to move data from JSON files to the PostgreSQL database.
 *
 * Run with: npx tsx scripts/migrate-json-to-db.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// Create Prisma client for migration
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// File paths
const basePath = path.join(__dirname, "..");
const userPreferencesPath = path.join(basePath, "user-preferences.json");
const foodRatingsPath = path.join(basePath, "user-food-ratings.json");
const emailSubscribersPath = path.join(basePath, "email-subscribers.json");
const nutritionCachePath = path.join(basePath, "nutrition-cache.json");

interface JsonUserPreferences {
  dailyCalories: number;
  dailyProtein: number;
  fitnessGoal: string;
  appetite: string;
  restrictions: string;
  filters: {
    vegetarian: boolean;
    vegan: boolean;
    eggless: boolean;
  };
}

interface JsonEmailSubscriber {
  email: string;
  name: string;
  optedIn: boolean;
}

interface JsonNutritionData {
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

async function migrateUserPreferences() {
  console.log("Migrating user preferences...");

  if (!fs.existsSync(userPreferencesPath)) {
    console.log("  No user-preferences.json found, skipping.");
    return;
  }

  const data: Record<string, JsonUserPreferences> = JSON.parse(
    fs.readFileSync(userPreferencesPath, "utf-8")
  );

  for (const [email, prefs] of Object.entries(data)) {
    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email } });
      console.log(`  Created user: ${email}`);
    }

    // Upsert preferences
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {
        dailyCalories: prefs.dailyCalories,
        dailyProtein: prefs.dailyProtein,
        fitnessGoal: prefs.fitnessGoal,
        appetite: prefs.appetite,
        restrictions: prefs.restrictions,
        vegetarian: prefs.filters.vegetarian,
        vegan: prefs.filters.vegan,
        eggless: prefs.filters.eggless,
      },
      create: {
        userId: user.id,
        dailyCalories: prefs.dailyCalories,
        dailyProtein: prefs.dailyProtein,
        fitnessGoal: prefs.fitnessGoal,
        appetite: prefs.appetite,
        restrictions: prefs.restrictions,
        vegetarian: prefs.filters.vegetarian,
        vegan: prefs.filters.vegan,
        eggless: prefs.filters.eggless,
      },
    });
    console.log(`  Migrated preferences for: ${email}`);
  }
}

async function migrateFoodRatings() {
  console.log("Migrating food ratings...");

  if (!fs.existsSync(foodRatingsPath)) {
    console.log("  No user-food-ratings.json found, skipping.");
    return;
  }

  const data: Record<string, Record<string, string>> = JSON.parse(
    fs.readFileSync(foodRatingsPath, "utf-8")
  );

  for (const [email, ratings] of Object.entries(data)) {
    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email } });
      console.log(`  Created user: ${email}`);
    }

    // Batch upsert ratings
    for (const [foodName, rating] of Object.entries(ratings)) {
      await prisma.foodRating.upsert({
        where: {
          userId_foodName: { userId: user.id, foodName: foodName.toLowerCase() },
        },
        update: { rating },
        create: {
          userId: user.id,
          foodName: foodName.toLowerCase(),
          rating,
        },
      });
    }
    console.log(`  Migrated ${Object.keys(ratings).length} ratings for: ${email}`);
  }
}

async function migrateEmailSubscriptions() {
  console.log("Migrating email subscriptions...");

  if (!fs.existsSync(emailSubscribersPath)) {
    console.log("  No email-subscribers.json found, skipping.");
    return;
  }

  const data: Record<string, JsonEmailSubscriber> = JSON.parse(
    fs.readFileSync(emailSubscribersPath, "utf-8")
  );

  for (const [email, subscriber] of Object.entries(data)) {
    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name: subscriber.name },
      });
      console.log(`  Created user: ${email}`);
    }

    // Upsert subscription
    await prisma.emailSubscription.upsert({
      where: { userId: user.id },
      update: { optedIn: subscriber.optedIn },
      create: {
        userId: user.id,
        optedIn: subscriber.optedIn,
      },
    });
    console.log(`  Migrated subscription for: ${email} (optedIn: ${subscriber.optedIn})`);
  }
}

async function migrateNutritionCache() {
  console.log("Migrating nutrition cache...");

  if (!fs.existsSync(nutritionCachePath)) {
    console.log("  No nutrition-cache.json found, skipping.");
    return;
  }

  const data: Record<string, JsonNutritionData> = JSON.parse(
    fs.readFileSync(nutritionCachePath, "utf-8")
  );

  const entries = Object.entries(data);
  console.log(`  Found ${entries.length} nutrition entries to migrate...`);

  // Process one at a time to avoid transaction timeouts
  let count = 0;
  for (const [foodName, nutrition] of entries) {
    await prisma.nutritionCache.upsert({
      where: { foodName: foodName.toLowerCase() },
      update: {
        servingSize: nutrition.servingSize,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
      },
      create: {
        foodName: foodName.toLowerCase(),
        servingSize: nutrition.servingSize,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
      },
    });

    count++;
    if (count % 50 === 0) {
      console.log(`  Migrated ${count}/${entries.length} entries...`);
    }
  }
  console.log(`  Migrated ${count}/${entries.length} entries... done!`);
}

async function main() {
  console.log("Starting migration from JSON files to PostgreSQL...\n");

  try {
    await migrateUserPreferences();
    console.log();

    await migrateFoodRatings();
    console.log();

    await migrateEmailSubscriptions();
    console.log();

    await migrateNutritionCache();
    console.log();

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

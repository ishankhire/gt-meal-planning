import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Resend } from 'resend';
import {
  getUserPreferences,
  getLikedFoods,
  isUserSubscribed,
  setEmailSubscription,
  findOrCreateUser,
} from '@/app/lib/db';

// ---------- types ----------

interface MealPlanItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealRecommendation {
  mealPlan: MealPlanItem[];
  mealPlanTotals: { calories: number; protein: number; carbs: number; fat: number };
  extras: MealPlanItem[];
}

interface DayRecommendation {
  breakfast: MealRecommendation;
  lunch: MealRecommendation;
  dinner: MealRecommendation;
  dayTotals: { calories: number; protein: number; carbs: number; fat: number };
}

// ---------- internal API helpers (reuse existing routes) ----------

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

/** Fetch a meal's menu via /api/menu, then get nutrition via /api/gemini. Returns enriched items. */
async function getMenuWithNutrition(mealType: string, date: string) {
  const base = getBaseUrl();

  // 1. Fetch menu from /api/menu (includes hardcoded items)
  const menuRes = await fetch(`${base}/api/menu?mealType=${mealType}&date=${date}`);
  if (!menuRes.ok) return [];
  const menuData = await menuRes.json();
  const dayData = menuData.days?.find((d: { date: string }) => d.date === date);
  if (!dayData) return [];

  const foodItems = (dayData.menu_items || [])
    .filter((item: { food: unknown; is_section_title: boolean }) => item.food && !item.is_section_title)
    .map((item: { food: { name: string; serving_size_info?: { serving_size_amount?: string; serving_size_unit?: string }; ingredients?: string | null } }) => {
      const f = item.food;
      const ss = f.serving_size_info;
      return {
        name: f.name,
        servingSize: ss?.serving_size_amount && ss?.serving_size_unit
          ? `${ss.serving_size_amount} ${ss.serving_size_unit}` : '1 serving',
        ingredients: f.ingredients || null,
      };
    });

  if (foodItems.length === 0) return [];

  // 2. Get nutrition from /api/gemini (uses server-side cache automatically)
  const geminiRes = await fetch(`${base}/api/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: foodItems }),
  });
  const nutrition = geminiRes.ok ? (await geminiRes.json()).results || {} : {};

  // 3. Return items with nutrition attached
  return foodItems.map((item: { name: string; servingSize: string }) => {
    const est = nutrition[item.name.toLowerCase().trim()];
    return {
      name: item.name,
      calories: est?.calories ?? 0,
      protein: est?.protein ?? 0,
      carbs: est?.carbs ?? 0,
      fat: est?.fat ?? 0,
      servingSize: est?.servingSize ?? item.servingSize,
    };
  });
}

/** Get a full-day recommendation via /api/recommend-day (single Gemini call for variety) */
async function getDayRecommendation(
  breakfastItems: { name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string }[],
  lunchItems: { name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string }[],
  dinnerItems: { name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string }[],
  goals: { dailyCalories: number; dailyProtein: number; fitnessGoal: string; appetite: string; restrictions: string },
  likedItems: string[],
): Promise<DayRecommendation | null> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/recommend-day`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ breakfastItems, lunchItems, dinnerItems, goals, likedItems }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.recommendation || null;
}

// ---------- email HTML builder ----------

function buildMealSection(label: string, rec: MealRecommendation): string {
  const rows = rec.mealPlan
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e4e4e7;">${item.name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e4e4e7;">${item.quantity}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e4e4e7;text-align:right;">${item.calories}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e4e4e7;text-align:right;">${item.protein}g</td>
        </tr>`,
    )
    .join('');

  const t = rec.mealPlanTotals;

  let extrasHtml = '';
  if (rec.extras && rec.extras.length > 0) {
    const extrasRows = rec.extras
      .map(
        (item) =>
          `<tr>
            <td style="padding:4px 12px;border-bottom:1px solid #e4e4e7;color:#3b82f6;">${item.name}</td>
            <td style="padding:4px 12px;border-bottom:1px solid #e4e4e7;">${item.quantity}</td>
            <td style="padding:4px 12px;border-bottom:1px solid #e4e4e7;text-align:right;">${item.calories} cal</td>
            <td style="padding:4px 12px;border-bottom:1px solid #e4e4e7;text-align:right;">${item.protein}g P</td>
          </tr>`,
      )
      .join('');
    extrasHtml = `
      <p style="margin:12px 0 4px;font-size:13px;font-weight:600;color:#71717a;">Good Add-Ons &amp; Alternatives</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tbody>${extrasRows}</tbody>
      </table>`;
  }

  return `
    <h2 style="color:#b59410;margin:24px 0 8px;font-size:20px;">🍽️ ${label}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f4f4f5;">
          <th style="padding:8px 12px;text-align:left;">Item</th>
          <th style="padding:8px 12px;text-align:left;">Qty</th>
          <th style="padding:8px 12px;text-align:right;">Cal</th>
          <th style="padding:8px 12px;text-align:right;">Protein</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="font-weight:bold;background:#f4f4f5;">
          <td style="padding:8px 12px;" colspan="2">Total</td>
          <td style="padding:8px 12px;text-align:right;">${t.calories} cal</td>
          <td style="padding:8px 12px;text-align:right;">${t.protein}g</td>
        </tr>
      </tfoot>
    </table>${extrasHtml}
  `;
}

function buildEmailHtml(
  name: string,
  date: string,
  dayRec: DayRecommendation | null,
): string {
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let meals = '';
  if (dayRec) {
    if (dayRec.breakfast) meals += buildMealSection('Breakfast', dayRec.breakfast);
    if (dayRec.lunch) meals += buildMealSection('Lunch', dayRec.lunch);
    if (dayRec.dinner) meals += buildMealSection('Dinner', dayRec.dinner);

    if (dayRec.dayTotals) {
      const dt = dayRec.dayTotals;
      meals += `
        <div style="margin-top:20px;padding:12px;background:#eff6ff;border-radius:8px;">
          <strong style="color:#1d4ed8;">Full Day Totals:</strong>
          <span style="margin-left:12px;">${dt.calories} cal</span>
          <span style="margin-left:12px;">${dt.protein}g protein</span>
          <span style="margin-left:12px;">${dt.carbs}g carbs</span>
          <span style="margin-left:12px;">${dt.fat}g fat</span>
        </div>`;
    }
  }

  if (!meals) meals = '<p>No menu data available for tomorrow yet. Check back later!</p>';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="color:#1d4ed8;font-size:24px;margin-bottom:4px;">NAV Meal Planner</h1>
  <p style="color:#71717a;margin-top:0;">North Avenue Dining Hall — Georgia Tech</p>
  <p>Hey ${name || 'there'}! Here are your personalized meal recommendations for <strong>${formattedDate}</strong>:</p>
  ${meals}
  <hr style="border:none;border-top:1px solid #e4e4e7;margin:32px 0 16px;">
  <p style="color:#a1a1aa;font-size:12px;">You're receiving this because you opted in on the NAV Meal Planner. Visit the site to update your preferences.</p>
</body>
</html>`;
}

// ---------- POST: subscribe/unsubscribe ----------

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { optIn } = body as { optIn: boolean };
  const email = session.user.email;
  const name = session.user.name ?? null;

  // Ensure user exists in DB
  await findOrCreateUser(email, name);

  // Update subscription status
  await setEmailSubscription(email, optIn);

  // If opting in, immediately send tomorrow's recommendations
  if (optIn) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: 'Server API keys not configured' }, { status: 500 });
    }

    // Load user goals from database
    const prefs = await getUserPreferences(email);
    const goals = {
      dailyCalories: prefs?.dailyCalories ?? 2000,
      dailyProtein: prefs?.dailyProtein ?? 150,
      fitnessGoal: prefs?.fitnessGoal ?? '',
      appetite: prefs?.appetite ?? 'medium',
      restrictions: prefs?.restrictions ?? '',
    };

    // Load user liked foods from database
    const likedItems = await getLikedFoods(email);

    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fetch all 3 menus with nutrition in parallel (nutrition is cached by /api/gemini)
    const [breakfastItems, lunchItems, dinnerItems] = await Promise.all([
      getMenuWithNutrition('breakfast', tomorrowStr).catch(() => []),
      getMenuWithNutrition('lunch', tomorrowStr).catch(() => []),
      getMenuWithNutrition('dinner', tomorrowStr).catch(() => []),
    ]);

    // Single Gemini call for a coherent full-day plan
    const dayRec = await getDayRecommendation(breakfastItems, lunchItems, dinnerItems, goals, likedItems).catch(() => null);

    // Build and send email
    const html = buildEmailHtml(name ?? '', tomorrowStr, dayRec);
    const resend = new Resend(resendKey);

    try {
      await resend.emails.send({
        from: 'NAV Meal Planner <onboarding@resend.dev>',
        to: email,
        subject: `Your NAV Meal Plan for ${new Date(tomorrowStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
        html,
      });
    } catch (err) {
      console.error('Resend email failed:', err);
      return NextResponse.json({ error: 'Failed to send email', subscribed: true }, { status: 500 });
    }

    return NextResponse.json({ success: true, subscribed: true, emailSent: true });
  }

  return NextResponse.json({ success: true, subscribed: false });
}

// ---------- GET: check subscription status ----------

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const optedIn = await isUserSubscribed(session.user.email);
  return NextResponse.json({ optedIn });
}

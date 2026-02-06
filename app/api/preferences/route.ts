import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const PREFS_PATH = join(process.cwd(), 'user-preferences.json');

interface UserPreferences {
  dailyCalories: number;
  dailyProtein: number;
  fitnessGoal: string;
  appetite: string;
  restrictions: string;
  filters?: {
    vegetarian: boolean;
    vegan: boolean;
    eggless: boolean;
  };
}

interface AllPreferences {
  [userId: string]: UserPreferences;
}

function readPrefs(): AllPreferences {
  try {
    if (!existsSync(PREFS_PATH)) return {};
    const data = readFileSync(PREFS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writePrefs(prefs: AllPreferences) {
  writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2));
}

// GET — load saved preferences for the logged-in user
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.email;
  const allPrefs = readPrefs();
  const prefs = allPrefs[userId] ?? null;

  return NextResponse.json({ preferences: prefs });
}

// POST — save preferences for the logged-in user
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.email;
  const body = await request.json();
  const { preferences } = body as { preferences: UserPreferences };

  if (!preferences) {
    return NextResponse.json({ error: 'Preferences required' }, { status: 400 });
  }

  const allPrefs = readPrefs();
  allPrefs[userId] = {
    dailyCalories: preferences.dailyCalories,
    dailyProtein: preferences.dailyProtein,
    fitnessGoal: preferences.fitnessGoal,
    appetite: preferences.appetite,
    restrictions: preferences.restrictions,
    filters: preferences.filters,
  };
  writePrefs(allPrefs);

  return NextResponse.json({ success: true });
}

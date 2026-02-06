import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserPreferences, upsertUserPreferences, preferencesToJson } from '@/app/lib/db';

interface UserPreferencesInput {
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

// GET — load saved preferences for the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const prefs = await getUserPreferences(session.user.email);
  return NextResponse.json({ preferences: preferencesToJson(prefs) });
}

// POST — save preferences for the logged-in user
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { preferences } = body as { preferences: UserPreferencesInput };

  if (!preferences) {
    return NextResponse.json({ error: 'Preferences required' }, { status: 400 });
  }

  await upsertUserPreferences(session.user.email, {
    dailyCalories: preferences.dailyCalories,
    dailyProtein: preferences.dailyProtein,
    fitnessGoal: preferences.fitnessGoal,
    appetite: preferences.appetite,
    restrictions: preferences.restrictions,
    vegetarian: preferences.filters?.vegetarian ?? false,
    vegan: preferences.filters?.vegan ?? false,
    eggless: preferences.filters?.eggless ?? false,
  });

  return NextResponse.json({ success: true });
}

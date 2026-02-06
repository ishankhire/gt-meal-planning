import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const RATINGS_PATH = join(process.cwd(), 'user-food-ratings.json');

// 'like' | 'dislike' — absence means neutral
type FoodRating = 'like' | 'dislike';

interface UserRatings {
  [foodKey: string]: FoodRating;
}

interface AllRatings {
  [userId: string]: UserRatings;
}

function readRatings(): AllRatings {
  try {
    if (!existsSync(RATINGS_PATH)) return {};
    const data = readFileSync(RATINGS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writeRatings(ratings: AllRatings) {
  writeFileSync(RATINGS_PATH, JSON.stringify(ratings, null, 2));
}

// GET — load all food ratings for the logged-in user
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.email;
  const allRatings = readRatings();
  const ratings = allRatings[userId] ?? {};

  return NextResponse.json({ ratings });
}

// POST — update a single food rating for the logged-in user
// Body: { foodKey: string, rating: 'like' | 'dislike' | null }
// Passing null removes the rating (back to neutral)
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.email;
  const body = await request.json();
  const { foodKey, rating } = body as { foodKey: string; rating: FoodRating | null };

  if (!foodKey) {
    return NextResponse.json({ error: 'foodKey required' }, { status: 400 });
  }

  const allRatings = readRatings();
  if (!allRatings[userId]) {
    allRatings[userId] = {};
  }

  if (rating === null) {
    delete allRatings[userId][foodKey];
  } else {
    allRatings[userId][foodKey] = rating;
  }

  writeRatings(allRatings);
  return NextResponse.json({ success: true });
}

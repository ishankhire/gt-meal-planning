import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getFoodRatings, setFoodRating, type RatingType } from '@/app/lib/db';

// GET — load all food ratings for the logged-in user
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ratings = await getFoodRatings(session.user.email);
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

  const body = await request.json();
  const { foodKey, rating } = body as { foodKey: string; rating: RatingType | null };

  if (!foodKey) {
    return NextResponse.json({ error: 'foodKey required' }, { status: 400 });
  }

  await setFoodRating(session.user.email, foodKey, rating);
  return NextResponse.json({ success: true });
}

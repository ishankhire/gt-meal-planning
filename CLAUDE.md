# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NAV Meal Planning is a full-stack web app for Georgia Tech's North Avenue Dining Hall. It lets students browse daily menus, filter by dietary/nutritional needs, get AI-powered meal recommendations, and opt into daily email digests. All source code lives in the `nav-website/` subdirectory.

## Commands

All commands run from `nav-website/`:

```bash
cd nav-website
npm run dev          # Dev server at localhost:3000
npm run build        # prisma generate && next build
npm run lint         # ESLint (v9 flat config)
npm start            # Production server
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>  # Create and apply a migration
```

No automated test suite exists.

## Architecture

**Stack**: Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS 4 / PostgreSQL via Prisma 7 / NextAuth.js (Google OAuth)

**Key path alias**: `@/*` maps to the `nav-website/` root (configured in tsconfig.json).

### Frontend

Single-page app built from composable components and custom hooks. All components are `'use client'`.

**`app/page.tsx`** (~145 lines) — Orchestrator that composes hooks and components. No business logic lives here.

**`app/types/menu.ts`** — Shared TypeScript interfaces: `Food`, `MenuItem`, `MenuData`, `FoodEstimate`, `Recommendation`, `MealType`, `DietaryFilters`, `NutritionalFilters`, `RecGoals`.

**`app/utils/menu.ts`** — Pure utility functions: `getCacheKey`, `hasIcon`, `getServingSize`, `passesAllFilters`, `groupMenuByCategory`.

**`app/hooks/`** — Custom React hooks for data fetching and state management:

| Hook | Responsibility |
|---|---|
| `useMediaQuery` | Viewport media query detection |
| `useMenuData` | Menu fetching, date/meal selection, derived menu items |
| `usePreferences` | Dietary/nutritional filters, recommendation goals, load/save |
| `useFoodRatings` | Like/dislike state, toggle with delayed sort, load/save |
| `useEmailOptIn` | Email subscription status, save preference |
| `useGeminiNutrition` | Batch nutrition estimation via Gemini API |
| `useRecommendation` | AI meal recommendation fetching and state |

**`app/components/`** — UI components:

| Component | Purpose |
|---|---|
| `Header` | Logo, title, sign-in/sign-out |
| `MealControls` | Date picker and meal type selector |
| `FilterSection` | Reusable collapsible checkbox filter |
| `EmailPreferences` | Email opt-in radio buttons and save |
| `MealRecommender` | Goal inputs, generate button, results display |
| `MenuDisplay` | Category-grouped food items grid |
| `FoodItemCard` | Single food item with desktop/mobile layouts |
| `RatingButtons` | Like/dislike thumb buttons (shared component) |
| `NutritionStats` | Calories/protein/carbs/fat display (shared component) |
| `Footer` | Attribution footer |

The `app/providers.tsx` wrapper supplies the NextAuth SessionProvider.

### API Routes (`app/api/`)

| Route | Purpose |
|---|---|
| `auth/[...nextauth]` | Google OAuth via NextAuth.js |
| `menu` | Proxies NutriSlice API for weekly dining hall menus |
| `gemini` | Estimates nutrition via Google Gemini (`gemini-2.5-flash`) |
| `recommend` | Single-meal AI recommendation |
| `recommend-day` | Full-day meal plan AI recommendation |
| `preferences` | CRUD for user dietary/nutritional preferences |
| `food-ratings` | Like/dislike tracking per user per food item |
| `email` | Email subscription management and sending (via Resend) |

### Data Layer

- **`app/lib/prisma.ts`** — Prisma client singleton
- **`app/lib/db.ts`** — All database operations (user CRUD, preferences, food ratings, email subscriptions, nutrition cache). API routes call into this module rather than using Prisma directly.
- **`prisma/schema.prisma`** — Five models: `User`, `UserPreferences`, `FoodRating`, `EmailSubscription`, `NutritionCache`

### External Services

- **NutriSlice API** (`techdining.api.nutrislice.com`) — dining hall menu data
- **Google Gemini API** (`@google/genai`) — nutrition estimation and meal recommendations
- **Resend** — transactional email delivery
- **Google OAuth** — authentication provider

### Environment Variables

Defined in `nav-website/.env.local`: database URL, Google OAuth credentials, Gemini API key, Resend API key, NextAuth secret/URL. Required for the app to function.

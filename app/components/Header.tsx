import { signIn, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';

interface HeaderProps {
  session: Session | null;
}

export function Header({ session }: HeaderProps) {
  return (
    <header className="text-center mb-8 relative pt-12 md:pt-0">
      {/* Auth button */}
      <div className="absolute right-0 top-0">
        {session?.user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-600">
              {session.user.name || session.user.email}
            </span>
            <button
              onClick={() => signOut()}
              className="px-3 py-1.5 text-sm rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn('google')}
            className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Sign in
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 md:gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cute-bee.svg" alt="Nav Bee Logo" className="w-8 h-8 md:w-12 md:h-12" />
        <h1 className="text-3xl font-bold text-zinc-900">
          Nav Meal Planner
        </h1>
      </div>
    </header>
  );
}

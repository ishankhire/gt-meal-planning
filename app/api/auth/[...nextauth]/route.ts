import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Attach the user's unique ID (sub) to the session so we can key preferences
      if (session.user && token.sub) {
        (session.user as Record<string, unknown>).id = token.sub;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };

import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { DataModel } from "./_generated/dataModel";

/**
 * Convex Auth configuration using the Password provider.
 *
 * The `profile` callback maps the params received from `signIn("password", ...)`
 * to fields stored in the `users` table. We capture the optional `name` here
 * (used during signup) and add `createdAt`/`lastSeen` timestamps.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params: Record<string, unknown>) {
        const email = (params.email as string)?.trim().toLowerCase();
        const name = (params.name as string | undefined)?.trim() || email;
        const now = Date.now();
        return {
          email,
          name,
          createdAt: now,
          lastSeen: now,
        };
      },
    }),
  ],
});

/**
 * Returns the currently authenticated user's full document, or `null`
 * if the request is unauthenticated.
 *
 * Used by `useAuth()` on the frontend to populate the user state.
 */
export const loggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

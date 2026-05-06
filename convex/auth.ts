import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { rateLimiter } from "./shared/rateLimit";
import {
  emailSchema,
  passwordSchema,
  userNameSchema,
  validateOrThrow,
} from "./shared/validation";

/**
 * Convex Auth configuration using the Password provider.
 *
 * The `profile` callback maps the params received from `signIn("password", ...)`
 * to fields stored in the `users` table. We capture the optional `name` here
 * (used during signup) and add `createdAt`/`lastSeen` timestamps.
 */
export const {
  auth,
  signIn: signInInternal,
  signOut,
  store,
  isAuthenticated,
} = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params: Record<string, unknown>) {
        const rawEmail = (params.email as string | undefined)?.trim().toLowerCase() ?? "";
        const rawPassword = (params.password as string | undefined) ?? "";
        const rawName = (params.name as string | undefined)?.trim();

        // Validation server-side : email RFC + password entropie.
        const email = validateOrThrow(emailSchema, rawEmail);
        // Le password est validé uniquement au signUp (le signIn ne le re-valide
        // pas, sinon les comptes anciens seraient bloqués).
        if (params.flow === "signUp") {
          validateOrThrow(passwordSchema, rawPassword);
        }
        const name = rawName
          ? validateOrThrow(userNameSchema, rawName)
          : email;
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
 * Public `signIn` action — wraps the underlying convexAuth signIn with a
 * per-email rate limit + lockout (resolves C5.2 brute-force, C1.4 lockout).
 *
 * 5 attempts per 15 minutes per email (fixed window). When exceeded, throws
 * a ConvexError matching /Locked/ which the test harness recognises as
 * "Unauthorized".
 *
 * The rate limit is consumed BEFORE the credential check so that both
 * non-existent accounts and wrong passwords are throttled — defeating
 * password guessing AND account enumeration.
 *
 * The original signIn action remains exported as `signInInternal` so that
 * HTTP routes registered by `auth.addHttpRoutes` (which hold a direct
 * closure to `signInImpl`) keep working, and so we can delegate to it here.
 */
export const signIn = action({
  args: {
    provider: v.optional(v.string()),
    params: v.optional(v.any()),
    verifier: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    calledBy: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const params = (args.params ?? {}) as Record<string, unknown>;
    const flow = params.flow as string | undefined;
    const email = (params.email as string | undefined)?.trim().toLowerCase();

    if (flow === "signIn" && email) {
      const status = await rateLimiter.limit(ctx, "signIn", { key: email });
      if (!status.ok) {
        throw new ConvexError({
          kind: "Locked",
          message: "Too many sign-in attempts",
          retryAfterMs: status.retryAfter ?? 15 * 60 * 1000,
        });
      }
    }

    if (flow === "signUp" && email) {
      // Limite par email (5/h) — empêche le spam d'inscription depuis une
      // même adresse. Limitation connue : un attaquant peut tourner les
      // emails ; pas de rate limit par IP côté mutation Convex.
      const status = await rateLimiter.limit(ctx, "signUp", { key: email });
      if (!status.ok) {
        throw new ConvexError({
          kind: "RateLimited",
          message: "Too many signup attempts",
          retryAfterMs: status.retryAfter ?? 60 * 60 * 1000,
        });
      }
    }

    // Delegate to the original convexAuth signIn action.
    return await ctx.runAction(api.auth.signInInternal, args);
  },
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

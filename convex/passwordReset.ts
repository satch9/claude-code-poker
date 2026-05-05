import { mutation, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { modifyAccountCredentials } from "@convex-dev/auth/server";
import { passwordSchema, validateOrThrow } from "./shared/validation";
import { Id } from "./_generated/dataModel";

const TOKEN_TTL_MS = 15 * 60 * 1000;

function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Step 1 — request a password reset token.
 *
 * Always returns `{ ok: true }` (anti-enumeration : le client ne peut pas
 * détecter si l'email existe ou non).
 *
 * Si l'email existe, un token (256 bits, hex) est inséré dans
 * `passwordResetTokens` avec un TTL de 15 minutes, puis loggué côté
 * serveur. Une intégration email type Resend pourra l'envoyer plus tard ;
 * pour le cercle restreint authentifié, le log console suffit.
 */
export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { ok: true };

    const token = generateResetToken();
    await ctx.db.insert("passwordResetTokens", {
      token,
      userId: user._id,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });

    // TODO Resend : envoyer le mail. En attendant, log dev (visible dans
    // les logs Convex `npx convex logs`).
    console.log(
      `[passwordReset] token for ${email}: ${token} (expires in 15min)`,
    );
    return { ok: true };
  },
});

// Internal helper : validate token + return userId/email or throw.
export const _consumeResetToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const t = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!t || t.expiresAt < Date.now()) {
      throw new ConvexError("Invalid or expired token");
    }
    const user = await ctx.db.get(t.userId);
    if (!user) throw new ConvexError("User not found");
    // Consommation : suppression unique-use.
    await ctx.db.delete(t._id);
    return { userId: t.userId as Id<"users">, email: user.email };
  },
});

/**
 * Step 2 — reset the password using a valid token.
 *
 * Action (and not mutation) car `modifyAccountCredentials` exige un
 * `ActionCtx` (re-hashage du secret par le provider Password).
 */
export const resetPassword = action({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    validateOrThrow(passwordSchema, args.newPassword);

    const { email } = await ctx.runMutation(
      internal.passwordReset._consumeResetToken,
      { token: args.token },
    );

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: args.newPassword },
    });

    return { ok: true };
  },
});

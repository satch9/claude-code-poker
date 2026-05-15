// One-shot admin action : remplace le mot de passe d'un compte Password
// (@convex-dev/auth). À supprimer après usage.

"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { Scrypt } from "lucia";

export const resetPassword: any = action({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; reason?: string; accountId?: string }> => {
    const hash = await new Scrypt().hash(args.newPassword);
    return await ctx.runMutation(
      internal.admin.resetPasswordsMutation.patchSecret,
      {
        email: args.email.toLowerCase(),
        hash,
      },
    );
  },
});

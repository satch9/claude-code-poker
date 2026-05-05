import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import {
  emailSchema,
  passwordSchema,
  userNameSchema,
  validateOrThrow,
} from "./shared/validation";

// Sign up with email and password
export const signUpWithPassword = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    validateOrThrow(emailSchema, args.email);
    validateOrThrow(passwordSchema, args.password);
    validateOrThrow(userNameSchema, args.name);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new ConvexError("User already exists with this email");
    }

    const salt = generateSalt();
    const hashedPassword = await hashWithSalt(args.password, salt);

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      password: hashedPassword,
      passwordSalt: salt,
      createdAt: Date.now(),
      lastSeen: Date.now(),
    });

    return { userId };
  },
});

// Sign in with email and password
export const signInWithPassword = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    validateOrThrow(emailSchema, args.email);
    if (!args.password) throw new ConvexError("Mot de passe requis");

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user || !user.password) {
      throw new ConvexError("Invalid email or password");
    }

    // Verify password (backward compat: legacy accounts used the literal "salt")
    const isValidPassword = await verifyPassword(
      args.password,
      user.password,
      user.passwordSalt
    );

    if (!isValidPassword) {
      throw new ConvexError("Invalid email or password");
    }

    // Migration: if no salt stored, generate one and re-hash
    if (!user.passwordSalt) {
      const newSalt = generateSalt();
      const newHash = await hashWithSalt(args.password, newSalt);
      await ctx.db.patch(user._id, {
        password: newHash,
        passwordSalt: newSalt,
        lastSeen: Date.now(),
      });
    } else {
      await ctx.db.patch(user._id, {
        lastSeen: Date.now(),
      });
    }

    // Return user data without password
    const { password: _password, passwordSalt: _passwordSalt, ...userWithoutPassword } = user;
    return {
      userId: user._id,
      user: userWithoutPassword
    };
  },
});

// Generate a cryptographically random salt (16 bytes, hex-encoded)
function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashWithSalt(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string | undefined
): Promise<boolean> {
  // Backward compat: old accounts used the literal "salt" string
  const effectiveSalt = salt ?? "salt";
  const candidate = await hashWithSalt(password, effectiveSalt);
  return candidate === hashedPassword;
}

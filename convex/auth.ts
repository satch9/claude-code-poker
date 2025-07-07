import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";

// Sign up with email and password
export const signUpWithPassword = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new ConvexError("User already exists with this email");
    }

    // Create user with hashed password
    const hashedPassword = await Password.hash(args.password);
    
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      password: hashedPassword,
      chips: 10000,
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
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user || !user.password) {
      throw new ConvexError("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await Password.verify(args.password, user.password);
    
    if (!isValidPassword) {
      throw new ConvexError("Invalid email or password");
    }

    // Update last seen
    await ctx.db.patch(user._id, {
      lastSeen: Date.now(),
    });

    return { userId: user._id };
  },
});

// Sign out
export const signOut = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      await ctx.auth.signOut();
    }
    return { success: true };
  },
});

// Get current user session
export const getCurrentSession = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    return user;
  },
});
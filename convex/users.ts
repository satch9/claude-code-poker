import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get current authenticated user
export const getCurrentUser = query({
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

// Create a new user
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      avatar: args.avatar,
      createdAt: Date.now(),
    });
  },
});

// Create or update user on auth
export const createOrUpdateUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        avatar: args.avatar,
        lastSeen: Date.now(),
      });
      return existingUser._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        avatar: args.avatar,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      });
    }
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Les chips sont gérés dans la table players, pas users

// Update user last seen
export const updateLastSeen = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      lastSeen: Date.now(),
    });
  },
});

// Generate upload URL for avatar image
export const generateAvatarUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
    avatarImageId: v.optional(v.id("_storage")),
    removeAvatarImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Prepare update data
    const updateData: any = {};
    
    if (args.name !== undefined) {
      if (args.name.trim().length === 0) {
        throw new Error("Name cannot be empty");
      }
      updateData.name = args.name.trim();
      // Update avatar letter if name changed
      updateData.avatar = args.name.trim().charAt(0).toUpperCase();
    }

    if (args.avatarColor !== undefined) {
      updateData.avatarColor = args.avatarColor;
    }

    if (args.avatarImageId !== undefined) {
      // Delete old avatar image if it exists
      if (user.avatarImageId) {
        await ctx.storage.delete(user.avatarImageId);
      }
      updateData.avatarImageId = args.avatarImageId;
    }

    if (args.removeAvatarImage) {
      // Delete current avatar image
      if (user.avatarImageId) {
        await ctx.storage.delete(user.avatarImageId);
      }
      updateData.avatarImageId = undefined;
    }

    // Update user
    await ctx.db.patch(user._id, updateData);

    // Return updated user
    return await ctx.db.get(user._id);
  },
});

// Get avatar image URL
export const getAvatarImageUrl = query({
  args: { imageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.imageId);
  },
});
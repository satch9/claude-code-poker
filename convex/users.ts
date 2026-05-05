import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSelf } from "./shared/auth";

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log("getUser called with userId:", args.userId);
    return await ctx.db.get(args.userId);
  },
});

// Generate upload URL for avatar image
export const generateAvatarUploadUrl = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    // Verify user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
    avatarImageId: v.optional(v.id("_storage")),
    removeAvatarImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    // Get current user by ID
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error(`User not found with ID: ${args.userId}`);
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
    await ctx.db.patch(args.userId, updateData);

    // Return updated user
    return await ctx.db.get(args.userId);
  },
});

// Get avatar image URL
export const getAvatarImageUrl = query({
  args: { imageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.imageId);
  },
});

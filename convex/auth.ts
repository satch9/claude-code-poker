import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

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

    // Pour simplifier, on stocke le mot de passe en hash simple (en production, utiliser bcrypt)
    const hashedPassword = await hashPassword(args.password);
    
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      password: hashedPassword,
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
    const isValidPassword = await verifyPassword(args.password, user.password);
    
    if (!isValidPassword) {
      throw new ConvexError("Invalid email or password");
    }

    // Update last seen
    await ctx.db.patch(user._id, {
      lastSeen: Date.now(),
    });

    // Return user data without password
    const { password, ...userWithoutPassword } = user;
    return { 
      userId: user._id,
      user: userWithoutPassword
    };
  },
});

// Simple password hashing (en production, utiliser bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt"); // Ajouter un vrai salt en production
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hashedPassword;
}

// Get current authenticated user
export const getCurrentSession = query({
  handler: async (ctx) => {
    // Pour l'instant, pas d'authentification session-based
    // TODO: Implémenter la session après configuration OAuth
    return null;
  },
});
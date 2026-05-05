// Schémas Zod pour la validation des entrées des mutations Convex.
import { z } from "zod";

export const emailSchema = z
  .string()
  .min(3)
  .max(255)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email invalide");

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit faire au moins 8 caractères")
  .max(200);

export const userNameSchema = z
  .string()
  .min(1, "Le nom est requis")
  .max(50);

export const createTableSchema = z
  .object({
    name: z.string().min(1).max(50),
    maxPlayers: z.number().int().min(2).max(9),
    gameType: z.enum(["cash", "tournament"]),
    buyIn: z.number().nonnegative().optional(),
    startingStack: z.number().int().positive(),
    smallBlind: z.number().int().positive(),
    bigBlind: z.number().int().positive(),
    isPrivate: z.boolean(),
  })
  .refine((d) => d.bigBlind >= 2 * d.smallBlind, {
    message: "bigBlind doit être >= 2 × smallBlind",
    path: ["bigBlind"],
  })
  .refine((d) => d.startingStack >= 10 * d.bigBlind, {
    message: "startingStack doit être >= 10 × bigBlind",
    path: ["startingStack"],
  });

export const buyInAmountSchema = z.number().int().positive();

// Helper pour transformer un échec Zod en erreur lisible
export function validateOrThrow<T>(schema: z.ZodSchema<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const msg = result.error.errors.map((e) => e.message).join("; ");
    throw new Error(`Validation: ${msg}`);
  }
  return result.data;
}

// Schémas Zod pour la validation des entrées des mutations Convex.
import { z } from "zod";
import { ConvexError } from "convex/values";

// Email — RFC-ish regex (suffisamment strict pour bloquer les inputs absurdes
// tout en restant pragmatique).
export const emailSchema = z
  .string()
  .min(5)
  .max(255)
  .regex(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    "Email invalide",
  )
  .refine((s) => {
    const tld = s.split(".").pop() ?? "";
    return tld.length >= 2;
  }, "TLD trop court");

// Password — entropie minimale.
// Accepte soit ≥12 caractères, soit ≥8 caractères avec maj + chiffre + spécial.
export const passwordSchema = z
  .string()
  .max(200)
  .refine(
    (p) =>
      p.length >= 12 ||
      (p.length >= 8 &&
        /[A-Z]/.test(p) &&
        /[0-9]/.test(p) &&
        /[^A-Za-z0-9]/.test(p)),
    "Mot de passe : ≥12 caractères OU ≥8 avec majuscule + chiffre + spécial",
  );

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
    startingStack: z.number().int().min(100).max(100_000),
    smallBlind: z.number().int().positive(),
    bigBlind: z.number().int().positive(),
    isPrivate: z.boolean(),
    preset: z.enum(["turbo", "standard", "long", "custom"]).optional(),
    levelDurationMin: z.number().int().min(5).max(60).optional(),
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

export const rebuyAmountSchema = z.number().int().positive();

// Helper pour transformer un échec Zod en erreur lisible
export function validateOrThrow<T>(schema: z.ZodSchema<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const msg = result.error.errors.map((e) => e.message).join("; ");
    throw new ConvexError(`Validation: ${msg}`);
  }
  return result.data;
}

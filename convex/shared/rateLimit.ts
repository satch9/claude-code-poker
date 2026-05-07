import { RateLimiter, MINUTE, HOUR, SECOND } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

/**
 * Centralized rate limiter for the application.
 *
 * Each named limit is keyed per-user (or per-email for sign-in), enforced
 * transactionally by the @convex-dev/rate-limiter component.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  signIn: { kind: "fixed window", rate: 5, period: 15 * MINUTE },
  signUp: { kind: "fixed window", rate: 5, period: HOUR },
  createTable: { kind: "fixed window", rate: 10, period: MINUTE },
  joinTable: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 },
  playerAction: {
    kind: "token bucket",
    rate: 10,
    period: SECOND,
    capacity: 10,
  },
  chatMessage: { kind: "token bucket", rate: 5, period: 10 * SECOND, capacity: 5 },
  inviteLookup: { kind: "fixed window", rate: 10, period: MINUTE },
  rebuy: { kind: "fixed window", rate: 5, period: MINUTE },
});

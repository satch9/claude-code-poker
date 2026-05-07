/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_advanceTurn from "../admin/advanceTurn.js";
import type * as admin_wipeGameData from "../admin/wipeGameData.js";
import type * as auth from "../auth.js";
import type * as core_gameEngine from "../core/gameEngine.js";
import type * as http from "../http.js";
import type * as internal_gameEngine from "../internal/gameEngine.js";
import type * as passwordReset from "../passwordReset.js";
import type * as players from "../players.js";
import type * as shared_auth from "../shared/auth.js";
import type * as shared_rateLimit from "../shared/rateLimit.js";
import type * as shared_sanitize from "../shared/sanitize.js";
import type * as shared_validation from "../shared/validation.js";
import type * as tables from "../tables.js";
import type * as users from "../users.js";
import type * as users_stats from "../users/stats.js";
import type * as utils_blindStructure from "../utils/blindStructure.js";
import type * as utils_gameStateMachine from "../utils/gameStateMachine.js";
import type * as utils_handEvaluator from "../utils/handEvaluator.js";
import type * as utils_poker from "../utils/poker.js";
import type * as utils_prizeStructure from "../utils/prizeStructure.js";
import type * as utils_turnManager from "../utils/turnManager.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/advanceTurn": typeof admin_advanceTurn;
  "admin/wipeGameData": typeof admin_wipeGameData;
  auth: typeof auth;
  "core/gameEngine": typeof core_gameEngine;
  http: typeof http;
  "internal/gameEngine": typeof internal_gameEngine;
  passwordReset: typeof passwordReset;
  players: typeof players;
  "shared/auth": typeof shared_auth;
  "shared/rateLimit": typeof shared_rateLimit;
  "shared/sanitize": typeof shared_sanitize;
  "shared/validation": typeof shared_validation;
  tables: typeof tables;
  users: typeof users;
  "users/stats": typeof users_stats;
  "utils/blindStructure": typeof utils_blindStructure;
  "utils/gameStateMachine": typeof utils_gameStateMachine;
  "utils/handEvaluator": typeof utils_handEvaluator;
  "utils/poker": typeof utils_poker;
  "utils/prizeStructure": typeof utils_prizeStructure;
  "utils/turnManager": typeof utils_turnManager;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};

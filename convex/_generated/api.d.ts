/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as core_gameEngine from "../core/gameEngine.js";
import type * as internal_gameEngine from "../internal/gameEngine.js";
import type * as players from "../players.js";
import type * as tables from "../tables.js";
import type * as users_stats from "../users/stats.js";
import type * as users from "../users.js";
import type * as utils_poker from "../utils/poker.js";
import type * as utils_turnManager from "../utils/turnManager.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "core/gameEngine": typeof core_gameEngine;
  "internal/gameEngine": typeof internal_gameEngine;
  players: typeof players;
  tables: typeof tables;
  "users/stats": typeof users_stats;
  users: typeof users;
  "utils/poker": typeof utils_poker;
  "utils/turnManager": typeof utils_turnManager;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

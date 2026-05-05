/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_wipeAccounts from "../admin/wipeAccounts.js";
import type * as auth from "../auth.js";
import type * as core_gameEngine from "../core/gameEngine.js";
import type * as http from "../http.js";
import type * as internal_gameEngine from "../internal/gameEngine.js";
import type * as players from "../players.js";
import type * as shared_auth from "../shared/auth.js";
import type * as shared_rateLimit from "../shared/rateLimit.js";
import type * as shared_sanitize from "../shared/sanitize.js";
import type * as shared_validation from "../shared/validation.js";
import type * as tables from "../tables.js";
import type * as users_stats from "../users/stats.js";
import type * as users from "../users.js";
import type * as utils_gameStateMachine from "../utils/gameStateMachine.js";
import type * as utils_handEvaluator from "../utils/handEvaluator.js";
import type * as utils_poker from "../utils/poker.js";
import type * as utils_turnManager from "../utils/turnManager.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "admin/wipeAccounts": typeof admin_wipeAccounts;
  auth: typeof auth;
  "core/gameEngine": typeof core_gameEngine;
  http: typeof http;
  "internal/gameEngine": typeof internal_gameEngine;
  players: typeof players;
  "shared/auth": typeof shared_auth;
  "shared/rateLimit": typeof shared_rateLimit;
  "shared/sanitize": typeof shared_sanitize;
  "shared/validation": typeof shared_validation;
  tables: typeof tables;
  "users/stats": typeof users_stats;
  users: typeof users;
  "utils/gameStateMachine": typeof utils_gameStateMachine;
  "utils/handEvaluator": typeof utils_handEvaluator;
  "utils/poker": typeof utils_poker;
  "utils/turnManager": typeof utils_turnManager;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: {
    lib: {
      checkRateLimit: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
      getValue: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          key?: string;
          name: string;
          sampleShards?: number;
        },
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          shard: number;
          ts: number;
          value: number;
        }
      >;
      rateLimit: FunctionReference<
        "mutation",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      resetRateLimit: FunctionReference<
        "mutation",
        "internal",
        { key?: string; name: string },
        null
      >;
    };
    time: {
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
    };
  };
};

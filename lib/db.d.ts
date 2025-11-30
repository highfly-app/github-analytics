/**
 * Database type definitions for github-analytics
 */

import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Json = JsonValue;

export type JsonValue =
  | string
  | number
  | boolean
  | JsonObject
  | JsonArray
  | null;

export type JsonArray = JsonValue[];

export type JsonObject = { [Key in string]?: JsonValue };

export interface GithubAnalyticsCache {
  cachedAt: Generated<Timestamp>;
  cacheKey: string;
  createdAt: Generated<Timestamp>;
  data: Json;
  expiresAt: Timestamp;
  id: Generated<string>;
  owner: string;
  repo: string;
  status: Generated<string>;
  updatedAt: Generated<Timestamp>;
}

export interface DB {
  githubAnalyticsCache: GithubAnalyticsCache;
}

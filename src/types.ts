export interface MemoryObject {
  id: string;
  user_id: string;
  app_id: string;
  content: string;
  summary: string | null;
  importance: number;
  recall_count: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  rec0_version: string;
  relevance_score?: number;
}

export interface RecallResult {
  memories: MemoryObject[];
  total_memories: number;
  recall_time_ms: number;
  cache_hit: boolean;
  rec0_version: string;
}

export interface ListResult {
  memories: MemoryObject[];
  total_memories: number;
  limit: number;
  offset: number;
  rec0_version: string;
}

export interface UserDeleteResult {
  deleted: boolean;
  memories_removed: number;
  permanent?: boolean;
  rec0_version?: string;
}

export interface ExportResult {
  user_id: string;
  app_id?: string | null;
  total_memories: number;
  memories: MemoryObject[];
  rec0_version?: string;
}

export interface AccountKeyInfo {
  id: string;
  prefix: string;
  key_prefix: string;
  key: string | null;
  name: string;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  revealable: boolean;
}

export interface WhoAmIResult {
  account_id: string;
  email: string;
  name?: string | null;
  plan?: string;
  ops_used_this_month?: number;
  ops_limit?: number;
  credits?: number;
  keys_count?: number;
  member_since?: string;
  keys?: AccountKeyInfo[];
}

export interface MemoryClientOptions {
  userId: string;
  apiKey?: string;
  appId?: string;
  baseUrl?: string;
  timeout?: number;
  retry?: RetryOptions;
  headers?: Record<string, string>;
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  exponentialBase?: number;
  jitter?: boolean;
}

export interface RecallOptions {
  limit?: number;
  recallLimit?: number;
  offset?: number;
  appId?: string;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  appId?: string;
}

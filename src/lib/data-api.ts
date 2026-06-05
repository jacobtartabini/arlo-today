import { invoke } from "@tauri-apps/api/core";
import { getToken } from "@/lib/auth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface DataApiRequest {
  action: "select" | "insert" | "update" | "delete" | "upsert" | "select_with_in" | "count" | "update_where";
  table: string;
  data?: Record<string, unknown>;
  id?: string;
  filters?: Record<string, unknown>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

interface DataApiResponse<T = unknown> {
  data?: T;
  error?: { message: string; code?: string };
}

export async function dataApi<T = unknown>(request: DataApiRequest): Promise<DataApiResponse<T>> {
  const token = await getToken();

  if (!token) {
    return { error: { message: "Authentication required", code: "UNAUTHENTICATED" } };
  }

  if (!SUPABASE_URL) {
    return { error: { message: "VITE_SUPABASE_URL is not configured", code: "CONFIG" } };
  }

  try {
    const payload = await invoke<{ data?: T; error?: { message?: string; code?: string } }>(
      "data_api_proxy",
      {
        supabaseUrl: SUPABASE_URL,
        token,
        body: request,
      }
    );

    if (payload.error) {
      return {
        error: {
          message: payload.error.message || "Request failed",
          code: payload.error.code,
        },
      };
    }

    return { data: payload.data };
  } catch (error) {
    return { error: { message: error instanceof Error ? error.message : "Network error" } };
  }
}

export const dataApiHelpers = {
  async select<T = unknown[]>(
    table: string,
    options?: {
      filters?: Record<string, unknown>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<{ data: T | null; error: string | null }> {
    const result = await dataApi<T>({ action: "select", table, ...options });
    return { data: result.data ?? null, error: result.error?.message ?? null };
  },

  async insert<T = unknown>(
    table: string,
    data: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }> {
    const result = await dataApi<T>({ action: "insert", table, data });
    return { data: result.data ?? null, error: result.error?.message ?? null };
  },

  async update<T = unknown>(
    table: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }> {
    const result = await dataApi<T>({ action: "update", table, id, data });
    return { data: result.data ?? null, error: result.error?.message ?? null };
  },

  async delete(
    table: string,
    id: string
  ): Promise<{ error: string | null }> {
    const result = await dataApi({ action: "delete", table, id });
    return { error: result.error?.message ?? null };
  },

  async selectWithIn<T = unknown[]>(
    table: string,
    column: string,
    values: string[],
    order?: { column: string; ascending?: boolean }
  ): Promise<{ data: T | null; error: string | null }> {
    const result = await dataApi<T>({
      action: "select_with_in",
      table,
      filters: { column, values } as unknown as Record<string, unknown>,
      order,
    });
    return { data: result.data ?? null, error: result.error?.message ?? null };
  },
};

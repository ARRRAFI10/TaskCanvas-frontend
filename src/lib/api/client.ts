import { useAuthStore } from "@/lib/stores/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public errors?: Record<string, string[]>,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

// Concurrent 401s share a single refresh call instead of racing each other.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = useAuthStore.getState();
  if (!refresh) return null;
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { access: string };
    useAuthStore.getState().setAccess(data.access);
    return data.access;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  allowRetry = true,
): Promise<T> {
  const { access } = useAuthStore.getState();
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  // An expired access token gets exactly one refresh-and-retry before logout.
  if (response.status === 401 && allowRetry && access) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const newAccess = await refreshPromise;
    if (newAccess) return apiFetch<T>(path, init, false);
    useAuthStore.getState().logout();
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data?.detail as string) ?? "Something went wrong. Please try again.",
      data?.errors as Record<string, string[]> | undefined,
    );
  }
  return data as T;
}

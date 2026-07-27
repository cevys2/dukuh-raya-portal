const PORTAL_API_BASE = import.meta.env.VITE_PORTAL_API_URL ?? "/api";

// Origins allowed to receive a token via the post-login `redirect` bounce-back.
// Prevents an attacker-crafted `?redirect=` from leaking a freshly issued
// JWT to an arbitrary domain (open redirect).
const ALLOWED_APP_ORIGINS = (import.meta.env.VITE_ALLOWED_APP_ORIGINS ?? "")
  .split(",")
  .map((o: string) => o.trim())
  .filter(Boolean);

export function isAllowedRedirect(url: string): boolean {
  try {
    return ALLOWED_APP_ORIGINS.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 menit, sama seperti aplikasi lain

export type AuthUser = { username: string; role: string; token: string };

export type PortalApp = {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  base_url: string;
  is_active: boolean;
  sort_order: number;
};

export function getStoredAuth(): AuthUser | null {
  const raw = localStorage.getItem("portal_auth");
  const lastSeenRaw = localStorage.getItem("portal_auth_last_seen");
  if (!raw) return null;
  const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;
  if (!lastSeen || Date.now() - lastSeen > SESSION_TIMEOUT_MS) {
    localStorage.removeItem("portal_auth");
    localStorage.removeItem("portal_auth_last_seen");
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredAuth(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem("portal_auth");
    localStorage.removeItem("portal_auth_last_seen");
  } else {
    localStorage.setItem("portal_auth", JSON.stringify(user));
    localStorage.setItem("portal_auth_last_seen", String(Date.now()));
  }
}

export function touchSession() {
  if (localStorage.getItem("portal_auth")) {
    localStorage.setItem("portal_auth_last_seen", String(Date.now()));
  }
}

async function request<T>(
  base: string,
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${base}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
  }
  return res.json() as Promise<T>;
}

export const api = {
  login(username: string, password: string) {
    return request<{ access_token: string; username: string; role: string }>(
      PORTAL_API_BASE,
      "/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) },
    );
  },
  myApps(token: string) {
    return request<PortalApp[]>(PORTAL_API_BASE, "/apps/me", {}, token);
  },
};

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";

const DEFAULT_AEGIS_BASE_URL = "https://raspberrypi.tailf531bd.ts.net";
const DEFAULT_APP_NAME = "arlo";
const DEFAULT_CALLBACK_SCHEME = "arlo-menubar";

export const AUTH_CHANGED_EVENT = "arlo-menubar:auth-changed";

interface JwtPayload {
  sub?: unknown;
  exp?: unknown;
  iss?: unknown;
  aud?: unknown;
}

interface TokenValidationResult {
  valid: boolean;
  reason?: string;
  expiresAt?: number;
}

const LOCAL_STORAGE_TOKEN_KEY = "arlo_menubar_auth_token";

let cachedToken: { token: string; expiresAt: number } | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;

function base64UrlToString(input: string): string {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");

  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
  } catch {
    return atob(base64);
  }
}

function decodeJwtPayload<T = unknown>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const json = base64UrlToString(parts[1]);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function normalizeAudience(aud: unknown): string[] {
  if (typeof aud === "string") return [aud];
  if (Array.isArray(aud)) return aud.filter((entry): entry is string => typeof entry === "string");
  return [];
}

function getAegisBaseUrl(): string {
  return (import.meta.env.VITE_AEGIS_BASE_URL || DEFAULT_AEGIS_BASE_URL).replace(/\/$/, "");
}

function getAegisAppName(): string {
  return import.meta.env.VITE_AEGIS_APP_NAME || DEFAULT_APP_NAME;
}

function getCallbackScheme(): string {
  return import.meta.env.VITE_MENUBAR_CALLBACK_SCHEME || DEFAULT_CALLBACK_SCHEME;
}

function getExpectedIssuer(): string | null {
  return import.meta.env.VITE_AEGIS_EXPECTED_ISSUER || null;
}

function getExpectedAudience(): string | null {
  return import.meta.env.VITE_AEGIS_EXPECTED_AUDIENCE || null;
}

export function getMenubarCallbackUrl(): string {
  return `${getCallbackScheme()}://auth/callback`;
}

export function validateToken(token: string): TokenValidationResult {
  const payload = decodeJwtPayload<JwtPayload>(token);

  if (!payload) {
    return { valid: false, reason: "Token payload could not be decoded" };
  }

  const exp =
    typeof payload.exp === "number"
      ? payload.exp
      : typeof payload.exp === "string"
        ? Number(payload.exp)
        : NaN;

  if (!Number.isFinite(exp)) {
    return { valid: false, reason: "Token is missing exp claim" };
  }

  const expiresAt = exp * 1000;
  if (expiresAt <= Date.now()) {
    return { valid: false, reason: "Token is expired" };
  }

  const expectedIssuer = getExpectedIssuer();
  if (expectedIssuer) {
    if (typeof payload.iss !== "string" || payload.iss !== expectedIssuer) {
      return { valid: false, reason: `Unexpected issuer: ${String(payload.iss)}` };
    }
  }

  const expectedAudience = getExpectedAudience();
  if (expectedAudience) {
    const audiences = normalizeAudience(payload.aud);
    if (!audiences.includes(expectedAudience)) {
      return { valid: false, reason: `Unexpected audience: ${JSON.stringify(payload.aud)}` };
    }
  }

  return { valid: true, expiresAt };
}

function emitAuthChanged(): void {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

function saveTokenToLocalStorage(token: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function loadTokenFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
  } catch {
    return null;
  }
}

function clearTokenFromLocalStorage(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}

async function saveTokenToKeychain(token: string): Promise<boolean> {
  try {
    await invoke("save_auth_token", { token });
    return true;
  } catch {
    return false;
  }
}

async function loadTokenFromKeychain(): Promise<string | null> {
  try {
    return await invoke<string | null>("load_auth_token");
  } catch {
    return null;
  }
}

async function clearTokenFromKeychain(): Promise<void> {
  try {
    await invoke("clear_auth_token");
  } catch {
    // Ignore keychain clear failures; local storage is cleared separately.
  }
}

async function persistToken(token: string): Promise<void> {
  saveTokenToLocalStorage(token);
  await saveTokenToKeychain(token);
}

async function clearAllStoredTokens(): Promise<void> {
  clearTokenFromLocalStorage();
  await clearTokenFromKeychain();
}

function scheduleExpirySignOut(expiresAt: number): void {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) return;

  expiryTimer = setTimeout(() => {
    cachedToken = null;
    void clearAllStoredTokens().finally(() => emitAuthChanged());
  }, remainingMs);
}

function rememberValidToken(token: string, expiresAt: number): void {
  cachedToken = { token, expiresAt };
  scheduleExpirySignOut(expiresAt);
}

function extractTokenFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const searchParams = parsed.searchParams;
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    const hashParams = new URLSearchParams(hash);

    return (
      searchParams.get("token") ??
      searchParams.get("jwt") ??
      searchParams.get("access_token") ??
      hashParams.get("token") ??
      hashParams.get("jwt") ??
      hashParams.get("access_token")
    );
  } catch {
    return null;
  }
}

export async function completeAuthFromUrl(url: string): Promise<boolean> {
  const token = extractTokenFromUrl(url);
  if (!token) return false;
  return completeAuthFromToken(token);
}

export async function completeAuthFromToken(token: string): Promise<boolean> {
  const result = validateToken(token);
  if (!result.valid || !result.expiresAt) {
    cachedToken = null;
    await clearAllStoredTokens();
    return false;
  }

  rememberValidToken(token, result.expiresAt);
  await persistToken(token);
  emitAuthChanged();
  return true;
}

export function getAegisAuthorizeUrl(): string {
  const callbackUrl = getMenubarCallbackUrl();
  return `${getAegisBaseUrl()}/authorize?app_name=${encodeURIComponent(getAegisAppName())}&next=${encodeURIComponent(callbackUrl)}`;
}

export async function startSignIn(): Promise<void> {
  await openUrl(`${getArloWebUrl()}/settings`);
}


export async function signOut(): Promise<void> {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  cachedToken = null;
  await clearAllStoredTokens();
  emitAuthChanged();
}

async function loadUsableStoredToken(): Promise<string | null> {
  if (cachedToken) {
    const result = validateToken(cachedToken.token);
    if (result.valid) return cachedToken.token;
    cachedToken = null;
  }

  const keychainToken = await loadTokenFromKeychain();
  const localToken = loadTokenFromLocalStorage();
  const candidates = [keychainToken, localToken].filter(
    (token): token is string => typeof token === "string" && token.length > 0
  );

  for (const stored of candidates) {
    const result = validateToken(stored);
    if (result.valid && result.expiresAt) {
      rememberValidToken(stored, result.expiresAt);
      // Re-sync storage so a future keychain/localStorage mismatch self-heals.
      await persistToken(stored);
      return stored;
    }
  }

  await clearAllStoredTokens();
  return null;
}

/** Warm the in-memory token cache as early as possible on app launch. */
export async function initStoredAuth(): Promise<boolean> {
  const token = await loadUsableStoredToken();
  return token !== null;
}

export async function getToken(): Promise<string | null> {
  return loadUsableStoredToken();
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

export function isTokenExpiredMessage(error: string | null): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return lower.includes("authentication") || lower.includes("unauthenticated") || lower.includes("401");
}

async function handleAuthCallback(url: string): Promise<void> {
  const ok = await completeAuthFromUrl(url);
  if (!ok) return;

  const main = getCurrentWindow();
  await main.show();
  await main.setFocus();
}

export async function initAuthDeepLinks(): Promise<void> {
  const current = (await getCurrent()) ?? [];
  for (const url of current) {
    if (url.includes("auth/callback")) {
      await handleAuthCallback(url);
    }
  }

  await onOpenUrl(async (urls) => {
    for (const url of urls) {
      if (url.includes("auth/callback")) {
        await handleAuthCallback(url);
      }
    }
  });
}

export function getArloWebUrl(): string {
  return import.meta.env.VITE_ARLO_WEB_URL || "https://arlo.jacobtartabini.com";
}

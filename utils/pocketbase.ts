import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "landnam_shared_pb_session";

const SHARED_PB_URL =
  process.env.EXPO_PUBLIC_SHARED_PB_URL ??
  process.env.NEXT_PUBLIC_SHARED_PB_URL ??
  process.env.SHARED_PB_URL ??
  "http://127.0.0.1:8090";

const LANDNAM_PB_URL =
  process.env.EXPO_PUBLIC_LANDNAM_PB_URL ??
  process.env.NEXT_PUBLIC_LANDNAM_PB_URL ??
  process.env.LANDNAM_PB_URL ??
  "http://127.0.0.1:8091";

export interface PocketBaseUser {
  id: string;
  email: string;
  isAnonymous?: boolean;
}

export interface PocketBaseSession {
  token: string;
  user: PocketBaseUser;
}

type AuthListener = (event: string, session: PocketBaseSession | null) => void;

const listeners = new Set<AuthListener>();

async function readSession(): Promise<PocketBaseSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PocketBaseSession;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

async function writeSession(session: PocketBaseSession | null): Promise<void> {
  if (session) {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  listeners.forEach((listener) => listener(session ? "SIGNED_IN" : "SIGNED_OUT", session));
}

async function requestSharedAuth(path: string, body?: unknown): Promise<any> {
  const response = await fetch(`${SHARED_PB_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "PocketBase authentication failed");
  }
  return payload;
}

function mapAuthPayload(payload: any): PocketBaseSession {
  const record = payload?.record ?? {};
  return {
    token: String(payload?.token ?? ""),
    user: {
      id: String(record.id ?? ""),
      email: String(record.email ?? ""),
      isAnonymous: false,
    },
  };
}

async function landnamRequest(path: string, init: RequestInit = {}): Promise<any> {
  const session = await readSession();
  if (!session?.token) {
    throw new Error("Sign in required");
  }

  const response = await fetch(`${LANDNAM_PB_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Landnam PocketBase request failed");
  }
  return payload;
}

export const pocketbase = {
  auth: {
    async getSession() {
      return { data: { session: await readSession() }, error: null };
    },
    async signUp({ email, password }: { email: string; password: string }) {
      try {
        await requestSharedAuth("/api/collections/users/records", {
          email,
          password,
          passwordConfirm: password,
        });
        const payload = await requestSharedAuth("/api/collections/users/auth-with-password", {
          identity: email,
          password,
        });
        const session = mapAuthPayload(payload);
        await writeSession(session);
        return { data: { session, user: session.user }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const payload = await requestSharedAuth("/api/collections/users/auth-with-password", {
          identity: email,
          password,
        });
        const session = mapAuthPayload(payload);
        await writeSession(session);
        return { data: { session, user: session.user }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    async signInAnonymously() {
      const session: PocketBaseSession = {
        token: "",
        user: {
          id: `local-guest-${Date.now()}`,
          email: "",
          isAnonymous: true,
        },
      };
      await writeSession(session);
      return { data: { session, user: session.user }, error: null };
    },
    async signOut() {
      await writeSession(null);
      return { error: null };
    },
    onAuthStateChange(callback: AuthListener) {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
            },
          },
        },
      };
    },
  },
};

export async function loadLandnamState(): Promise<any | null> {
  const payload = await landnamRequest("/api/landnam/state");
  return payload?.state?.game_state ?? null;
}

export async function saveLandnamState(gameState: unknown, saveVersion = 1): Promise<void> {
  await landnamRequest("/api/landnam/state", {
    method: "POST",
    body: JSON.stringify({
      save_version: saveVersion,
      game_state: gameState,
      client_updated_at: new Date().toISOString(),
    }),
  });
}

export async function createMissionLog(payload: {
  rocket_id?: string;
  target_id?: string;
  action: string;
  payout_francs?: number;
  cargo_secured?: Record<string, unknown>;
}): Promise<void> {
  await landnamRequest("/api/landnam/mission-logs", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      logged_at: new Date().toISOString(),
    }),
  });
}

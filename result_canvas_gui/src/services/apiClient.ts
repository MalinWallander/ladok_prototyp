export type ApiLogEntry = {
  id: number;
  time: string;
  method: string;
  url: string;
  status: number | null;
  requestBody?: unknown;
  response?: unknown;
};

type Listener = (entries: ApiLogEntry[]) => void;
let entries: ApiLogEntry[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

export function subscribeApiLog(fn: Listener) {
  listeners.add(fn);
  fn(entries);
  return () => {
    listeners.delete(fn);
  };
}
export function clearApiLog() {
  entries = [];
  listeners.forEach((l) => l(entries));
}
function log(e: Omit<ApiLogEntry, "id">) {
  entries = [{ ...e, id: nextId++ }, ...entries];
  listeners.forEach((l) => l(entries));
}

export function getConfig() {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = (import.meta.env["VITE_SUPABASE_ANON_KEY"] ??
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) as string | undefined;
  return { url, key };
}

export async function callApi<T = unknown>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const { url, key } = getConfig();
  if (!url || !key) throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY saknas");
  const full = `${url.replace(/\/$/, "")}/rest/v1${path}`;
  const time = new Date().toLocaleTimeString("sv-SE");
  let status: number | null = null;
  let response: unknown;
  try {
    const res = await fetch(full, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : null,
    });
    status = res.status;
    const text = await res.text();
    try {
      response = text ? JSON.parse(text) : null;
    } catch {
      response = text;
    }
    log({ time, method, url: full, status, requestBody: body, response });
    if (!res.ok) {
      const msg =
        (response as { message?: string })?.message ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return response as T;
  } catch (err) {
    if (status === null) {
      log({ time, method, url: full, status, requestBody: body, response: String(err) });
    }
    throw err;
  }
}

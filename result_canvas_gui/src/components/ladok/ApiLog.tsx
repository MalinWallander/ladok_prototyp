import { useEffect, useState } from "react";
import { subscribeApiLog, clearApiLog, type ApiLogEntry } from "@/services/apiClient";

export function ApiLog() {
  const [entries, setEntries] = useState<ApiLogEntry[]>([]);
  const [open, setOpen] = useState(true);
  useEffect(() => subscribeApiLog(setEntries), []);
  return (
    <section className="mt-8 rounded border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <button className="text-sm font-semibold" onClick={() => setOpen(!open)}>
          {open ? "▾" : "▸"} API-logg ({entries.length})
        </button>
        <button className="text-xs text-primary hover:underline" onClick={clearApiLog}>
          Rensa
        </button>
      </div>
      {open && (
        <div className="max-h-96 overflow-auto font-mono text-xs">
          {entries.length === 0 && <p className="p-4 text-muted-foreground">Inga anrop ännu.</p>}
          {entries.map((e) => (
            <details key={e.id} className="border-b px-4 py-2">
              <summary className="cursor-pointer">
                <span className="text-muted-foreground">{e.time}</span>{" "}
                <span className="font-semibold">{e.method}</span>{" "}
                <span className={e.status && e.status < 300 ? "text-success" : "text-destructive"}>
                  {e.status ?? "ERR"}
                </span>{" "}
                <span className="break-all">{e.url}</span>
              </summary>
              {e.requestBody !== undefined && (
                <pre className="mt-2 rounded bg-muted p-2 whitespace-pre-wrap">
                  Request: {JSON.stringify(e.requestBody, null, 2)}
                </pre>
              )}
              <pre className="mt-2 rounded bg-muted p-2 whitespace-pre-wrap">
                Response: {JSON.stringify(e.response, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

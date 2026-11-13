import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ApiLog } from "@/components/ladok/ApiLog";
import * as orch from "@/services/orchestrator";
import type { StudentRad, Betyg } from "@/services/orchestrator";
import type { Modul } from "@/services/epokService";
import type { RegPayload } from "@/services/ladokService";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resultat till Ladok – prototyp" },
      { name: "description", content: "Rapportera betyg från Canvas till Ladok via SOA-tjänster." },
      { property: "og:title", content: "Resultat till Ladok – prototyp" },
      { property: "og:description", content: "Rapportera betyg från Canvas till Ladok via SOA-tjänster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const sel = "h-9 rounded border border-input bg-card px-2 text-sm disabled:opacity-50";
const today = () => new Date().toISOString().slice(0, 10);

function Index() {
  const [view, setView] = useState<"start" | "urval">("start");
  return (
    <TooltipProvider>
      <div className="min-h-screen font-sans">
        <header className="bg-header text-header-foreground">
          <div className="mx-auto max-w-7xl px-6 py-3 text-lg font-semibold">
            Resultat till Ladok <span className="text-sm font-normal opacity-75">· Canvas</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">
          {view === "start" ? <Start onGo={() => setView("urval")} /> : <Urval onBack={() => setView("start")} />}
          <ApiLog />
        </main>
      </div>
    </TooltipProvider>
  );
}

function Start({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded border bg-card p-8">
      <h1 className="mb-6 text-xl font-semibold">Vad vill du rapportera?</h1>
      <div className="flex flex-wrap gap-4">
        <Button onClick={onGo}>Rapportera endast betyg</Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span><Button variant="outline" disabled>Rapportera betyg och/eller resultatnoteringar</Button></span>
          </TooltipTrigger>
          <TooltipContent>Utanför prototypens avgränsning</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function Urval({ onBack }: { onBack: () => void }) {
  const [kurser, setKurser] = useState<string[]>([]);
  const [uppgifter, setUppgifter] = useState<string[]>([]);
  const [moduler, setModuler] = useState<Modul[]>([]);
  const [kurs, setKurs] = useState("");
  const [uppgift, setUppgift] = useState("");
  const [modul, setModul] = useState("");
  const [rader, setRader] = useState<StudentRad[] | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [urvalKey, setUrvalKey] = useState({ kurs: "", modul: "", nr: 0 });

  useEffect(() => { orch.hamtaKurser().then(setKurser).catch((e) => setErr(e.message)); }, []);
  useEffect(() => {
    setUppgift(""); setModul(""); setUppgifter([]); setModuler([]);
    if (!kurs) return;
    orch.hamtaUppgifter(kurs).then(setUppgifter).catch((e) => setErr(e.message));
    orch.hamtaModuler(kurs).then(setModuler).catch((e) => setErr(e.message));
  }, [kurs]);

  const lista = async () => {
    setLoading(true); setErr("");
    try {
      setRader(await orch.listaStudenter(kurs, uppgift, modul));
      setUrvalKey((k) => ({ kurs, modul, nr: k.nr + 1 }));
    } catch (e) { setErr((e as Error).message); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <button className="text-sm text-primary hover:underline" onClick={onBack}>← Tillbaka</button>
      <div className="flex flex-wrap items-end gap-4 rounded border bg-card p-4">
        <Field label="Kurskod">
          <select className={sel} value={kurs} onChange={(e) => setKurs(e.target.value)}>
            <option value="">Välj kurs</option>
            {kurser.map((k) => <option key={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Uppgift i Canvas">
          <select className={sel} disabled={!kurs} value={uppgift} onChange={(e) => setUppgift(e.target.value)}>
            <option value="">Välj uppgift</option>
            {uppgifter.map((u) => <option key={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Modul i Ladok">
          <select className={sel} disabled={!kurs} value={modul} onChange={(e) => setModul(e.target.value)}>
            <option value="">Välj modul</option>
            {moduler.map((m) => (
              <option key={m.modulkod} value={m.modulkod}>{m.benamning} ({m.hp} hp {m.modulkod})</option>
            ))}
          </select>
        </Field>
        <Button disabled={!kurs || !uppgift || !modul || loading} onClick={lista}>
          {loading ? "Hämtar…" : "Lista studenter"}
        </Button>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {/* Ny nyckel vid varje listning nollställer markeringar och felmeddelanden */}
      {rader && <StudentLista key={urvalKey.nr} rader={rader} setRader={setRader} kurs={urvalKey.kurs} modul={urvalKey.modul} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">{label}{children}</label>;
}

function StudentLista({ rader, setRader, kurs, modul }: {
  rader: StudentRad[]; setRader: (r: StudentRad[]) => void; kurs: string; modul: string;
}) {
  const [markerade, setMarkerade] = useState<Set<string>>(new Set());
  const [massDatum, setMassDatum] = useState(today());
  const [atgard, setAtgard] = useState<RegPayload["p_status"]>("Utkast");
  const [fel, setFel] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<RegPayload[] | null>(null);
  const [busy, setBusy] = useState(false);

  const valbara = useMemo(() => rader.filter((r) => !r.last), [rader]);
  const toggle = (u: string) => {
    const s = new Set(markerade); s.has(u) ? s.delete(u) : s.add(u); setMarkerade(s);
  };
  const update = (u: string, patch: Partial<StudentRad>) =>
    setRader(rader.map((r) => (r.username === u ? { ...r, ...patch } : r)));

  const startOverfor = () => {
    const valda = rader.filter((r) => markerade.has(r.username));
    if (!valda.length) return;
    const f: Record<string, string> = {};
    valda.forEach((r) => { const v = orch.validera(r, today()); if (v) f[r.username] = v; });
    setFel(f);
    if (Object.keys(f).length) return;
    setConfirm(valda.map((r) => orch.byggPayload(r, kurs, modul, atgard)));
  };

  const kor = async () => {
    if (!confirm) return;
    setBusy(true);
    const svar = await orch.overfor(confirm);
    const byPnr = new Map(confirm.map((p, i) => [p.p_personnummer, svar[i]]));
    setRader(rader.map((r) => {
      const s = byPnr.get(r.personnummer);
      if (!s || !markerade.has(r.username)) return r;
      if (s.status === "registrerad") {
        const last = atgard === "Klarmarkerad";
        return { ...r, status: atgard, information: s.meddelande ?? "Registrerad i Ladok", infoFel: false, last };
      }
      return { ...r, information: s.meddelande ?? s.status, infoFel: true };
    }));
    setMarkerade(new Set()); setConfirm(null); setBusy(false);
  };

  return (
    <div className="rounded border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted px-4 py-3 text-sm">
        <span>Markera</span>
        <Button size="sm" variant="outline" onClick={() => setMarkerade(new Set(valbara.map((r) => r.username)))}>Alla</Button>
        <Button size="sm" variant="outline" onClick={() => setMarkerade(new Set(valbara.filter((r) => r.betyg).map((r) => r.username)))}>Betygsatta</Button>
        <Button size="sm" variant="outline" onClick={() => setMarkerade(new Set())}>Inga</Button>
        <span className="mx-1 h-6 w-px bg-border" />
        <span>Datum för markerade</span>
        <input type="date" className={sel} value={massDatum} onChange={(e) => setMassDatum(e.target.value)} />
        <Button size="sm" variant="outline" disabled={!markerade.size}
          onClick={() => setRader(rader.map((r) => markerade.has(r.username) ? { ...r, datum: massDatum } : r))}>
          Sätt datum
        </Button>
        <span className="mx-1 h-6 w-px bg-border" />
        <select className={sel} value={atgard} onChange={(e) => setAtgard(e.target.value as RegPayload["p_status"])}>
          <option value="Utkast">Spara som utkast</option>
          <option value="Klarmarkerad">Klarmarkera</option>
        </select>
        <Button size="sm" disabled={!markerade.size} onClick={startOverfor}>Överför</Button>
        <span className="ml-auto font-medium">Antal markerade: {markerade.size}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-2" />
              <th className="px-2 py-2">Namn</th>
              <th className="px-2 py-2">Omdöme i Canvas</th>
              <th className="px-2 py-2">Betyg i Ladok</th>
              <th className="px-2 py-2">Examinationsdatum</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Information</th>
            </tr>
          </thead>
          <tbody>
            {rader.length === 0 && <tr><td colSpan={7} className="p-4 text-muted-foreground">Inga studenter.</td></tr>}
            {rader.map((r) => {
              const f = fel[r.username];
              return (
                <tr key={r.username} className={`border-b ${r.last ? "bg-muted text-muted-foreground" : ""} ${f ? "bg-destructive/5" : ""}`}>
                  <td className="px-4 py-2">
                    <input type="checkbox" disabled={r.last} checked={markerade.has(r.username)} onChange={() => toggle(r.username)} />
                  </td>
                  <td className="px-2 py-2">
                    <Tooltip>
                      <TooltipTrigger className="cursor-help underline decoration-dotted">
                        {r.efternamn ? `${r.efternamn}, ${r.fornamn}` : r.fornamn}
                      </TooltipTrigger>
                      <TooltipContent>{r.personnummer || "Personnummer saknas"}</TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-2 py-2">{r.canvasOmdome || "–"}</td>
                  <td className="px-2 py-2">
                    <select className={sel} disabled={r.last} value={r.betyg}
                      onChange={(e) => update(r.username, { betyg: e.target.value as Betyg })}>
                      <option value="">–</option><option>U</option><option>G</option><option>VG</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input type="date" className={sel} disabled={r.last} value={r.datum} max={today()}
                      onChange={(e) => update(r.username, { datum: e.target.value })} />
                  </td>
                  <td className="px-2 py-2">{r.status}</td>
                  <td className={`px-2 py-2 ${f || r.infoFel ? "text-destructive" : ""}`}>{f ?? r.information}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Dialog open={!!confirm} onOpenChange={(o) => !o && !busy && setConfirm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Överför resultat till Ladok</DialogTitle></DialogHeader>
          <p className="text-sm">
            {confirm?.length} student(er) · Åtgärd: <strong>{atgard === "Utkast" ? "Spara som utkast" : "Klarmarkera"}</strong>
          </p>
          <pre className="max-h-80 overflow-auto rounded bg-muted p-3 font-mono text-xs">{JSON.stringify(confirm, null, 2)}</pre>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Avbryt</Button>
            <Button disabled={busy} onClick={kor}>{busy ? "Överför…" : "Överför"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

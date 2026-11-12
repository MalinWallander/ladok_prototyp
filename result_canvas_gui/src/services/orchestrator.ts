// reg_Student_Resultat – Canvas orkestrering. Komponenter anropar endast denna fil.
import * as canvas from "./canvasService";
import * as epok from "./epokService";
import * as its from "./studentItsService";
import * as ladok from "./ladokService";

export type Betyg = "" | "U" | "G" | "VG";
export type StudentRad = {
  username: string;
  personnummer: string;
  fornamn: string;
  efternamn: string;
  canvasOmdome: string;
  betyg: Betyg;
  datum: string;
  status: string;
  information: string;
  infoFel: boolean;
  last: boolean;
};

export const hamtaKurser = canvas.getKurser;
export const hamtaUppgifter = canvas.getUppgifter;
export const hamtaModuler = epok.getModul;

const giltigt = (g?: string | null): Betyg =>
  g === "U" || g === "G" || g === "VG" ? g : "";

export async function listaStudenter(kurskod: string, uppgift: string, modul: string) {
  const omdomen = await canvas.getOmdomen(kurskod, uppgift);
  const personer = await Promise.all(
    omdomen.map((o) => its.getPersnummer(o.student_username).catch(() => null)),
  );
  const resultat = await ladok.getResultat(kurskod, modul).catch(() => []);
  const rader: StudentRad[] = omdomen.map((o, i) => {
    const p = personer[i];
    const pnr = p?.personnummer ?? "";
    const r = resultat.find((x) => x.personnummer === pnr);
    const status = r?.status ?? "";
    const last = status === "Klarmarkerad" || status === "Attesterad";
    const fromLadok = status === "Utkast" || last;
    return {
      username: o.student_username,
      personnummer: pnr,
      fornamn: p?.fornamn ?? o.student_username,
      efternamn: p?.efternamn ?? "",
      canvasOmdome: o.grade ?? "",
      betyg: fromLadok ? giltigt(r?.betyg) || giltigt(o.grade) : giltigt(o.grade),
      datum: fromLadok && r?.datum ? r.datum.slice(0, 10) : "",
      status: status || "Ej rapporterad",
      information: p ? "" : "Personnummer saknas i StudentITS",
      infoFel: !p,
      last,
    };
  });
  return rader.sort((a, b) => a.efternamn.localeCompare(b.efternamn, "sv"));
}

export function byggPayload(
  rad: StudentRad,
  kurskod: string,
  modul: string,
  atgard: ladok.RegPayload["p_status"],
): ladok.RegPayload {
  return {
    p_personnummer: rad.personnummer,
    p_kurskod: kurskod,
    p_modul: modul,
    p_datum: rad.datum,
    p_betyg: rad.betyg as "U" | "G" | "VG",
    p_status: atgard,
  };
}

export function validera(rad: StudentRad, idag: string): string | null {
  if (!rad.personnummer) return "Personnummer saknas";
  if (!rad.betyg) return "Betyg saknas";
  if (!rad.datum) return "Datum saknas";
  if (rad.datum > idag) return "Datum får inte vara i framtiden";
  return null;
}

export async function overfor(payloads: ladok.RegPayload[]) {
  const svar: ladok.RegSvar[] = [];
  for (const p of payloads) {
    try {
      svar.push(await ladok.regResultat(p));
    } catch (e) {
      svar.push({ status: "fel", meddelande: (e as Error).message });
    }
  }
  return svar;
}

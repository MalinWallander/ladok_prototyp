import { callApi } from "./apiClient";
export type LadokResultat = { personnummer: string; datum: string | null; betyg: string | null; status: string };
export type RegPayload = {
  p_personnummer: string;
  p_kurskod: string;
  p_modul: string;
  p_datum: string;
  p_betyg: "U" | "G" | "VG";
  p_status: "Utkast" | "Klarmarkerad";
};
export type RegSvar = { status: "registrerad" | "hinder" | "fel"; meddelande?: string };
export const getResultat = (kurskod: string, modul: string) =>
  callApi<LadokResultat[]>(
    "GET",
    `/rpc/get_resultat?p_kurskod=${encodeURIComponent(kurskod)}&p_modul=${encodeURIComponent(modul)}`,
  );
export const regResultat = (p: RegPayload) => callApi<RegSvar>("POST", "/rpc/reg_resultat", p);

import { callApi } from "./apiClient";
export type Modul = { modulkod: string; benamning: string; hp: number };
export const getModul = (kurskod: string) =>
  callApi<Modul[]>("GET", `/rpc/get_modul?p_kurskod=${encodeURIComponent(kurskod)}`);

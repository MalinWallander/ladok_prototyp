import { callApi } from "./apiClient";
export type Person = {
  student_username: string;
  personnummer: string;
  fornamn: string;
  efternamn: string;
};
export async function getPersnummer(username: string): Promise<Person | null> {
  const r = await callApi<Person[]>(
    "GET",
    `/rpc/get_persnummer?p_username=${encodeURIComponent(username)}`,
  );
  return r?.[0] ?? null;
}

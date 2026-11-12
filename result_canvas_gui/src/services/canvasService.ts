import { callApi } from "./apiClient";
export type Submission = {
  student_username: string;
  course_code: string;
  assignment_name: string;
  grade: string | null;
  submission_date: string | null;
};
const uniq = (a: string[]) => [...new Set(a)].sort();
const e = encodeURIComponent;
export async function getKurser() {
  const r = await callApi<{ course_code: string }[]>("GET", `/canvas_submissions?select=course_code`);
  return uniq(r.map((x) => x.course_code));
}
export async function getUppgifter(kurskod: string) {
  const r = await callApi<{ assignment_name: string }[]>(
    "GET",
    `/canvas_submissions?course_code=eq.${e(kurskod)}&select=assignment_name`,
  );
  return uniq(r.map((x) => x.assignment_name));
}
export const getOmdomen = (kurskod: string, uppgift: string) =>
  callApi<Submission[]>(
    "GET",
    `/canvas_submissions?course_code=eq.${e(kurskod)}&assignment_name=eq.${e(uppgift)}`,
  );

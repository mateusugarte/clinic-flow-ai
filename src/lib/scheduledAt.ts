import { extractDateTimeFromISO, extractTimeFromISO } from "@/lib/dateUtils";

/**
 * The database stores timestamps like "2026-01-20 18:00:00+00".
 * Even though it's marked +00, in this project it represents *local* clinic time.
 *
 * Rules:
 * - Never use `new Date(scheduled_at)` for display/logic (it will shift 3 hours)
 * - Use string extraction (dateUtils) for all comparisons
 * - When writing scheduled_at, send an explicit "+00" timestamp string
 */

export function toStoredScheduledAt(date: string, time: string): string {
  // Matches the DB style: "YYYY-MM-DD HH:mm:00+00"
  return `${date} ${time}:00+00`;
}

export function getScheduledDateKey(scheduledAt: string | null | undefined): string {
  return extractDateTimeFromISO(scheduledAt).date;
}

export function getScheduledTimeKey(scheduledAt: string | null | undefined): string {
  return extractTimeFromISO(scheduledAt);
}

export function formatDateKeyBR(dateKey: string): string {
  if (!dateKey) return "N/A";
  const [y, m, d] = dateKey.split("-");
  if (!y || !m || !d) return "N/A";
  return `${d}/${m}/${y}`;
}

export function dateKeyToLocalDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function compareScheduledAt(a: string, b: string): number {
  const aDT = extractDateTimeFromISO(a);
  const bDT = extractDateTimeFromISO(b);
  const aKey = `${aDT.date}T${aDT.time}`;
  const bKey = `${bDT.date}T${bDT.time}`;
  return aKey.localeCompare(bKey);
}

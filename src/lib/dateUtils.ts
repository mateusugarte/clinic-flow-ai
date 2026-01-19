/**
 * Utility functions for handling ISO date/time strings without timezone conversion.
 * 
 * The database stores times like "2026-01-19 09:00:00+00" which represent
 * local São Paulo time but are incorrectly marked as UTC. These functions
 * extract the time directly from the string to avoid JavaScript's automatic
 * timezone conversion.
 */

/**
 * Extracts hours and minutes directly from an ISO string without timezone conversion.
 * @param isoString - ISO date string (e.g., "2026-01-19 09:00:00+00" or "2026-01-19T09:00:00.000Z")
 * @returns Formatted time string (e.g., "09:00")
 */
export function extractTimeFromISO(isoString: string | null | undefined): string {
  if (!isoString) return "00:00";
  
  // Match time pattern HH:MM from the ISO string
  const timeMatch = isoString.match(/(\d{2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}`;
  }
  return "00:00";
}

/**
 * Extracts date and time separately from an ISO string without timezone conversion.
 * @param isoString - ISO date string
 * @returns Object with date (YYYY-MM-DD) and time (HH:MM)
 */
export function extractDateTimeFromISO(isoString: string | null | undefined): { date: string; time: string } {
  if (!isoString) return { date: "", time: "00:00" };
  
  const dateMatch = isoString.match(/(\d{4}-\d{2}-\d{2})/);
  const timeMatch = isoString.match(/(\d{2}):(\d{2})/);
  
  return {
    date: dateMatch ? dateMatch[1] : "",
    time: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : "00:00"
  };
}

/**
 * Extracts the hour as a number from an ISO string without timezone conversion.
 * Useful for comparing against opening hours.
 * @param isoString - ISO date string
 * @returns Hour as number (0-23)
 */
export function extractHourFromISO(isoString: string | null | undefined): number {
  if (!isoString) return 0;
  
  const timeMatch = isoString.match(/(\d{2}):(\d{2})/);
  if (timeMatch) {
    return parseInt(timeMatch[1], 10);
  }
  return 0;
}

/**
 * Formats an ISO string to a localized date/time display without timezone conversion.
 * @param isoString - ISO date string
 * @param includeTime - Whether to include time in the output
 * @returns Formatted string (e.g., "19/01/2026 09:00" or "19/01/2026")
 */
export function formatISOToDisplay(isoString: string | null | undefined, includeTime: boolean = true): string {
  if (!isoString) return "N/A";
  
  const { date, time } = extractDateTimeFromISO(isoString);
  if (!date) return "N/A";
  
  // Parse date parts
  const [year, month, day] = date.split("-");
  const formattedDate = `${day}/${month}/${year}`;
  
  return includeTime ? `${formattedDate} ${time}` : formattedDate;
}

/**
 * Formats an ISO string to a short date/time display (dd/MM HH:mm).
 * @param isoString - ISO date string
 * @returns Formatted string (e.g., "19/01 09:00")
 */
export function formatISOToShortDisplay(isoString: string | null | undefined): string {
  if (!isoString) return "N/A";
  
  const { date, time } = extractDateTimeFromISO(isoString);
  if (!date) return "N/A";
  
  const [, month, day] = date.split("-");
  return `${day}/${month} ${time}`;
}

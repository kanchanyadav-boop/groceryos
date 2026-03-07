// admin/src/lib/utils.ts
import { format } from "date-fns";

/**
 * Recursively removes undefined, null, and empty string properties from an object.
 * This is essential for Firestore operations as it does not support 'undefined'.
 * enterprise-grade: handles nested objects and arrays correctly.
 */
export function cleanFirestoreData(obj: any): any {
    if (obj === null || obj === undefined) return undefined;
    if (typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(v => cleanFirestoreData(v)).filter(v => v !== undefined);

    // Firestore types that should not be traversed
    if (obj instanceof Date) return obj;
    if (obj.constructor?.name === "FieldValue") return obj; // Handle serverTimestamp() etc.
    if (obj.constructor?.name === "GeoPoint") return obj;

    const result: any = {};
    Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const cleaned = cleanFirestoreData(value);

        // Omit 'undefined', 'null', or empty strings
        if (cleaned === undefined || cleaned === null) return;
        if (typeof cleaned === "string" && cleaned.trim() === "") return;

        // Omit empty nested objects
        if (typeof cleaned === "object" && Object.keys(cleaned).length === 0 && !(cleaned instanceof Date)) return;

        result[key] = cleaned;
    });

    return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Converts a Firestore Timestamp, ISO string, number, or Date to a JS Date.
 * Firestore Timestamp objects have a .toDate() method — using new Date(timestamp)
 * directly fails because Timestamp.valueOf() returns a string, not a number.
 */
export function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate(); // Firestore Timestamp
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Safely formats a Firestore Timestamp/ISO-string/Date using date-fns format.
 * Returns `fallback` (default "—") when the value is null, undefined, a pending
 * serverTimestamp() sentinel, or otherwise un-parseable.
 */
export function fmtDate(value: any, fmt: string, fallback = "—"): string {
  const d = toDate(value);
  if (!d) return fallback;
  try {
    return format(d, fmt);
  } catch {
    return fallback;
  }
}

/**
 * Formats a currency value to INR locale.
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(amount);
}

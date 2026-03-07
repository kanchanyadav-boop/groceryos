// admin/src/lib/errors.ts
// Converts raw Firebase/Firestore/CF errors into friendly, actionable messages
// suitable for display to staff in the admin console.

export function friendlyError(err: any, fallback = "Something went wrong. Please try again."): string {
  const code: string = err?.code || err?.details?.code || "";
  const msg: string = (err?.message || "").toLowerCase();

  if (code.includes("permission-denied") || msg.includes("permission"))
    return "You don't have permission to perform this action.";
  if (code.includes("unauthenticated"))
    return "Your session has expired. Please sign in again.";
  if (code.includes("not-found"))
    return "The item you're looking for no longer exists.";
  if (code.includes("already-exists"))
    return "A record with these details already exists.";
  if (code.includes("resource-exhausted") || code.includes("quota"))
    return "Too many requests. Please wait a moment and try again.";
  if (code.includes("unavailable") || msg.includes("network") || msg.includes("offline"))
    return "Network error. Please check your connection and try again.";
  if (code.includes("aborted"))
    return err?.message || fallback; // CF errors use aborted and have friendly messages
  if (code.includes("invalid-argument"))
    return err?.message || "Invalid input — please review the form and try again.";

  // Cloud Function errors carry a human-readable message — use it directly
  if (err?.message && !err.message.startsWith("Firebase") && !err.message.includes("[")) {
    return err.message;
  }

  return fallback;
}

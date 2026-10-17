/**
 * Removes all undefined values and keys from a payload.
 */
export function cleanPayload(payload: unknown) {
  if (payload == null) {
    return "";
  }

  const cleanedPayload: Record<string, string> = {};

  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanedPayload[key] = String(value);
    }
  });

  return new URLSearchParams(cleanedPayload).toString();
}

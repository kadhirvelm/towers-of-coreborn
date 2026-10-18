/**
 * Copies text to the clipboard.
 * @param text - Text to copy
 * @returns Whether the browser accepted the write
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

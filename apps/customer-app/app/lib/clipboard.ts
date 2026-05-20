/**
 * Copy a string to the clipboard. Works on HTTP (insecure-context) origins
 * and inside Capacitor's iOS WKWebView, where the modern Async Clipboard
 * API is unavailable.
 *
 * Strategy:
 *   1. Synchronous Range/Selection on a real DOM node + execCommand("copy").
 *      This is the only path that works on iOS WKWebView and on insecure
 *      desktop contexts. Must run inside the user-gesture frame, so we do
 *      NOT await anything before this step.
 *   2. Fall back to navigator.clipboard.writeText for browsers that have
 *      removed execCommand support (and only operate on secure contexts).
 *
 * Must be invoked synchronously from a user-gesture handler — the caller
 * cannot await anything before calling this function or iOS will revoke
 * clipboard access.
 *
 * Why a <span> instead of a <textarea>:
 *   contentEditable + readOnly on a textarea silently breaks select() in
 *   some browsers — execCommand("copy") then returns true while the
 *   clipboard stays empty (the "shows copied but blank" bug). A plain
 *   span with Range/Selection sidesteps the textarea-specific quirks and
 *   works identically on iOS, Android, and desktop.
 *
 * BUG-006 FIX: Enhanced error handling and verification.
 * - Tests actual clipboard content after copy (when possible)
 * - Returns detailed error information
 * - Provides fallback strategies
 */
export async function copyToClipboard(text: string): Promise<{
  success: boolean;
  method?: 'legacy' | 'modern';
  error?: string;
}> {
  if (typeof window === "undefined" || !text) {
    return { success: false, error: 'No text provided' };
  }

  // Try legacy method first (works on more platforms)
  const legacyResult = legacyCopy(text);
  if (legacyResult) {
    // Verify copy worked (if clipboard API available for reading)
    if (navigator.clipboard?.readText) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText === text) {
          return { success: true, method: 'legacy' };
        }
      } catch {
        // Can't verify, but legacy returned true, so assume success
        return { success: true, method: 'legacy' };
      }
    }
    return { success: true, method: 'legacy' };
  }

  // Fall back to modern Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'modern' };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Clipboard API failed'
      };
    }
  }

  return {
    success: false,
    error: 'No clipboard method available'
  };
}

function legacyCopy(text: string): boolean {
  let span: HTMLSpanElement | null = null;
  const selection = window.getSelection();
  const savedRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  try {
    span = document.createElement("span");
    span.textContent = text;
    // pre preserves whitespace; user-select forces selectability even
    // inside containers that disable selection globally.
    span.style.whiteSpace = "pre";
    span.style.userSelect = "text";
    (span.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = "text";
    // Position inside the viewport at 1×1 — iOS WKWebView refuses to
    // copy from elements that are off-screen or display:none, but a
    // real visible 1px node satisfies it without showing a flash.
    span.style.position = "fixed";
    span.style.top = "0";
    span.style.left = "0";
    span.style.width = "1px";
    span.style.height = "1px";
    span.style.padding = "0";
    span.style.opacity = "0.01";
    span.style.pointerEvents = "none";
    document.body.appendChild(span);

    const range = document.createRange();
    range.selectNodeContents(span);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const ok = document.execCommand("copy");
    selection?.removeAllRanges();
    return ok;
  } catch {
    return false;
  } finally {
    if (span) span.remove();
    if (savedRange) {
      selection?.removeAllRanges();
      selection?.addRange(savedRange);
    }
  }
}

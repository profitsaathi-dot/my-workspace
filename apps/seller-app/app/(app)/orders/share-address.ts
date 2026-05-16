import type { Order } from "@/src/types/order";

/** Format a single order's recipient info as a shareable text block. */
export function buildAddressText(order: {
  orderNo?: string | null;
  customerName?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
}): string {
  const lines: string[] = [];
  const orderNo = (order.orderNo ?? "").trim();
  if (orderNo) lines.push(`Order ${orderNo}`);
  const name = (order.customerName ?? "").trim();
  if (name) lines.push(name);
  const addr = (order.address ?? "").trim();
  if (addr) lines.push(addr);
  const phone = (order.phoneNumber ?? "").trim();
  if (phone) lines.push(`Phone: ${phone}`);
  return lines.join("\n");
}

/** Combine multiple orders into one shareable text with --- separators. */
export function buildBulkAddressText(orders: readonly Order[]): string {
  return orders.map(buildAddressText).filter(Boolean).join("\n\n---\n\n");
}

/** wa.me opens WhatsApp on phones and WhatsApp Web on desktop with the
 *  text pre-filled. User picks the contact themselves — never invent a
 *  recipient number, since the seller may want to send to anyone. */
export function openWhatsAppShare(text: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** mailto: opens the user's default mail client. Works everywhere. */
export function openEmailShare(text: string, subject = "Shipping address"): void {
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  window.location.href = href;
}

/** Web Share API — native share sheet on mobile (WhatsApp / Mail /
 *  Messages / etc.). Returns false if unsupported or the user cancelled,
 *  so callers can fall back to manual channel buttons. */
export async function tryNativeShare(text: string, title = "Shipping address"): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share({ text, title });
    return true;
  } catch {
    return false;
  }
}

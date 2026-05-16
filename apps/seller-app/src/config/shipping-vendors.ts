/**
 * Shipping vendors a seller can pick when an order ships.
 *
 * The list is the major carriers operating in India. The `code` is what we
 * persist in `orders.shipping_vendor` — keep it stable. The `label` is what
 * the dropdown shows. Add new vendors at the end so existing rows don't have
 * to be backfilled.
 *
 * Sellers who use a carrier we don't list pick "Other" and type the name —
 * the server treats vendor as a free-form string up to 64 chars.
 */
export interface ShippingVendor {
  code: string;
  label: string;
}

export const SHIPPING_VENDORS: ShippingVendor[] = [
  { code: "INDIA_POST", label: "India Post" },
  { code: "BLUE_DART", label: "Blue Dart" },
  { code: "DTDC", label: "DTDC" },
  { code: "DELHIVERY", label: "Delhivery" },
  { code: "DHL", label: "DHL" },
  { code: "FEDEX", label: "FedEx" },
  { code: "ARAMEX", label: "Aramex" },
  { code: "EKART", label: "Ekart" },
  { code: "ECOM_EXPRESS", label: "Ecom Express" },
  { code: "XPRESSBEES", label: "Xpressbees" },
  { code: "GATI", label: "Gati" },
  { code: "SHIPROCKET", label: "Shiprocket" },
  { code: "PROFESSIONAL_COURIERS", label: "The Professional Couriers" },
  { code: "TRACKON", label: "Trackon" },
  { code: "SHADOWFAX", label: "Shadowfax" },
  { code: "OTHER", label: "Other" },
];

const VENDOR_BY_CODE = new Map(SHIPPING_VENDORS.map((v) => [v.code, v]));

/** Resolve a stored code (or arbitrary string) to a label for display. */
export function shippingVendorLabel(code: string | null | undefined): string {
  if (!code) return "—";
  return VENDOR_BY_CODE.get(code)?.label ?? code;
}

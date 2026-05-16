import { NextRequest, NextResponse } from "next/server";

/**
 * Public store-info proxy.
 *
 * Returns a small `{ name, whatsapp, email? }` payload describing the seller
 * behind a given store token, so the customer-app UI (e.g. the order-success
 * page) can offer "track on WhatsApp" without exposing the full backend.
 *
 * It tries a dedicated backend endpoint first, then falls back to the
 * existing public-products endpoint and pulls any seller / store fields it
 * can find. Either route works as long as the response contains a phone /
 * WhatsApp value somewhere — the parsing is intentionally forgiving so the
 * exact backend shape isn't a hard dependency.
 */

interface StoreInfo {
  name: string | null;
  whatsapp: string | null;
  email: string | null;
  paymentType: string | null;
  paymentQRCode: string | null;
  bankAccountNumber: string | null;
  bankAccountIfsc: string | null;
  sellerType: string | null;
}

const PHONE_KEYS = [
  "whatsapp",
  "whatsappNumber",
  "whatsAppNumber",
  "phone",
  "phoneNumber",
  "contactNumber",
  "mobile",
  "mobileNumber",
];

const NAME_KEYS = ["storeName", "shopName", "name", "businessName"];

const EMAIL_KEYS = ["email", "contactEmail"];

const findFirst = (obj: any, keys: string[]): string | null => {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
};

const PAYMENT_TYPE_KEYS = ["paymentType"];
const PAYMENT_QR_KEYS = ["paymentQRCode", "paymentQrCode"];
const BANK_ACCOUNT_KEYS = ["bankAccountNumber"];
const BANK_IFSC_KEYS = ["bankAccountIfsc"];
// "type" alone is too ambiguous (matches paymentType-style fields elsewhere
// in the response); stick to keys that explicitly say "seller".
const SELLER_TYPE_KEYS = ["sellerType", "seller_type"];

const sniffStoreInfo = (raw: any): StoreInfo => {
  // Try a few common nesting patterns: top-level, owner, seller, user, store.
  const nests = [raw, raw?.owner, raw?.seller, raw?.user, raw?.store];

  let whatsapp: string | null = null;
  let name: string | null = null;
  let email: string | null = null;
  let paymentType: string | null = null;
  let paymentQRCode: string | null = null;
  let bankAccountNumber: string | null = null;
  let bankAccountIfsc: string | null = null;
  let sellerType: string | null = null;

  for (const node of nests) {
    if (!whatsapp) whatsapp = findFirst(node, PHONE_KEYS);
    if (!name) name = findFirst(node, NAME_KEYS);
    if (!email) email = findFirst(node, EMAIL_KEYS);
    if (!paymentType) paymentType = findFirst(node, PAYMENT_TYPE_KEYS);
    if (!paymentQRCode) paymentQRCode = findFirst(node, PAYMENT_QR_KEYS);
    if (!bankAccountNumber) bankAccountNumber = findFirst(node, BANK_ACCOUNT_KEYS);
    if (!bankAccountIfsc) bankAccountIfsc = findFirst(node, BANK_IFSC_KEYS);
    if (!sellerType) sellerType = findFirst(node, SELLER_TYPE_KEYS);
    if (whatsapp && name && paymentType && sellerType) break;
  }

  // If the backend returned an array of products, peek at the first one.
  if (!whatsapp && Array.isArray(raw) && raw.length > 0) {
    return sniffStoreInfo(raw[0]);
  }
  if (!whatsapp && Array.isArray(raw?.data)) {
    return sniffStoreInfo(raw.data[0]);
  }
  if (!whatsapp && Array.isArray(raw?.products)) {
    return sniffStoreInfo(raw.products[0]);
  }

  return {
    name,
    whatsapp,
    email,
    paymentType,
    paymentQRCode,
    bankAccountNumber,
    bankAccountIfsc,
    sellerType,
  };
};

const callBackend = async (path: string) => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  // Try the dedicated endpoint first, then fall back to scraping
  // public-products for embedded seller info.
  const candidates = [
    `/api/v1/store/info?token=${encodeURIComponent(token)}`,
    `/api/v1/store/public?token=${encodeURIComponent(token)}`,
    `/api/v1/products/user/public-products?token=${encodeURIComponent(token)}`,
  ];

  for (const path of candidates) {
    const data = await callBackend(path);
    if (!data) continue;
    const info = sniffStoreInfo(data);
    if (info.whatsapp || info.paymentType || info.sellerType) {
      return NextResponse.json(info);
    }
  }

  return NextResponse.json(
    {
      name: null,
      whatsapp: null,
      email: null,
      paymentType: null,
      paymentQRCode: null,
      bankAccountNumber: null,
      bankAccountIfsc: null,
      sellerType: null,
    },
    { status: 200 }
  );
}

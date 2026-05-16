import { NextRequest, NextResponse } from "next/server";

/**
 * Forwards a payment-proof screenshot to the Spring backend's
 * /api/v1/payment/upload endpoint and returns the saved file URL.
 *
 * Used after a buyer pays via UPI QR or bank transfer — the customer-app
 * uploads a screenshot here so the seller can verify the transfer.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const orderId = formData.get("orderId");
    const paymentType = formData.get("paymentType");
    const amount = formData.get("amount");

    if (!file || typeof file === "string") {
      return NextResponse.json({ message: "file is required" }, { status: 400 });
    }

    const upstream = new FormData();
    upstream.append("file", file);

    const qs = new URLSearchParams();
    if (orderId) qs.set("orderId", String(orderId));
    if (paymentType) qs.set("paymentType", String(paymentType));
    if (amount) qs.set("amount", String(amount));
    const query = qs.toString();
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment/upload${
      query ? `?${query}` : ""
    }`;

    const res = await fetch(url, {
      method: "POST",
      body: upstream,
    });

    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // backend returned non-JSON — keep raw text
    }

    if (!res.ok) {
      return NextResponse.json(
        { message: typeof data === "string" ? data : "Upload failed", data },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Payment-proof upload error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

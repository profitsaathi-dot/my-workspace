import { NextRequest } from "next/server";

/**
 * Streams the seller's uploaded UPI QR image (as identified by the public
 * store token) so the customer-app can render the seller's own QR at
 * checkout. Backed by GET /api/v1/store/payment-qr on Spring.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new Response("token is required", { status: 400 });
  }

  const upstream = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/store/payment-qr?token=${encodeURIComponent(
      token
    )}`,
    { cache: "no-store" }
  );

  if (!upstream.ok) {
    return new Response("QR not found", { status: upstream.status });
  }

  const buffer = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("Content-Type") || "image/png";
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": buffer.byteLength.toString(),
      "Cache-Control": "no-store",
    },
  });
}

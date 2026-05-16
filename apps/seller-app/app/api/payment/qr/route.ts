import type { NextRequest } from "next/server";
import { paymentService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const amount = req.nextUrl.searchParams.get("amount");
    if (!amount) throw new BadRequestError("Amount required");

    const upstream = await paymentService.qrStream(amount);
    if (!upstream.ok) {
      return new Response("Failed to fetch QR", { status: upstream.status });
    }
    const buffer = await upstream.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return toApiResponse(err);
  }
}

import type { NextRequest } from "next/server";
import { productService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const index = req.nextUrl.searchParams.get("index") ?? "0";
    if (!id) throw new BadRequestError("Product ID required");

    // Fetch from Java Backend
    const upstream = await productService.imageStream(id, index);
    
    if (!upstream.ok) {
      return new Response("Failed to fetch media", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.byteLength.toString(),
        // Videos benefit from public caching, but max-age depends on your needs
        "Cache-Control": "public, max-age=3600", 
      },
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
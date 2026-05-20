import type { NextRequest } from "next/server";
import { productService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

async function forwardMultipart(req: NextRequest, method: "POST" | "PUT") {
  try {
    const incoming = await req.formData();
    const out = new FormData();

    // 1. Handle the encrypted JSON payload
    const requestValue = incoming.get("request");
    if (!requestValue) throw new BadRequestError("Missing 'request' parameter");
    out.append("request", requestValue.toString());

    // 2. Handle the Main Image Index (Important for the backend to know which is the thumbnail)
    const mainIndex = incoming.get("mainImageIndex");
    if (mainIndex) {
      out.append("mainImageIndex", mainIndex.toString());
    }

    // 3. Handle keepIndices for updates (which existing media to keep)
    const keepIndices = incoming.get("keepIndices");
    if (keepIndices) {
      out.append("keepIndices", keepIndices.toString());
    }

    // 4. Handle Media (Images and Videos)
    // We loop through "media" because that's what your frontend now uses
    for (const file of incoming.getAll("media")) {
      if (file instanceof File) {
        out.append("media", file, file.name);
      }
    }

    // 5. Backward Compatibility (Optional)
    // If you still have parts of the app sending "image", keep this loop
    for (const img of incoming.getAll("image")) {
      if (img instanceof File) {
        out.append("image", img, img.name);
      }
    }

    const upstream = await productService.upsertMultipart(req, method, out);
    const contentType = upstream.headers.get("content-type") ?? "";
    
    if (contentType.includes("application/json")) {
      const json = await upstream.json();
      return Response.json(json, { status: upstream.status });
    }
    
    const text = await upstream.text();
    return new Response(text, { status: upstream.status });
  } catch (err) {
    return toApiResponse(err);
  }
}

export const POST = (req: NextRequest) => forwardMultipart(req, "POST");
export const PUT = (req: NextRequest) => forwardMultipart(req, "PUT");
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index } = await params;

  try {
    const apiEndpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}/image?index=${index}`;

    const res = await fetch(apiEndpoint);

    if (!res.ok) {
      return new Response("Media not found", { status: 404 });
    }

    // 1. Get the actual content type from the source (image/jpeg, video/mp4, etc.)
    const contentType = res.headers.get("Content-Type") || "application/octet-stream";
    
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        // 2. Proxy the correct content type so the browser knows how to render it
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new Response("Error loading media", { status: 500 });
  }
}
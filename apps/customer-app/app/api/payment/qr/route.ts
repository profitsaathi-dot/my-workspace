import { NextRequest } from "next/server";


export async function GET(req: NextRequest) {
  

  const amount = req.nextUrl.searchParams.get("amount") || "0"; // default to 0

  if (!amount) {
    return new Response("Product amount required", { status: 400 });
  }

  // ✅ Fetch image from backend with index
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment/qr?amount=${amount}`,
    {
      
    }
  );

  if (!response.ok) {
    return new Response("Failed to fetch image", { status: 500 });
  }

  // ✅ Convert to ArrayBuffer to handle binary data
  const buffer = await response.arrayBuffer();

  // ✅ Set correct content type (assume JPEG, change if needed)
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": buffer.byteLength.toString(),
    },
  });
}
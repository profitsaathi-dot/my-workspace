import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  
  
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return new Response("Product ID required", { status: 400 });
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/offers/product/${id}`,
    {
      headers: {
      },
    }
  );

  if (!response.ok) {
    return new Response("Failed to fetch offers", { status: 500 });
  }

  const data = await response.json();

  return Response.json(data);
}
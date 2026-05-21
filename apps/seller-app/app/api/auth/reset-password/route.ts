import { NextRequest, NextResponse } from "next/server";
import { encryptAES } from "@/src/lib/crypto/aes";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9097";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Encrypt the payload server-side before sending to backend
    const encrypted = await encryptAES(JSON.stringify(body));

    const response = await fetch(`${BACKEND_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ request: encrypted }),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process request" },
      { status: 500 }
    );
  }
}

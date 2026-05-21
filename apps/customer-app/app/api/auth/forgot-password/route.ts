import { NextRequest, NextResponse } from "next/server";
import { encryptAES } from "@/lib/crypto/aes";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9097";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Encrypt server-side before sending to backend
    const encrypted = await encryptAES(JSON.stringify(body));

    const res = await fetch(`${BACKEND_URL}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ request: encrypted }),
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to send OTP" },
      { status: 500 }
    );
  }
}

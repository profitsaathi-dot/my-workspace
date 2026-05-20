import Razorpay from "razorpay";
import { NextResponse } from "next/server";

function getRazorpayInstance() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    return NextResponse.json(order);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Order creation failed";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
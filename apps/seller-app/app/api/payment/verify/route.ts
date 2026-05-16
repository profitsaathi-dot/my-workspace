import { paymentService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";
import type { PaymentVerifyRequest } from "@/src/types/payment";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PaymentVerifyRequest;
    if (
      !body.razorpay_payment_id ||
      !body.razorpay_order_id ||
      !body.razorpay_signature ||
      !body.orderId
    ) {
      throw new BadRequestError("Missing payment parameters");
    }
    const result = await paymentService.verify(body);
    return Response.json(result);
  } catch (err) {
    return toApiResponse(err);
  }
}

import { paymentService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      throw new BadRequestError("Valid amount required");
    }
    const order = await paymentService.createRazorpayOrder(num);
    return Response.json(order);
  } catch (err) {
    return toApiResponse(err);
  }
}

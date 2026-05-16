import type { NextRequest } from "next/server";
import { whatsAppService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";
import type { SendWhatsAppMessageRequest } from "@/src/types/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SendWhatsAppMessageRequest>;
    if (!body.to?.trim()) throw new BadRequestError("Recipient is required");
    if (!body.text?.trim()) throw new BadRequestError("Message is required");
    const data = await whatsAppService.send(req, {
      to: body.to.trim(),
      text: body.text.trim(),
    });
    return Response.json(data);
  } catch (err) {
    return toApiResponse(err);
  }
}

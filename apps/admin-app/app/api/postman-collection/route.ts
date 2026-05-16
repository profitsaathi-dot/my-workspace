/**
 * Live OpenAPI → Postman v2.1 collection.
 *
 * Fetches the monolith's /v3/api-docs (regenerated on every backend restart,
 * so the spec auto-tracks new endpoints) and converts it via the official
 * Postman converter. The response is a downloadable .json the user can drag
 * into Postman → Import.
 * 
 */
import { NextResponse } from "next/server";
import Converter from "openapi-to-postmanv2";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
interface ConversionResult {
  result: boolean;
  output?: { data: unknown }[];
  reason?: string;
}

function convert(spec: object) {
  return new Promise<ConversionResult>((resolve) => {
    Converter.convert(
      { type: "json", data: spec },
      { folderStrategy: "Tags" },
      (_err, result) => resolve(result as ConversionResult),
    );
  });
}

export async function GET() {
  let spec: object;

  try {
    const upstream = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/v3/api-docs`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `OpenAPI fetch failed (${upstream.status})` },
        { status: 502 },
      );
    }

    spec = await upstream.json();
  } catch (err) {
    console.error("[postman-collection] OpenAPI fetch failed:", err);

    return NextResponse.json(
      { error: "Upstream unreachable — is the monolith running?" },
      { status: 502 },
    );
  }

  const result = await convert(spec);

  if (!result.result || !result.output?.[0]?.data) {
    return NextResponse.json(
      { error: result.reason ?? "Conversion failed" },
      { status: 500 },
    );
  }

  const collection = result.output[0].data;

  return new NextResponse(JSON.stringify(collection, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition":
        'attachment; filename="profitsaathi-postman-collection.json"',
      "Cache-Control": "no-store",
    },
  });
}
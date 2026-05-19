import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { QuotePdfDocument } from "@/components/quote-pdf";
import type { GeneratePdfRequest } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GeneratePdfRequest;

    if (!body.quote || !body.profile) {
      return NextResponse.json(
        { success: false, error: "Missing quote or profile data" },
        { status: 400 }
      );
    }

    if (!body.quote.line_items || body.quote.line_items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Quote must have at least one line item" },
        { status: 400 }
      );
    }

    const pdfElement = React.createElement(QuotePdfDocument, {
      data: body,
    }) as React.ReactElement;

    const buffer = await renderToBuffer(pdfElement);

    const filename = `Offerte_${body.offerten_nummer || "draft"}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "PDF generation failed";
    console.error("Generate PDF error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

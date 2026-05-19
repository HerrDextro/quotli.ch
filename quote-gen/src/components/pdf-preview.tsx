"use client";

import React from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { QuotePdfDocument } from "./quote-pdf";
import type { GeneratePdfRequest } from "@/types";

interface PdfPreviewProps {
  data: GeneratePdfRequest;
}

export default function PdfPreview({ data }: PdfPreviewProps) {
  return (
    <PDFViewer width="100%" height="100%" showToolbar={false}>
      <QuotePdfDocument data={data} />
    </PDFViewer>
  );
}

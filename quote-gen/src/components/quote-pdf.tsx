import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { GeneratePdfRequest } from "@/types";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

function formatCHF(value: number): string {
  const fixed = value.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${formatted}.${decPart}`;
}

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  senderBlock: {
    maxWidth: 250,
  },
  company: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 9,
    lineHeight: 1.5,
    color: "#4a4a4a",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    fontSize: 9,
    color: "#4a4a4a",
  },
  metaItem: {
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: 8,
    color: "#888888",
    marginBottom: 2,
  },
  metaValue: {
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  clientBlock: {
    marginBottom: 25,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 3,
  },
  clientLabel: {
    fontSize: 8,
    color: "#888888",
    marginBottom: 3,
  },
  clientName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  titleRow: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  summary: {
    fontSize: 9,
    color: "#4a4a4a",
    marginBottom: 20,
    lineHeight: 1.5,
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  colDesc: { flex: 4 },
  colNum: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1, textAlign: "center" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    fontSize: 9,
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: "bold",
  },
  totalsSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  totalsLabel: {
    flex: 4,
    textAlign: "right",
    fontSize: 9,
    color: "#4a4a4a",
    paddingRight: 15,
  },
  totalsValue: {
    flex: 1.5,
    textAlign: "right",
    fontSize: 9,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "#f3f4f6",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: "#1a1a1a",
    marginTop: 3,
  },
  grandTotalLabel: {
    flex: 4,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "bold",
    paddingRight: 15,
  },
  grandTotalValue: {
    flex: 1.5,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "bold",
  },
  termsSection: {
    marginTop: 25,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 3,
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
  },
  termsText: {
    fontSize: 9,
    color: "#4a4a4a",
    lineHeight: 1.5,
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureBlock: {
    width: 200,
    textAlign: "center",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    paddingTop: 4,
    fontSize: 8,
    color: "#6b7280",
  },
  watermarkFooter: {
    position: "absolute",
    bottom: 25,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 7,
    color: "#bbbbbb",
  },
});

interface QuotePdfProps {
  data: GeneratePdfRequest;
}

export function QuotePdfDocument({ data }: QuotePdfProps) {
  const { quote, profile, client_name, client_email, offerten_nummer } = data;
  const today = new Date();
  const validUntil = new Date(
    today.getTime() + quote.valid_days * 24 * 60 * 60 * 1000
  );
  const isFree = profile.plan === "free";
  const addressLines = profile.address.split("\n");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.senderBlock}>
            <Text style={styles.company}>{profile.company_name}</Text>
            {addressLines.map((line, i) => (
              <Text key={i} style={styles.addressLine}>
                {line}
              </Text>
            ))}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {profile.logo_url && !isFree ? (
              <Image
                src={profile.logo_url}
                style={{ width: 120, height: 60, objectFit: "contain" }}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Offertennummer</Text>
            <Text style={styles.metaValue}>{offerten_nummer}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Datum</Text>
            <Text style={styles.metaValue}>{formatDate(today)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Gültig bis</Text>
            <Text style={styles.metaValue}>{formatDate(validUntil)}</Text>
          </View>
        </View>

        <View style={styles.clientBlock}>
          <Text style={styles.clientLabel}>Empfänger</Text>
          <Text style={styles.clientName}>{client_name}</Text>
          {client_email ? (
            <Text style={styles.addressLine}>{client_email}</Text>
          ) : null}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Offerte – {quote.trade}</Text>
        </View>

        <Text style={styles.summary}>{quote.summary}</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>
              Position
            </Text>
            <Text style={[styles.tableHeaderText, styles.colNum]}>Menge</Text>
            <Text style={[styles.tableHeaderText, styles.colUnit]}>
              Einheit
            </Text>
            <Text style={[styles.tableHeaderText, styles.colNum]}>
              Einzelpreis
            </Text>
            <Text style={[styles.tableHeaderText, styles.colNum]}>
              Total CHF
            </Text>
          </View>

          {quote.line_items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colDesc]}>
                {item.description}
              </Text>
              <Text style={[styles.tableCell, styles.colNum]}>
                {item.qty}
              </Text>
              <Text style={[styles.tableCell, styles.colUnit]}>
                {item.unit}
              </Text>
              <Text style={[styles.tableCell, styles.colNum]}>
                {formatCHF(item.unit_price)}
              </Text>
              <Text style={[styles.tableCellBold, styles.colNum]}>
                {formatCHF(item.total)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Zwischentotal</Text>
            <Text style={styles.totalsValue}>
              CHF {formatCHF(quote.subtotal)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>
              MWST ({quote.mwst_rate}%)
            </Text>
            <Text style={styles.totalsValue}>
              CHF {formatCHF(quote.mwst_amount)}
            </Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Gesamttotal</Text>
            <Text style={styles.grandTotalValue}>
              CHF {formatCHF(quote.grand_total)}
            </Text>
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Zahlungsbedingungen</Text>
          <Text style={styles.termsText}>{quote.payment_terms}</Text>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLine}>
              Datum / Unterschrift ({profile.company_name})
            </Text>
          </View>
        </View>

        {isFree && (
          <Text style={styles.watermarkFooter}>
            Erstellt mit Quotli – Schweizer Offerten-Generator
          </Text>
        )}
      </Page>
    </Document>
  );
}

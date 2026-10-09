/**
 * Reads a signed amount in Brazilian or international notation:
 * "-1.234,56", "1,234.56", "R$ -12,00", "(12,00)", "12.50-", "-50.00".
 * Returns null when it is not a number.
 */
export function parseSignedAmount(input: string): number | null {
  let text = input.replace(/R\$|\s| /g, "");
  if (!text) return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/^[-−]/.test(text)) {
    negative = !negative;
    text = text.slice(1);
  } else if (/-$/.test(text)) {
    negative = !negative;
    text = text.slice(0, -1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: whichever comes last is the decimal mark.
    text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    text = /^\d{1,3}(,\d{3})+$/.test(text) && !/,\d{1,2}$/.test(text) ? text.replace(/,/g, "") : text.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }

  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Math.round(Number(text) * 100) / 100;
  return negative ? -value : value;
}

/** Dates as dd/mm/yyyy, dd/mm/yy, dd-mm-yyyy, yyyy-mm-dd or yyyymmdd -> yyyy-mm-dd. */
export function parseBankDate(input: string): string | null {
  const text = input.trim();
  let year: number, month: number, day: number;

  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = text.match(/^(\d{4})(\d{2})(\d{2})/))) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) {
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** Bank files are often Windows-1252 (Latin-1). Fall back to it when UTF-8 shows broken characters. */
export function decodeBankFile(bytes: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  const declaresLatin1 = /CHARSET:\s*(1252|ISO-8859-1)/i.test(utf8.slice(0, 500));
  if (declaresLatin1 || utf8.includes("�")) return new TextDecoder("windows-1252").decode(bytes);
  return utf8.replace(/^﻿/, "");
}

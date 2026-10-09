import { parseBankDate, parseSignedAmount } from "./amount";
import { ImportFormatError, type ParseResult, type ParsedRow } from "./types";

/** Value of an OFX tag inside a block. OFX 1.x (SGML) often omits closing tags. */
function tag(block: string, name: string): string | undefined {
  const match = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
  const value = match?.[1].trim();
  return value ? decodeEntities(value) : undefined;
}

function decodeEntities(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function looksLikeOfx(text: string) {
  return /OFXHEADER|<OFX>/i.test(text.slice(0, 2000));
}

/** Reads <STMTTRN> entries from an OFX statement (bank account or credit card). */
export function parseOfx(text: string): ParseResult {
  if (!looksLikeOfx(text)) throw new ImportFormatError("O arquivo não parece um OFX.");

  // SGML files may not close STMTTRN either, so split on the opening tag.
  const blocks = text.split(/<STMTTRN>/i).slice(1).map((chunk) => chunk.split(/<\/STMTTRN>|<\/BANKTRANLIST>/i)[0]);

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const block of blocks) {
    const date = parseBankDate(tag(block, "DTPOSTED") ?? "");
    const amount = parseSignedAmount(tag(block, "TRNAMT") ?? "");
    const description = tag(block, "MEMO") || tag(block, "NAME");
    if (!date || amount === null || amount === 0 || !description) {
      skipped++;
      continue;
    }
    rows.push({ date, amount, description, externalId: tag(block, "FITID") });
  }

  if (rows.length === 0 && skipped === 0) {
    throw new ImportFormatError("Não encontramos lançamentos neste OFX.");
  }
  return { format: "ofx", rows, skipped };
}

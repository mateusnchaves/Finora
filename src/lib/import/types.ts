/** One movement read from a bank file. `amount` is signed: negative = money out. */
export type ParsedRow = {
  date: string; // yyyy-mm-dd
  description: string;
  amount: number;
  externalId?: string;
};

export type ParseResult = {
  format: "ofx" | "csv";
  rows: ParsedRow[];
  /** Lines that looked like data but could not be read. */
  skipped: number;
};

export class ImportFormatError extends Error {}

/** Max rows accepted in one import, to keep previews and inserts fast. */
export const MAX_IMPORT_ROWS = 500;

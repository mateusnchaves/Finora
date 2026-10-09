import { parseBankDate, parseSignedAmount } from "./amount";
import { ImportFormatError, type ParseResult, type ParsedRow } from "./types";

/** Splits CSV text into rows, honoring quoted fields ("a;b", "say ""hi"""). */
export function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function detectDelimiter(firstLine: string) {
  const counts = [";", ",", "\t"].map((d) => [d, firstLine.split(d).length - 1] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

type Columns = { date: number; description: number; amount?: number; debit?: number; credit?: number; id?: number };

function findColumns(header: string[]): Columns | null {
  const names = header.map(normalize);
  const find = (pattern: RegExp) => {
    const index = names.findIndex((name) => pattern.test(name));
    return index >= 0 ? index : undefined;
  };

  const date = find(/^(data|date|dt)\b/);
  const description = find(/descri|^title$|titulo|historico|lancamento|estabelecimento|memo|detalhe/);
  const amount = find(/^(valor|amount|quantia|montante)/);
  const debit = find(/debito|saida/);
  const credit = find(/credito|entrada/);
  const id = find(/^(identificador|id|fitid|codigo)$/);

  if (date === undefined || description === undefined) return null;
  if (amount === undefined && (debit === undefined || credit === undefined)) return null;
  return { date, description, amount, debit, credit, id };
}

/**
 * Reads a bank CSV with a header row (Nubank, Inter, Itaú exports and similar).
 * `positiveIsExpense` flips signs for credit card statements, where purchases are positive.
 */
export function parseCsv(text: string, { positiveIsExpense = false } = {}): ParseResult {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const table = splitCsv(text, detectDelimiter(firstLine));

  // Some banks put a title above the header: use the first row that names the columns.
  const headerIndex = table.slice(0, 10).findIndex((row) => findColumns(row) !== null);
  if (headerIndex < 0) {
    throw new ImportFormatError(
      "Não reconhecemos as colunas do CSV. Ele precisa ter cabeçalho com data, descrição e valor.",
    );
  }
  const columns = findColumns(table[headerIndex])!;

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const cells of table.slice(headerIndex + 1)) {
    const date = parseBankDate(cells[columns.date] ?? "");
    const description = (cells[columns.description] ?? "").trim();

    let amount: number | null;
    if (columns.amount !== undefined) {
      amount = parseSignedAmount(cells[columns.amount] ?? "");
    } else {
      const debit = parseSignedAmount(cells[columns.debit!] ?? "") ?? 0;
      const credit = parseSignedAmount(cells[columns.credit!] ?? "") ?? 0;
      amount = credit - Math.abs(debit);
    }

    if (!date || amount === null || amount === 0 || !description) {
      skipped++;
      continue;
    }
    if (positiveIsExpense) amount = -amount;

    const externalId = columns.id !== undefined ? cells[columns.id]?.trim() || undefined : undefined;
    rows.push({ date, description, amount, externalId });
  }

  return { format: "csv", rows, skipped };
}

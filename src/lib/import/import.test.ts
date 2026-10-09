import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/data/types";
import { decodeBankFile, parseBankDate, parseSignedAmount } from "./amount";
import { buildHistory, descriptionKey, suggestCategory } from "./categorize";
import { parseCsv, splitCsv } from "./parse-csv";
import { findDuplicates } from "./duplicates";
import { parseOfx } from "./parse-ofx";
import { sampleCardCsv, sampleOfx } from "./samples";

describe("parseSignedAmount", () => {
  it.each([
    ["-1.234,56", -1234.56],
    ["1,234.56", 1234.56],
    ["R$ -12,00", -12],
    ["(12,00)", -12],
    ["12.50-", -12.5],
    ["-50.00", -50],
    ["+4.200,00", 4200],
    ["1.234", 1234],
    ["39,9", 39.9],
    ["1,234", 1234],
  ])("reads %s", (input, expected) => {
    expect(parseSignedAmount(input)).toBe(expected);
  });

  it("rejects text", () => {
    expect(parseSignedAmount("abc")).toBeNull();
    expect(parseSignedAmount("")).toBeNull();
  });
});

describe("parseBankDate", () => {
  it.each([
    ["05/10/2026", "2026-10-05"],
    ["5/10/26", "2026-10-05"],
    ["2026-10-05", "2026-10-05"],
    ["20261005120000[-3:BRT]", "2026-10-05"],
    ["05-10-2026", "2026-10-05"],
  ])("reads %s", (input, expected) => {
    expect(parseBankDate(input)).toBe(expected);
  });

  it("rejects impossible dates", () => {
    expect(parseBankDate("31/02/2026")).toBeNull();
  });
});

describe("decodeBankFile", () => {
  it("falls back to Windows-1252 for Latin-1 bytes", () => {
    const bytes = new Uint8Array([0x50, 0x41, 0x47, 0x54, 0x4f, 0x20, 0x46, 0x41, 0x52, 0x4d, 0xc1, 0x43, 0x49, 0x41]);
    expect(decodeBankFile(bytes.buffer)).toBe("PAGTO FARMÁCIA");
  });
});

const SGML_OFX = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261005100000[-3:BRT]
<TRNAMT>-1450.00
<FITID>2026100501
<MEMO>PAGTO ALUGUEL OUT
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261005
<TRNAMT>5200,00
<FITID>2026100502
<NAME>SALARIO EMPRESA X
</STMTTRN>
<STMTTRN>
<TRNTYPE>OTHER
<DTPOSTED>garbage
<TRNAMT>1
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

describe("parseOfx", () => {
  it("reads SGML entries without closing tags and comma decimals", () => {
    const result = parseOfx(SGML_OFX);
    expect(result.rows).toEqual([
      { date: "2026-10-05", amount: -1450, description: "PAGTO ALUGUEL OUT", externalId: "2026100501" },
      { date: "2026-10-05", amount: 5200, description: "SALARIO EMPRESA X", externalId: "2026100502" },
    ]);
    expect(result.skipped).toBe(1);
  });

  it("rejects files that are not OFX", () => {
    expect(() => parseOfx("date,title,amount")).toThrow();
  });
});

describe("splitCsv", () => {
  it("handles quotes, escaped quotes and delimiters inside quotes", () => {
    expect(splitCsv('a;"b;c";"say ""hi"""\r\n1;2;3', ";")).toEqual([
      ["a", "b;c", 'say "hi"'],
      ["1", "2", "3"],
    ]);
  });
});

describe("parseCsv", () => {
  it("reads a Nubank account export (negative = out)", () => {
    const csv = "Data,Valor,Identificador,Descrição\n05/10/2026,-1450.00,abc-1,Pagamento de boleto - Aluguel\n06/10/2026,200.00,abc-2,Transferência recebida";
    const result = parseCsv(csv);
    expect(result.rows).toEqual([
      { date: "2026-10-05", amount: -1450, description: "Pagamento de boleto - Aluguel", externalId: "abc-1" },
      { date: "2026-10-06", amount: 200, description: "Transferência recebida", externalId: "abc-2" },
    ]);
  });

  it("flips signs for credit card statements", () => {
    const csv = "date,title,amount\n2026-10-03,iFood,45.90\n2026-10-04,Estorno,-10.00";
    const result = parseCsv(csv, { positiveIsExpense: true });
    expect(result.rows.map((r) => r.amount)).toEqual([-45.9, 10]);
  });

  it("supports separate debit and credit columns and a title line", () => {
    const csv = "Extrato conta corrente\nData;Histórico;Débito;Crédito\n03/10/2026;Farmácia;-35,50;\n04/10/2026;Pix recebido;;120,00\nlinha quebrada;;;";
    const result = parseCsv(csv);
    expect(result.rows.map((r) => [r.description, r.amount])).toEqual([
      ["Farmácia", -35.5],
      ["Pix recebido", 120],
    ]);
    expect(result.skipped).toBe(1);
  });

  it("explains when columns are missing", () => {
    expect(() => parseCsv("foo,bar\n1,2")).toThrow(/colunas/);
  });
});

const categories: Category[] = [
  { id: "food", name: "Alimentação", kind: "expense" },
  { id: "shop", name: "Compras", kind: "expense" },
  { id: "car", name: "Transporte", kind: "expense" },
  { id: "pet", name: "Pets", kind: "expense" },
  { id: "salary", name: "Salário", kind: "income" },
];

describe("descriptionKey", () => {
  it("drops numbers, dates and payment words", () => {
    expect(descriptionKey("IFOOD *Restaurante 123 05/10")).toBe("IFOOD RESTAURANTE");
    expect(descriptionKey("Compra no débito - Pet Shop Amigo 1234")).toBe("NO PET SHOP AMIGO");
  });
});

describe("suggestCategory", () => {
  it("prefers the user's own history", () => {
    const history = buildHistory([
      { description: "PET SHOP AMIGO 01", categoryId: "pet", kind: "expense", count: 3 },
      { description: "Pet Shop Amigo", categoryId: "shop", kind: "expense", count: 1 },
    ]);
    expect(suggestCategory("Pet Shop Amigo 99", "expense", history, categories)).toEqual({
      categoryId: "pet",
      source: "history",
    });
  });

  it("falls back to merchant keywords, checking Mercado Livre before Mercado", () => {
    const empty = buildHistory([]);
    expect(suggestCategory("MERCADO LIVRE*VENDEDOR", "expense", empty, categories)?.categoryId).toBe("shop");
    expect(suggestCategory("SUPERMERCADO DIA", "expense", empty, categories)?.categoryId).toBe("food");
    expect(suggestCategory("UBER *TRIP", "expense", empty, categories)?.categoryId).toBe("car");
    expect(suggestCategory("SALARIO EMPRESA X", "income", empty, categories)?.categoryId).toBe("salary");
  });

  it("returns null when nothing matches or the kind differs", () => {
    const empty = buildHistory([]);
    expect(suggestCategory("XPTO LTDA", "expense", empty, categories)).toBeNull();
    expect(suggestCategory("SALARIO", "expense", empty, categories)).toBeNull();
  });
});

describe("findDuplicates", () => {
  const existing = [
    { date: "2026-10-05", amount: 1450, type: "expense", description: "Aluguel", externalId: null },
    { date: "2026-10-06", amount: 8, type: "expense", description: "Café", externalId: null },
    { date: "2026-10-01", amount: 30, type: "income", description: "Rendimento", externalId: "fit-9" },
  ];

  it("flags known bank ids and same day/amount/direction", () => {
    const reasons = findDuplicates(
      [
        { date: "2026-10-01", amount: 99, description: "x", externalId: "fit-9" },
        { date: "2026-10-05", amount: -1450, description: "PAGTO ALUGUEL" },
        { date: "2026-10-05", amount: 1450, description: "Estorno" },
      ],
      existing,
    );
    expect(reasons).toEqual(["same-id", "same-day-amount", null]);
  });

  it("lets a second identical row through when only one exists", () => {
    const reasons = findDuplicates(
      [
        { date: "2026-10-06", amount: -8, description: "CAFE" },
        { date: "2026-10-06", amount: -8, description: "CAFE" },
      ],
      existing,
    );
    expect(reasons).toEqual(["same-day-amount", null]);
  });
});

describe("sample files", () => {
  it("parse with the importers", () => {
    const ofx = parseOfx(sampleOfx("2026-10-20"));
    expect(ofx.rows.length).toBe(9);
    expect(ofx.rows[0]).toMatchObject({ date: "2026-10-05", amount: -1450 });

    const csv = parseCsv(sampleCardCsv("2026-10-20"), { positiveIsExpense: true });
    expect(csv.rows.length).toBe(8);
    expect(csv.rows.at(-1)?.amount).toBe(149.9);
  });
});

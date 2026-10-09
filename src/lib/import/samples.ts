import { previousDay } from "@/lib/dates";

/*
 * Sample statements for trying the importer, dated relative to today so they
 * always look recent. The OFX repeats the demo account's rent on purpose, to
 * show duplicate detection.
 */

function daysAgo(today: string, days: number) {
  let date = today;
  for (let i = 0; i < days; i++) date = previousDay(date);
  return date;
}

const compact = (isoDate: string) => isoDate.replaceAll("-", "");

export function sampleOfx(today: string): string {
  const month = today.slice(0, 8); // yyyy-mm-
  const entries: [string, number, string][] = [
    [`${month}05`, -1450, "PAGTO ALUGUEL"],
    [daysAgo(today, 1), -38.9, "PIX ENVIADO PADARIA BELLA VISTA"],
    [daysAgo(today, 2), -219.45, "COMPRA CARTAO SUPERMERCADO DIA A DIA"],
    [daysAgo(today, 3), -64, "POSTO IPIRANGA AV BRASIL"],
    [daysAgo(today, 4), 850, "PIX RECEBIDO JOAO SILVA"],
    [daysAgo(today, 6), -129.9, "ENEL DISTRIBUICAO SP"],
    [daysAgo(today, 9), -57.3, "DROGASIL 1234"],
    [daysAgo(today, 12), -84.5, "CHURRASCARIA GAUCHA LTDA"],
    [daysAgo(today, 15), 27.31, "REMUNERACAO APLICACAO AUTOMATICA"],
  ];
  const transactions = entries
    .filter(([date]) => date <= today)
    .map(
      ([date, amount, memo], i) => `<STMTTRN>
<TRNTYPE>${amount < 0 ? "DEBIT" : "CREDIT"}
<DTPOSTED>${compact(date)}120000[-3:BRT]
<TRNAMT>${amount.toFixed(2)}
<FITID>FINORA-EXEMPLO-${compact(date)}-${i}
<MEMO>${memo}
</STMTTRN>`,
    )
    .join("\n");

  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKTRANLIST>
${transactions}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;
}

export function sampleCardCsv(today: string): string {
  const rows: [number, string, number][] = [
    [1, "iFood *Sushi Kento", 72.4],
    [2, "Uber *Trip", 23.15],
    [3, "Amazon Marketplace", 149.9],
    [5, "Netflix.com", 55.9],
    [6, "Pet Shop Amigo Fiel", 96],
    [8, "Mercado Livre*Loja Tech", 89.99],
    [10, "Cinemark Shopping", 64],
    [11, "Estorno Amazon Marketplace", -149.9],
  ];
  const lines = rows.map(([days, title, amount]) => `${daysAgo(today, days)},${title},${amount.toFixed(2)}`);
  return ["date,title,amount", ...lines].join("\n") + "\n";
}

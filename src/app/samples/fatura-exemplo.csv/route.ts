import { connection } from "next/server";
import { todayISO } from "@/lib/dates";
import { sampleCardCsv } from "@/lib/import/samples";

export async function GET() {
  await connection();
  return new Response(sampleCardCsv(todayISO()), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fatura-exemplo.csv"',
    },
  });
}

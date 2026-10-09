import { connection } from "next/server";
import { todayISO } from "@/lib/dates";
import { sampleOfx } from "@/lib/import/samples";

export async function GET() {
  await connection();
  return new Response(sampleOfx(todayISO()), {
    headers: {
      "Content-Type": "application/x-ofx; charset=windows-1252",
      "Content-Disposition": 'attachment; filename="extrato-exemplo.ofx"',
    },
  });
}

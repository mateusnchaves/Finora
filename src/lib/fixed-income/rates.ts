import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RatePoint } from "./valuation";

/*
 * Banco Central SGS series, cached in `index_rates`. Public data, so the shared
 * cache is written with the privileged client and read by anyone signed in.
 */

export type Series = "cdi" | "selic" | "ipca";

const SGS_CODE: Record<Series, number> = { cdi: 12, selic: 11, ipca: 433 };
/** Refresh at most this often; the series change once per business day (monthly for IPCA). */
const REFRESH_MS = 6 * 60 * 60 * 1000;
const PAGE = 1000;

const toBr = (iso: string) => iso.split("-").reverse().join("/");
const fromBr = (br: string) => br.split("/").reverse().join("-");

function addYears(iso: string, years: number) {
  const [y, m, d] = iso.split("-");
  return `${Number(y) + years}-${m}-${d}`;
}

/** Fetches [from, to] from the SGS API. Daily series accept at most 10 years per request. */
async function fetchSgs(series: Series, from: string, to: string): Promise<RatePoint[]> {
  const points: RatePoint[] = [];
  let start = from;
  while (start <= to) {
    const chunkEnd = series === "ipca" ? to : [addYears(start, 9), to].sort()[0];
    const url =
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${SGS_CODE[series]}/dados?formato=json` +
      `&dataInicial=${toBr(start)}&dataFinal=${toBr(chunkEnd)}`;
    // The SGS API is sometimes slow; give it time and one retry.
    const request = () => fetch(url, { signal: AbortSignal.timeout(25000), cache: "no-store" });
    const response = await request().catch(() => request());
    const body = await response.json().catch(() => null);
    // The API answers an error object (or 404) when the range has no data.
    if (Array.isArray(body)) {
      for (const row of body) {
        const value = Number(row.valor);
        if (row.data && Number.isFinite(value)) points.push({ date: fromBr(row.data), value });
      }
    } else if (!response.ok && response.status !== 404) {
      throw new Error(`SGS ${series} ${response.status}`);
    }
    if (chunkEnd === to) break;
    const next = new Date(`${chunkEnd}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    start = next.toISOString().slice(0, 10);
  }
  return points;
}

/**
 * Makes sure the cache covers [from, today]: loads older history when a new
 * investment starts earlier than anything cached, and refreshes recent days
 * every few hours. Failures leave the cache as it is (values just lag).
 */
async function syncSeries(series: Series, from: string, today: string) {
  const admin = createAdminClient();
  const start = series === "ipca" ? `${from.slice(0, 7)}-01` : from;
  const { data: sync } = await admin.from("index_sync").select("synced_from, synced_at").eq("series", series).maybeSingle();

  const coversStart = sync && sync.synced_from <= start;
  const fresh = sync && Date.now() - new Date(sync.synced_at).getTime() < REFRESH_MS;
  if (coversStart && fresh) return;

  try {
    // Recent refresh: re-read the last few weeks (late revisions); otherwise load from `start`.
    const recentFrom = new Date(Date.now() - 40 * 86_400_000).toISOString().slice(0, 10);
    const fetchFrom = coversStart ? [recentFrom, start].sort().at(-1)! : start;
    const points = await fetchSgs(series, fetchFrom, today);

    for (let i = 0; i < points.length; i += PAGE) {
      const rows = points.slice(i, i + PAGE).map((p) => ({ series, date: p.date, value: p.value }));
      const { error } = await admin.from("index_rates").upsert(rows);
      if (error) throw error;
    }
    await admin.from("index_sync").upsert({
      series,
      synced_from: sync ? [sync.synced_from, start].sort()[0] : start,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn(`[rates] ${series} sync failed:`, error instanceof Error ? error.message : error);
  }
}

/** The series from `from` to today, oldest first, syncing the cache when needed. */
export async function getSeries(series: Series, from: string, today: string): Promise<RatePoint[]> {
  await syncSeries(series, from, today);

  const admin = createAdminClient();
  const start = series === "ipca" ? `${from.slice(0, 7)}-01` : from;
  const points: RatePoint[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from("index_rates")
      .select("date, value")
      .eq("series", series)
      .gte("date", start)
      .order("date")
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    points.push(...data.map((row) => ({ date: row.date, value: Number(row.value) })));
    if (data.length < PAGE) break;
  }
  return points;
}

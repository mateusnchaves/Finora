"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { syncOfflineTransaction } from "@/app/(app)/transactions/actions";
import { Icon } from "@/components/ui/icon";
import { markFailed, QUEUE_EVENT, queueSnapshot, readQueue, removeFromQueue, type PendingTransaction } from "@/lib/offline-queue";

function subscribe(onChange: () => void) {
  window.addEventListener(QUEUE_EVENT, onChange);
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener(QUEUE_EVENT, onChange);
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; count: number };

/** Sends transactions recorded offline as soon as the connection is back, and says so. */
export function OfflineSync() {
  const router = useRouter();
  const raw = useSyncExternalStore(subscribe, queueSnapshot, () => "");
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const queue = useMemo<PendingTransaction[]>(() => (raw ? JSON.parse(raw) : []), [raw]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const sending = useRef(false);

  const sync = useCallback(async () => {
    const pending = readQueue().filter((item) => !item.error);
    if (sending.current || !navigator.onLine || pending.length === 0) return;
    sending.current = true;
    setStatus({ kind: "sending" });

    let sent = 0;
    for (const item of pending) {
      try {
        const result = await syncOfflineTransaction(item.values);
        if (result.ok) {
          removeFromQueue([item.id]);
          sent += 1;
        } else {
          markFailed(item.id, result.error ?? "Lançamento inválido.");
        }
      } catch {
        // The connection dropped again: try the rest next time.
        break;
      }
    }

    sending.current = false;
    setStatus(sent ? { kind: "sent", count: sent } : { kind: "idle" });
    if (sent) router.refresh();
  }, [router]);

  useEffect(() => {
    const onOnline = () => void sync();
    // Something may be waiting from an earlier visit.
    const first = setTimeout(onOnline, 0);
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(first);
      window.removeEventListener("online", onOnline);
    };
  }, [sync]);

  useEffect(() => {
    if (status.kind !== "sent") return;
    const timer = setTimeout(() => setStatus({ kind: "idle" }), 6000);
    return () => clearTimeout(timer);
  }, [status]);

  const waiting = queue.filter((item) => !item.error);
  const failed = queue.filter((item) => item.error);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  let message: React.ReactNode = null;
  if (failed.length > 0) {
    message = (
      <>
        <Icon name="error" size={20} className="shrink-0 text-negative" />
        <span className="flex-1">
          {plural(failed.length, "lançamento feito sem internet não pôde ser salvo", "lançamentos feitos sem internet não puderam ser salvos")}
          : {failed[0].error}
        </span>
        <button
          type="button"
          onClick={() => removeFromQueue(failed.map((item) => item.id))}
          className="min-h-11 shrink-0 rounded-md px-3 font-semibold text-brand hover:bg-brand-tint"
        >
          Descartar
        </button>
      </>
    );
  } else if (status.kind === "sending") {
    message = (
      <>
        <Icon name="cloud_upload" size={20} className="shrink-0 text-brand" />
        Enviando os lançamentos feitos sem internet…
      </>
    );
  } else if (status.kind === "sent") {
    message = (
      <>
        <Icon name="check_circle" size={20} className="shrink-0 text-brand" />
        {plural(status.count, "lançamento feito sem internet foi salvo", "lançamentos feitos sem internet foram salvos")}.
      </>
    );
  } else if (waiting.length > 0 && !online) {
    message = (
      <>
        <Icon name="cloud_off" size={20} className="shrink-0 text-ink-muted" />
        {plural(waiting.length, "lançamento esperando", "lançamentos esperando")} a internet para ser enviado.
      </>
    );
  }

  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-3 rounded-lg bg-surface-raised px-4 py-3 text-body-sm text-ink shadow-card lg:bottom-28"
    >
      {message}
    </div>
  );
}

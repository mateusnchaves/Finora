"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { askClara, generateSummary } from "@/app/(app)/clara/actions";
import { Icon } from "@/components/ui/icon";
import type { Source } from "@/lib/ai/aggregate";
import { CLARA_GREETING, SUGGESTED_QUESTIONS } from "@/lib/ai/suggestions";
import type { MonthSummary } from "@/lib/ai/summary";
import { cn } from "@/lib/cn";

type Message =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "clara"; text: string; sources?: Source[]; summary?: MonthSummary; error?: boolean };

/** Kept for the browser tab only: the chat survives navigation and reloads, not new tabs. */
const STORAGE_KEY = "finora-clara";

function loadMessages(): Message[] {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Message[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  } catch {}
}

/** Text form of the conversation for the model; errors and summaries are left out. */
function historyOf(messages: Message[]) {
  return messages
    .filter((m) => !(m.role === "clara" && (m.error || m.summary)))
    .map((m) => ({ role: m.role, text: m.text }));
}

export function ClaraAvatar({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-pill bg-brand text-on-brand"
    >
      <Icon name="auto_awesome" size={Math.round(size * 0.55)} filled />
    </span>
  );
}

/** Floating button on every signed-in page; opens the conversation with Clara. */
export function ClaraChat({ isDemo }: { isDemo: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const loaded = useRef(false);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function update(next: Message[]) {
    setMessages(next);
    saveMessages(next);
  }

  function send(input: { text: string; suggestionId?: string }) {
    if (pending || !input.text.trim()) return;
    const question: Message = { id: crypto.randomUUID(), role: "user", text: input.text.trim() };
    const before = messages;
    update([...before, question]);
    setDraft("");

    startTransition(async () => {
      const reply = await askClara({
        question: input.suggestionId ? undefined : question.text,
        suggestionId: input.suggestionId,
        history: historyOf(before),
      });
      const answer: Message = reply.answer
        ? { id: crypto.randomUUID(), role: "clara", text: reply.answer.text, sources: reply.answer.sources }
        : { id: crypto.randomUUID(), role: "clara", text: reply.error ?? "Algo deu errado.", error: true };
      update([...before, question, answer]);
    });
  }

  function summarize() {
    if (pending) return;
    const question: Message = { id: crypto.randomUUID(), role: "user", text: "Resumo do mês" };
    const before = messages;
    update([...before, question]);
    startTransition(async () => {
      const reply = await generateSummary();
      const answer: Message = reply.summary
        ? { id: crypto.randomUUID(), role: "clara", text: reply.summary.headline, summary: reply.summary }
        : { id: crypto.randomUUID(), role: "clara", text: reply.error ?? "Algo deu errado.", error: true };
      update([...before, question, answer]);
    });
  }

  const close = () => dialogRef.current?.close();
  function open() {
    // Read the saved conversation on first open (sessionStorage only exists in the browser).
    if (!loaded.current) {
      loaded.current = true;
      setMessages(loadMessages());
    }
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Conversar com a Clara, assistente financeira"
        className={cn(
          "fixed right-4 z-30 flex items-center gap-2 rounded-pill bg-brand p-1.5 text-on-brand shadow-card",
          "bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:right-8 lg:bottom-8 lg:pr-4",
          "hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus",
        )}
      >
        <span className="grid size-11 place-items-center">
          <Icon name="auto_awesome" size={24} filled />
        </span>
        <span className="hidden text-body font-semibold lg:inline">Clara</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="clara-title"
        // Clicking the dimmed backdrop (the dialog element itself) closes it.
        onClick={(event) => event.target === dialogRef.current && close()}
        className={cn(
          "m-0 h-dvh max-h-dvh w-full max-w-none bg-surface p-0 text-ink backdrop:bg-black/40",
          "sm:ml-auto sm:max-w-md sm:border-l sm:border-border",
        )}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <ClaraAvatar />
            <div className="min-w-0 flex-1">
              <h2 id="clara-title" className="font-display text-heading-md text-ink">
                Clara
              </h2>
              <p className="text-body-sm text-ink-muted">Assistente financeira</p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => update([])}
                disabled={pending}
                className="min-h-11 rounded-md px-3 text-body-sm font-semibold text-brand hover:bg-brand-tint"
              >
                Nova conversa
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Fechar conversa"
              className="grid size-11 place-items-center rounded-md text-ink-muted hover:bg-brand-tint hover:text-ink"
            >
              <Icon name="close" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
            <div className="flex flex-col gap-3">
              <Bubble role="clara">{CLARA_GREETING}</Bubble>
              {messages.map((m) =>
                m.role === "user" ? (
                  <Bubble key={m.id} role="user">
                    {m.text}
                  </Bubble>
                ) : (
                  <ClaraMessage key={m.id} message={m} onNavigate={close} />
                ),
              )}
              {pending && (
                <p role="status" className="flex items-center gap-2 px-1 text-body-sm text-ink-muted">
                  <Icon name="auto_awesome" size={16} className="text-brand" />
                  Clara está olhando seus lançamentos…
                </p>
              )}
            </div>

            {messages.length === 0 && (
              <div className="mt-5 flex flex-col gap-2">
                <p className="text-label text-ink-muted">Para começar</p>
                <Chip onClick={summarize} disabled={pending}>
                  Resumo do mês
                </Chip>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <Chip key={q.id} onClick={() => send({ text: q.text, suggestionId: q.id })} disabled={pending}>
                    {q.text}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <footer className="border-t border-border px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {isDemo ? (
              <p className="text-body-sm text-ink-muted">
                Na conta demo dá para usar as sugestões. Crie sua conta para conversar com a Clara à vontade.
              </p>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  send({ text: draft });
                }}
                className="flex items-end gap-2"
              >
                <label htmlFor="clara-message" className="sr-only">
                  Mensagem para a Clara
                </label>
                <textarea
                  id="clara-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter sends; Shift+Enter breaks the line.
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send({ text: draft });
                    }
                  }}
                  maxLength={500}
                  rows={1}
                  placeholder="Pergunte sobre seu dinheiro…"
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-md border-[1.5px] border-border-strong bg-surface-raised px-3.5 py-2.5 text-body text-ink placeholder:text-ink-muted/70 focus-visible:border-focus"
                />
                <button
                  type="submit"
                  disabled={pending || !draft.trim()}
                  aria-label="Enviar"
                  className="grid size-11 shrink-0 place-items-center rounded-md bg-brand text-on-brand hover:bg-brand-hover disabled:opacity-50"
                >
                  <Icon name="send" size={20} />
                </button>
              </form>
            )}
            <p className="mt-2 text-[12px] leading-snug text-ink-muted">
              A Clara usa IA (Gemini, do Google) e só lê seus dados. Confira os números pelos links.{" "}
              <Link href="/privacy" onClick={close} className="underline underline-offset-2">
                Privacidade
              </Link>
            </p>
          </footer>
        </div>
      </dialog>
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "clara"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[88%] rounded-lg px-3.5 py-2.5 text-body whitespace-pre-line",
        role === "user" ? "self-end bg-brand text-on-brand" : "self-start bg-surface-raised text-ink shadow-card",
      )}
    >
      {children}
    </div>
  );
}

function ClaraMessage({ message, onNavigate }: { message: Extract<Message, { role: "clara" }>; onNavigate: () => void }) {
  if (message.error) {
    return (
      <p role="alert" className="flex max-w-[88%] items-start gap-2 self-start rounded-lg bg-negative-tint px-3.5 py-2.5 text-body-sm text-negative">
        <Icon name="error" size={18} className="mt-px shrink-0" />
        {message.text}
      </p>
    );
  }

  return (
    <div className="flex max-w-[88%] flex-col gap-2 self-start rounded-lg bg-surface-raised px-3.5 py-2.5 shadow-card">
      <p className={cn("text-body whitespace-pre-line text-ink", message.summary && "font-semibold")}>{message.text}</p>
      {message.summary && (
        <ul className="flex flex-col gap-2">
          {message.summary.insights.map((insight, i) => (
            <li key={i} className="text-body text-ink">
              {insight.text}
              {insight.href && (
                <>
                  {" "}
                  <Link href={insight.href} onClick={onNavigate} className="font-semibold text-brand underline-offset-4 hover:underline">
                    Ver lançamentos
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {message.sources && message.sources.length > 0 && (
        <div>
          <p className="text-label text-ink-muted">De onde veio</p>
          <ul>
            {message.sources.map((source) => (
              <li key={source.href}>
                <Link
                  href={source.href}
                  onClick={onNavigate}
                  className="-mx-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-body-sm font-semibold text-brand hover:bg-brand-tint"
                >
                  <Icon name="north_east" size={16} />
                  {source.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Chip({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-11 self-start rounded-pill border-[1.5px] border-border-strong px-4 py-2 text-left text-body-sm text-ink hover:bg-brand-tint disabled:opacity-60"
    >
      {children}
    </button>
  );
}

import "server-only";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getBudgetProgress } from "@/lib/data/budgets";
import { getCardSummaries } from "@/lib/data/cards";
import { getGoals } from "@/lib/data/goals";
import type { Account, Category } from "@/lib/data/types";
import { isISODate, monthOf } from "@/lib/dates";
import { GOAL_STATUS_LABELS } from "@/lib/goals";
import { BILL_STATUS_LABELS } from "@/lib/credit-card";
import { createClient } from "@/lib/supabase/server";
import { aggregate, findByName, GROUP_BY, sourceLinks, type AiRow, type Source } from "./aggregate";

/*
 * Read-only tools for the assistant. Every query runs with the signed-in user's own
 * Supabase client, so Row Level Security limits the model to that user's rows, and no
 * tool can write. Each lookup also records a link to the matching transactions, which the
 * UI shows as "de onde veio".
 */

export type ToolContext = {
  today: string;
  accounts: Account[];
  categories: Category[];
  /** Filled while the tools run. */
  sources: Source[];
};

const MAX_ROWS = 5000;
const isoDate = z.string().refine(isISODate, "Use a data no formato AAAA-MM-DD.");

function addSources(context: ToolContext, sources: Source[]) {
  for (const source of sources) {
    if (!context.sources.some((s) => s.href === source.href)) context.sources.push(source);
  }
}

export function financeTools(context: ToolContext) {
  const findTransactions = betaZodTool({
    name: "find_transactions",
    description:
      "Soma, agrupa e lista os lançamentos do usuário em um período. Use para qualquer pergunta sobre " +
      "quanto entrou, quanto saiu, onde gastou ou com o quê. Despesas e receitas vêm separadas; " +
      "transferências entre contas próprias (como pagamento de fatura) não são gasto nem receita. " +
      "Valores em reais, sempre positivos.",
    inputSchema: z.object({
      start_date: isoDate.describe("Primeiro dia do período, inclusive (AAAA-MM-DD)."),
      end_date: isoDate.describe("Último dia do período, inclusive (AAAA-MM-DD)."),
      type: z.enum(["expense", "income", "transfer"]).optional().describe("Só despesas, receitas ou transferências."),
      category: z.string().optional().describe("Nome exato de uma categoria, como em get_context."),
      account: z.string().optional().describe("Nome exato de uma conta, como em get_context."),
      text: z.string().max(60).optional().describe("Trecho da descrição, como “uber” ou “ifood”."),
      group_by: z.enum(GROUP_BY).optional().describe("Agrupar por categoria, descrição, mês ou conta."),
      limit: z.number().int().min(0).max(30).optional().describe("Quantos lançamentos listar (os maiores). Padrão 10."),
    }),
    run: async (input) => {
      if (input.end_date < input.start_date) return "Erro: end_date vem antes de start_date.";

      const category = input.category ? findByName(context.categories, input.category) : undefined;
      if (input.category && !category) {
        return `Erro: categoria "${input.category}" não existe. Categorias: ${context.categories.map((c) => c.name).join(", ")}.`;
      }
      const account = input.account ? findByName(context.accounts, input.account) : undefined;
      if (input.account && !account) {
        return `Erro: conta "${input.account}" não existe. Contas: ${context.accounts.map((a) => a.name).join(", ")}.`;
      }

      const supabase = await createClient();
      let query = supabase
        .from("transactions")
        .select("date, type, amount, description, category_id, account_id, transfer_account_id")
        .gte("date", input.start_date)
        .lte("date", input.end_date)
        .order("date")
        .limit(MAX_ROWS);
      if (input.type) query = query.eq("type", input.type);
      if (category) query = query.eq("category_id", category.id);
      if (account) query = query.or(`account_id.eq.${account.id},transfer_account_id.eq.${account.id}`);
      if (input.text) query = query.ilike("description", `%${input.text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);

      const { data, error } = await query;
      if (error) return "Erro: não foi possível ler os lançamentos agora.";

      const accountNames = new Map(context.accounts.map((a) => [a.id, a.name]));
      const categoryNames = new Map(context.categories.map((c) => [c.id, c.name]));
      const rows: AiRow[] = data.map((r) => ({
        date: r.date,
        type: r.type,
        amount: Number(r.amount),
        description: r.description,
        categoryName: r.category_id ? (categoryNames.get(r.category_id) ?? null) : null,
        accountName: accountNames.get(r.account_id) ?? "Conta removida",
      }));

      addSources(
        context,
        sourceLinks(
          { start: input.start_date, end: input.end_date },
          {
            type: input.type,
            categoryId: category?.id,
            categoryName: category?.name,
            accountId: account?.id,
            text: input.text,
          },
        ),
      );

      const result = aggregate(rows, input.group_by ?? "none", input.limit ?? 10);
      return JSON.stringify({
        period: { start: input.start_date, end: input.end_date },
        filters: { type: input.type, category: category?.name, account: account?.name, text: input.text },
        ...result,
        // Future-dated rows exist: card installments are saved for the months they fall in.
        includes_future_dates: input.end_date > context.today,
        truncated: data.length === MAX_ROWS,
      });
    },
  });

  const getContext = betaZodTool({
    name: "get_context",
    description:
      "Mostra as contas (com saldo), as categorias, os orçamentos do mês atual, as metas e as faturas " +
      "dos cartões. Use para saber os nomes exatos antes de filtrar e para perguntas sobre saldo, " +
      "orçamento, metas ou fatura.",
    inputSchema: z.object({}),
    run: async () => {
      const month = monthOf(context.today);
      const [budgets, goals, cards] = await Promise.all([
        getBudgetProgress(month),
        getGoals(context.today),
        getCardSummaries(context.accounts, context.today, context),
      ]);
      addSources(context, [{ label: "Contas e saldos", href: "/accounts" }]);

      return JSON.stringify({
        today: context.today,
        accounts: context.accounts.map((a) => ({ name: a.name, type: a.type, balance: a.balance })),
        categories: {
          expense: context.categories.filter((c) => c.kind === "expense").map((c) => c.name),
          income: context.categories.filter((c) => c.kind === "income").map((c) => c.name),
        },
        budgets_this_month: budgets.map((b) => ({ category: b.categoryName, limit: b.amount, spent: b.spent })),
        goals: goals.map((g) => ({
          name: g.name,
          saved: g.saved,
          target: g.target,
          deadline: g.targetDate,
          status: GOAL_STATUS_LABELS[g.progress.status],
          monthly_needed: g.progress.monthlyNeeded,
        })),
        cards: cards.map((c) => ({
          name: c.card.name,
          limit: c.card.creditLimit,
          available: c.available,
          open_bill: { total: c.current.total, closes: c.current.bill.closing, due: c.current.bill.due },
          last_closed_bill: {
            total: c.previous.total,
            paid: c.previous.paid,
            due: c.previous.bill.due,
            status: BILL_STATUS_LABELS[c.previous.status],
          },
        })),
      });
    },
  });

  return [getContext, findTransactions];
}

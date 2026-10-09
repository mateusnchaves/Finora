/** Share of the budget at which we warn that the limit is near. */
export const NEAR_LIMIT = 0.8;

export type BudgetStatus = "ok" | "near" | "over";

export function budgetStatus(spent: number, amount: number): BudgetStatus {
  if (spent > amount) return "over";
  if (spent >= amount * NEAR_LIMIT) return "near";
  return "ok";
}

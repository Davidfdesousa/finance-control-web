/**
 * Regras de negócio financeiras — funções puras, sem dependência de UI ou Firebase.
 */
import type { Category, Expense, Income, IncomeType } from './models';
import { round2 } from '../utils/format';

/* ---------------- Valores efetivos por item ---------------- */

/** Valor previsto de uma receita (canceladas não contam). */
export function incomeExpectedValue(income: Income): number {
  return income.status === 'canceled' ? 0 : income.expectedValue;
}

/** Valor efetivamente recebido de uma receita. */
export function incomeReceivedValue(income: Income): number {
  if (income.status !== 'received') return 0;
  return income.receivedValue ?? income.expectedValue;
}

/** Valor previsto de uma despesa (canceladas não contam). */
export function expenseExpectedValue(expense: Expense): number {
  return expense.status === 'canceled' ? 0 : expense.expectedValue;
}

/** Valor que de fato saiu: real quando informado, senão o previsto. */
export function expenseEffectiveValue(expense: Expense): number {
  if (expense.status === 'canceled') return 0;
  return expense.actualValue ?? expense.expectedValue;
}

/** Quanto já foi pago desta despesa. */
export function expensePaidValue(expense: Expense): number {
  if (expense.status === 'paid') return expense.actualValue ?? expense.expectedValue;
  if (expense.status === 'partially_paid') return expense.actualValue ?? 0;
  return 0;
}

/** Quanto ainda falta pagar desta despesa. */
export function expensePendingValue(expense: Expense): number {
  if (expense.status === 'pending' || expense.status === 'delayed') return expense.expectedValue;
  if (expense.status === 'partially_paid') {
    return Math.max(expense.expectedValue - (expense.actualValue ?? 0), 0);
  }
  return 0;
}

/** Despesa em aberto com vencimento já passado (ou marcada como atrasada). */
export function isOverdue(expense: Expense, today: string): boolean {
  if (expense.status === 'delayed') return true;
  if (expense.status !== 'pending' && expense.status !== 'partially_paid') return false;
  return Boolean(expense.dueDate && expense.dueDate < today);
}

/* ---------------- Totais ---------------- */

function sum<T>(items: readonly T[], value: (item: T) => number): number {
  return round2(items.reduce((acc, item) => acc + value(item), 0));
}

export function sumIncomeExpected(incomes: readonly Income[]): number {
  return sum(incomes, incomeExpectedValue);
}

export function sumIncomeReceived(incomes: readonly Income[]): number {
  return sum(incomes, incomeReceivedValue);
}

export function sumExpenseExpected(expenses: readonly Expense[]): number {
  return sum(expenses, expenseExpectedValue);
}

export function sumExpensePaid(expenses: readonly Expense[]): number {
  return sum(expenses, expensePaidValue);
}

export function sumExpensePending(expenses: readonly Expense[]): number {
  return sum(expenses, expensePendingValue);
}

export function expectedBalance(incomes: readonly Income[], expenses: readonly Expense[]): number {
  return round2(sumIncomeExpected(incomes) - sumExpenseExpected(expenses));
}

export function actualBalance(incomes: readonly Income[], expenses: readonly Expense[]): number {
  return round2(sumIncomeReceived(incomes) - sumExpensePaid(expenses));
}

/* ---------------- Reserva ---------------- */

/**
 * Aporte de reserva: dinheiro separado, não dinheiro perdido.
 * É identificado pelo tipo da despesa ('reserve') ou por categoria especial.
 */
export function isReserveExpense(
  expense: Expense,
  specialCategoryIds: ReadonlySet<string>,
): boolean {
  return expense.expenseType === 'reserve' || specialCategoryIds.has(expense.categoryId);
}

export function specialCategoryIdSet(categories: readonly Category[]): ReadonlySet<string> {
  return new Set(categories.filter((c) => c.type === 'special').map((c) => c.id));
}

/* ---------------- Resumo mensal ---------------- */

export interface MonthSummary {
  expectedIncome: number;
  receivedIncome: number;
  expectedExpense: number;
  paidExpense: number;
  pendingExpense: number;
  expectedBalance: number;
  actualBalance: number;
  /** Aporte de reserva previsto no mês (já incluído nas despesas). */
  reserveExpected: number;
  /** Aporte de reserva já realizado no mês. */
  reservePaid: number;
}

export function buildMonthSummary(
  incomes: readonly Income[],
  expenses: readonly Expense[],
  categories: readonly Category[] = [],
): MonthSummary {
  const specialIds = specialCategoryIdSet(categories);
  const reserveExpenses = expenses.filter((e) => isReserveExpense(e, specialIds));
  return {
    expectedIncome: sumIncomeExpected(incomes),
    receivedIncome: sumIncomeReceived(incomes),
    expectedExpense: sumExpenseExpected(expenses),
    paidExpense: sumExpensePaid(expenses),
    pendingExpense: sumExpensePending(expenses),
    expectedBalance: expectedBalance(incomes, expenses),
    actualBalance: actualBalance(incomes, expenses),
    reserveExpected: sumExpenseExpected(reserveExpenses),
    reservePaid: sumExpensePaid(reserveExpenses),
  };
}

/* ---------------- Agrupamentos ---------------- */

export interface KeyTotal {
  key: string;
  total: number;
}

function groupTotals<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  valueOf: (item: T) => number,
): KeyTotal[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const value = valueOf(item);
    if (value === 0) continue;
    const key = keyOf(item);
    map.set(key, (map.get(key) ?? 0) + value);
  }
  return [...map.entries()]
    .map(([key, total]) => ({ key, total: round2(total) }))
    .sort((a, b) => b.total - a.total);
}

/** Total por categoria, usando o valor efetivo (real quando houver). */
export function groupExpensesByCategory(expenses: readonly Expense[]): KeyTotal[] {
  return groupTotals(expenses, (e) => e.categoryId, expenseEffectiveValue);
}

/** Total por forma de pagamento, usando o valor efetivo. */
export function groupExpensesByPaymentMethod(expenses: readonly Expense[]): KeyTotal[] {
  return groupTotals(expenses, (e) => e.paymentMethodId, expenseEffectiveValue);
}

/* ---------------- Próximas pendências ---------------- */

/** Despesas em aberto ordenadas por vencimento (sem vencimento por último). */
export function upcomingPendingExpenses(
  expenses: readonly Expense[],
  limit = 5,
): Expense[] {
  return expenses
    .filter((e) => expensePendingValue(e) > 0)
    .sort((a, b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99'))
    .slice(0, limit);
}

/* ---------------- Centro de custo (Apto Mooca) ---------------- */

export interface CostCenterResult {
  /** Receita recebida vinculada ao centro de custo (ex.: aluguel). */
  incomeTotal: number;
  /** Custos efetivos do centro de custo. */
  costTotal: number;
  /** resultado = receita - custos (hoje: 0 - custos). */
  result: number;
}

export function costCenterResult(
  expenses: readonly Expense[],
  incomes: readonly Income[],
  categoryId: string,
  incomeType: IncomeType = 'rent_income',
): CostCenterResult {
  const costTotal = sum(
    expenses.filter((e) => e.categoryId === categoryId),
    expenseEffectiveValue,
  );
  const incomeTotal = sum(
    incomes.filter((i) => i.type === incomeType),
    incomeReceivedValue,
  );
  return { incomeTotal, costTotal, result: round2(incomeTotal - costTotal) };
}

/* ---------------- Resumo anual ---------------- */

export interface YearSummary {
  year: number;
  totalIncomeExpected: number;
  totalIncomeReceived: number;
  totalExpenseExpected: number;
  totalExpensePaid: number;
  /** Saldo real do ano: recebido - pago. */
  balance: number;
  byCategory: KeyTotal[];
  byPaymentMethod: KeyTotal[];
  /** Meses do ano com alguma movimentação. */
  monthsWithData: number;
  /** Média mensal de gastos efetivos nos meses com movimentação. */
  monthlyAverageExpense: number;
}

export function buildYearSummary(
  year: number,
  incomes: readonly Income[],
  expenses: readonly Expense[],
): YearSummary {
  const months = new Set<string>();
  for (const e of expenses) {
    if (expenseEffectiveValue(e) > 0) months.add(e.monthRef);
  }
  for (const i of incomes) {
    if (incomeExpectedValue(i) > 0 || incomeReceivedValue(i) > 0) months.add(i.monthRef);
  }

  const totalExpenseEffective = sum(expenses, expenseEffectiveValue);
  const monthsWithData = months.size;

  return {
    year,
    totalIncomeExpected: sumIncomeExpected(incomes),
    totalIncomeReceived: sumIncomeReceived(incomes),
    totalExpenseExpected: sumExpenseExpected(expenses),
    totalExpensePaid: sumExpensePaid(expenses),
    balance: round2(sumIncomeReceived(incomes) - sumExpensePaid(expenses)),
    byCategory: groupExpensesByCategory(expenses),
    byPaymentMethod: groupExpensesByPaymentMethod(expenses),
    monthsWithData,
    monthlyAverageExpense: monthsWithData === 0 ? 0 : round2(totalExpenseEffective / monthsWithData),
  };
}

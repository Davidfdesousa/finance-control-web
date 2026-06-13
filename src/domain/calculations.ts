/**
 * Regras de negócio financeiras — funções puras, sem dependência de UI ou Firebase.
 */
import type { Category, Expense, Income, IncomeType } from './models';
import type {
  ApartmentUnit,
  CreditCard,
  CreditCardInvoice,
  CreditCardInvoiceStatus,
  EmergencyReserve,
  InstallmentGroup,
  RecurringTemplate,
} from './models';
import { round2 } from '../utils/format';
import { parseMonthKey, shiftMonthRef, todayISO } from '../utils/month';

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

/* ---------------- Recorrencias ---------------- */

export function checkRecurringItemAlreadyGenerated(
  template: RecurringTemplate,
  monthRef: string,
  expenses: readonly Expense[],
  incomes: readonly Income[],
): boolean {
  const items = template.kind === 'expense' ? expenses : incomes;
  return items.some((item) => item.monthRef === monthRef && item.recurringTemplateId === template.id);
}

function templateAppliesToMonth(template: RecurringTemplate, monthRef: string): boolean {
  if (!template.isActive) return false;
  if (monthRef < template.startMonthRef) return false;
  if (template.endMonthRef && monthRef > template.endMonthRef) return false;
  if (template.recurrenceFrequency === 'monthly') return true;

  const start = parseMonthKey(template.startMonthRef);
  const target = parseMonthKey(monthRef);
  return start.month === target.month;
}

export function generateRecurringItemsForMonth(
  templates: readonly RecurringTemplate[],
  monthRef: string,
  expenses: readonly Expense[],
  incomes: readonly Income[],
): RecurringTemplate[] {
  return templates.filter(
    (template) =>
      templateAppliesToMonth(template, monthRef) &&
      !checkRecurringItemAlreadyGenerated(template, monthRef, expenses, incomes),
  );
}

export function generateRecurringItemsForRange(
  templates: readonly RecurringTemplate[],
  startMonthRef: string,
  monthCount: number,
  expenses: readonly Expense[],
  incomes: readonly Income[],
): Array<{ template: RecurringTemplate; monthRef: string }> {
  const start = parseMonthKey(startMonthRef);
  const result: Array<{ template: RecurringTemplate; monthRef: string }> = [];
  for (let i = 0; i < monthCount; i += 1) {
    const monthRef = shiftMonthRef(start, i).key;
    for (const template of generateRecurringItemsForMonth(templates, monthRef, expenses, incomes)) {
      result.push({ template, monthRef });
    }
  }
  return result;
}

/* ---------------- Parcelamentos ---------------- */

export function generateInstallments(
  group: InstallmentGroup,
  existingExpenses: readonly Expense[],
): Array<{ monthRef: string; installmentNumber: number; value: number }> {
  const start = parseMonthKey(group.startMonthRef);
  const installments: Array<{ monthRef: string; installmentNumber: number; value: number }> = [];
  for (let i = 0; i < group.installmentCount; i += 1) {
    const monthRef = shiftMonthRef(start, i).key;
    const installmentNumber = i + 1;
    const alreadyGenerated = existingExpenses.some(
      (expense) =>
        expense.installmentGroupId === group.id &&
        expense.installmentNumber === installmentNumber &&
        expense.monthRef === monthRef,
    );
    if (!alreadyGenerated) {
      installments.push({ monthRef, installmentNumber, value: group.installmentValue });
    }
  }
  return installments;
}

export interface InstallmentProgress {
  paidCount: number;
  pendingCount: number;
  totalPaid: number;
  totalRemaining: number;
}

export function calculateInstallmentProgress(
  group: InstallmentGroup,
  expenses: readonly Expense[],
): InstallmentProgress {
  const groupExpenses = expenses.filter((expense) => expense.installmentGroupId === group.id);
  const paidCount = groupExpenses.filter((expense) => expense.status === 'paid').length;
  const totalPaid = sum(groupExpenses, expensePaidValue);
  return {
    paidCount,
    pendingCount: Math.max(group.installmentCount - paidCount, 0),
    totalPaid,
    totalRemaining: round2(Math.max(group.totalValue - totalPaid, 0)),
  };
}

/* ---------------- Faturas de cartao ---------------- */

export function calculateCreditCardInvoiceStatus(
  invoice: Pick<CreditCardInvoice, 'totalExpected' | 'totalPaid' | 'totalPending'>,
  card?: Pick<CreditCard, 'dueDay'>,
  monthRef?: string,
): CreditCardInvoiceStatus {
  if (invoice.totalExpected <= 0) return 'open';
  if (invoice.totalPending <= 0) return 'paid';
  if (invoice.totalPaid > 0) return 'partially_paid';
  if (card?.dueDay && monthRef) {
    const dueDate = `${monthRef}-${String(card.dueDay).padStart(2, '0')}`;
    if (dueDate < todayISO()) return 'overdue';
  }
  return 'open';
}

export function calculateCreditCardInvoice(
  card: CreditCard,
  monthRef: string,
  expenses: readonly Expense[],
): CreditCardInvoice {
  const cardExpenses = expenses.filter(
    (expense) => expense.paymentMethodId === card.paymentMethodId && expense.status !== 'canceled',
  );
  const totalExpected = sumExpenseExpected(cardExpenses);
  const totalPaid = sumExpensePaid(cardExpenses);
  const totalPending = sumExpensePending(cardExpenses);
  const base = { cardId: card.id, monthRef, expenses: cardExpenses, totalExpected, totalPaid, totalPending };
  return {
    ...base,
    status: calculateCreditCardInvoiceStatus(base, card, monthRef),
  };
}

/* ---------------- Reserva estruturada ---------------- */

export interface EmergencyReserveProgress {
  targetValue: number;
  currentValue: number;
  missingValue: number;
  percent: number;
  monthlyTargetValue: number;
  currentMonthPlannedContribution: number;
  currentMonthActualContribution: number;
}

export function calculateEmergencyReserveProgress(
  reserve: EmergencyReserve | null,
): EmergencyReserveProgress {
  const targetValue = reserve?.targetValue ?? 0;
  const currentValue = reserve?.currentValue ?? 0;
  const missingValue = round2(Math.max(targetValue - currentValue, 0));
  const percent = targetValue <= 0 ? 0 : Math.min(100, round2((currentValue / targetValue) * 100));
  return {
    targetValue,
    currentValue,
    missingValue,
    percent,
    monthlyTargetValue: reserve?.monthlyTargetValue ?? 0,
    currentMonthPlannedContribution: reserve?.currentMonthPlannedContribution ?? 0,
    currentMonthActualContribution: reserve?.currentMonthActualContribution ?? 0,
  };
}

export function balanceAfterEmergencyReserve(
  incomes: readonly Income[],
  expenses: readonly Expense[],
  reserve: EmergencyReserve | null,
): number {
  return round2(actualBalance(incomes, expenses) - (reserve?.currentMonthActualContribution ?? 0));
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

export function calculateApartmentCurrentResult(
  apartment: ApartmentUnit | null,
  expenses: readonly Expense[],
  categoryId: string,
): CostCenterResult {
  const costTotal = sum(
    expenses.filter((e) => e.categoryId === categoryId),
    expenseEffectiveValue,
  );
  const incomeTotal = apartment?.status === 'alugado' ? apartment.actualRentValue ?? 0 : 0;
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

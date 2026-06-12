import { where } from 'firebase/firestore';
import type { Expense, ExpenseStatus, ExpenseType } from '../domain/models';
import { deleteUserDoc, listUserDocs, saveUserDoc } from './firestore.repository';
import { generateId } from '../utils/id';
import { nowISO, todayISO } from '../utils/month';
import { round2 } from '../utils/format';

const COLLECTION = 'expenses';

export interface ExpenseInput {
  description: string;
  expectedValue: number;
  actualValue?: number;
  categoryId: string;
  subcategoryId?: string;
  paymentMethodId: string;
  dueDate?: string;
  status: ExpenseStatus;
  expenseType: ExpenseType;
  notes?: string;
}

export async function listExpensesByMonth(uid: string, monthKey: string): Promise<Expense[]> {
  const expenses = await listUserDocs<Expense>(uid, COLLECTION, [
    where('monthRef', '==', monthKey),
  ]);
  return expenses.sort(
    (a, b) =>
      (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99') ||
      a.description.localeCompare(b.description, 'pt-BR'),
  );
}

export async function listExpensesByYear(uid: string, year: number): Promise<Expense[]> {
  return listUserDocs<Expense>(uid, COLLECTION, [
    where('monthRef', '>=', `${year}-01`),
    where('monthRef', '<=', `${year}-12`),
  ]);
}

/** Monta a entidade a partir do formulário, preservando id/createdAt em edições. */
export function buildExpense(
  uid: string,
  monthKey: string,
  input: ExpenseInput,
  existing?: Expense,
): Expense {
  const now = nowISO();
  const expense: Expense = {
    ...existing,
    id: existing?.id ?? generateId(),
    userId: uid,
    monthRef: monthKey,
    description: input.description.trim(),
    expectedValue: round2(input.expectedValue),
    actualValue: input.actualValue !== undefined ? round2(input.actualValue) : undefined,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    paymentMethodId: input.paymentMethodId,
    dueDate: input.dueDate,
    paidDate: existing?.paidDate,
    status: input.status,
    expenseType: input.expenseType,
    notes: input.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (expense.status === 'paid' && !expense.paidDate) expense.paidDate = todayISO();
  if (expense.status === 'pending') delete expense.paidDate;

  return expense;
}

export async function saveExpense(uid: string, expense: Expense): Promise<void> {
  await saveUserDoc(uid, COLLECTION, expense);
}

export async function deleteExpense(uid: string, id: string): Promise<void> {
  await deleteUserDoc(uid, COLLECTION, id);
}

/**
 * Checkbox de pago: marcar preenche paidDate com hoje e status 'paid';
 * desmarcar volta para 'pending' e remove paidDate.
 */
export async function setExpensePaid(
  uid: string,
  expense: Expense,
  paid: boolean,
): Promise<Expense> {
  const updated: Expense = { ...expense, updatedAt: nowISO() };
  if (paid) {
    updated.status = 'paid';
    updated.paidDate = todayISO();
  } else {
    updated.status = 'pending';
    delete updated.paidDate;
  }
  await saveExpense(uid, updated);
  return updated;
}

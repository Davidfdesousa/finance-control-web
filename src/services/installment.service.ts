import { where } from 'firebase/firestore';
import type { Expense, InstallmentGroup } from '../domain/models';
import { calculateInstallmentProgress, generateInstallments } from '../domain/calculations';
import type { InstallmentProgress } from '../domain/calculations';
import { deleteUserDoc, listUserDocs, saveUserDoc } from './firestore.repository';
import { saveExpense } from './expense.service';
import { generateId } from '../utils/id';
import { nowISO } from '../utils/month';
import { round2 } from '../utils/format';

const COLLECTION = 'installmentGroups';

export interface InstallmentGroupInput {
  description: string;
  totalValue: number;
  installmentCount: number;
  startMonthRef: string;
  categoryId: string;
  subcategoryId?: string;
  paymentMethodId: string;
  notes?: string;
}

export async function listInstallmentGroups(uid: string): Promise<InstallmentGroup[]> {
  const groups = await listUserDocs<InstallmentGroup>(uid, COLLECTION);
  return groups.sort((a, b) => b.startMonthRef.localeCompare(a.startMonthRef));
}

export function buildInstallmentGroup(
  uid: string,
  input: InstallmentGroupInput,
  existing?: InstallmentGroup,
): InstallmentGroup {
  const now = nowISO();
  const installmentValue = round2(input.totalValue / input.installmentCount);
  return {
    ...existing,
    id: existing?.id ?? generateId(),
    userId: uid,
    description: input.description.trim(),
    totalValue: round2(input.totalValue),
    installmentCount: input.installmentCount,
    installmentValue,
    startMonthRef: input.startMonthRef,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    paymentMethodId: input.paymentMethodId,
    notes: input.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function saveInstallmentGroup(uid: string, group: InstallmentGroup): Promise<void> {
  await saveUserDoc(uid, COLLECTION, group);
}

export async function deleteInstallmentGroup(uid: string, id: string): Promise<void> {
  await deleteUserDoc(uid, COLLECTION, id);
}

export async function listExpensesForInstallmentGroup(
  uid: string,
  groupId: string,
): Promise<Expense[]> {
  const expenses = await listUserDocs<Expense>(uid, 'expenses', [
    where('installmentGroupId', '==', groupId),
  ]);
  return expenses.sort(
    (a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0),
  );
}

function expenseFromInstallment(
  uid: string,
  group: InstallmentGroup,
  monthRef: string,
  installmentNumber: number,
): Expense {
  const now = nowISO();
  return {
    id: generateId(),
    userId: uid,
    monthRef,
    description: `${group.description} ${installmentNumber}/${group.installmentCount}`,
    expectedValue: group.installmentValue,
    categoryId: group.categoryId,
    subcategoryId: group.subcategoryId,
    paymentMethodId: group.paymentMethodId,
    status: 'pending',
    expenseType: 'occasional',
    notes: group.notes,
    installmentGroupId: group.id,
    installmentNumber,
    installmentCount: group.installmentCount,
    createdAt: now,
    updatedAt: now,
  };
}

export async function generateInstallmentExpenses(
  uid: string,
  group: InstallmentGroup,
): Promise<Expense[]> {
  const existing = await listExpensesForInstallmentGroup(uid, group.id);
  const generated: Expense[] = [];
  for (const installment of generateInstallments(group, existing)) {
    const expense = expenseFromInstallment(
      uid,
      group,
      installment.monthRef,
      installment.installmentNumber,
    );
    await saveExpense(uid, expense);
    generated.push(expense);
  }
  return generated;
}

export async function createInstallmentGroupWithExpenses(
  uid: string,
  input: InstallmentGroupInput,
): Promise<{ group: InstallmentGroup; expenses: Expense[] }> {
  const group = buildInstallmentGroup(uid, input);
  await saveInstallmentGroup(uid, group);
  const expenses = await generateInstallmentExpenses(uid, group);
  return { group, expenses };
}

export async function getInstallmentProgress(
  uid: string,
  group: InstallmentGroup,
): Promise<InstallmentProgress> {
  const expenses = await listExpensesForInstallmentGroup(uid, group.id);
  return calculateInstallmentProgress(group, expenses);
}

import { where } from 'firebase/firestore';
import type { Income, IncomeStatus, IncomeType } from '../domain/models';
import { deleteUserDoc, listUserDocs, saveUserDoc } from './firestore.repository';
import { generateId } from '../utils/id';
import { nowISO, todayISO } from '../utils/month';
import { round2 } from '../utils/format';

const COLLECTION = 'incomes';

export interface IncomeInput {
  description: string;
  expectedValue: number;
  receivedValue?: number;
  type: IncomeType;
  expectedDate?: string;
  status: IncomeStatus;
  notes?: string;
}

export async function listIncomesByMonth(uid: string, monthKey: string): Promise<Income[]> {
  const incomes = await listUserDocs<Income>(uid, COLLECTION, [
    where('monthRef', '==', monthKey),
  ]);
  return incomes.sort(
    (a, b) =>
      (a.expectedDate ?? '9999-99-99').localeCompare(b.expectedDate ?? '9999-99-99') ||
      a.description.localeCompare(b.description, 'pt-BR'),
  );
}

export async function listIncomesByYear(uid: string, year: number): Promise<Income[]> {
  return listUserDocs<Income>(uid, COLLECTION, [
    where('monthRef', '>=', `${year}-01`),
    where('monthRef', '<=', `${year}-12`),
  ]);
}

/** Monta a entidade a partir do formulário, preservando id/createdAt em edições. */
export function buildIncome(
  uid: string,
  monthKey: string,
  input: IncomeInput,
  existing?: Income,
): Income {
  const now = nowISO();
  const income: Income = {
    ...existing,
    id: existing?.id ?? generateId(),
    userId: uid,
    monthRef: monthKey,
    description: input.description.trim(),
    expectedValue: round2(input.expectedValue),
    receivedValue: input.receivedValue !== undefined ? round2(input.receivedValue) : undefined,
    type: input.type,
    expectedDate: input.expectedDate,
    receivedDate: existing?.receivedDate,
    status: input.status,
    notes: input.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (income.status === 'received' && !income.receivedDate) income.receivedDate = todayISO();
  if (income.status === 'expected') delete income.receivedDate;

  return income;
}

export async function saveIncome(uid: string, income: Income): Promise<void> {
  await saveUserDoc(uid, COLLECTION, income);
}

export async function deleteIncome(uid: string, id: string): Promise<void> {
  await deleteUserDoc(uid, COLLECTION, id);
}

/** Marca/desmarca a receita como recebida. */
export async function setIncomeReceived(
  uid: string,
  income: Income,
  received: boolean,
): Promise<Income> {
  const updated: Income = { ...income, updatedAt: nowISO() };
  if (received) {
    updated.status = 'received';
    updated.receivedDate = todayISO();
  } else {
    updated.status = 'expected';
    delete updated.receivedDate;
  }
  await saveIncome(uid, updated);
  return updated;
}

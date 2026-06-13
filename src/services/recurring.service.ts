import type {
  Expense,
  Income,
  RecurringTemplate,
  RecurrenceFrequency,
} from '../domain/models';
import { deleteUserDoc, listUserDocs, saveUserDoc } from './firestore.repository';
import { generateId } from '../utils/id';
import { nowISO, parseMonthKey, shiftMonthRef } from '../utils/month';
import { round2 } from '../utils/format';
import { listExpensesByMonth, saveExpense } from './expense.service';
import { listIncomesByMonth, saveIncome } from './income.service';
import { generateRecurringItemsForMonth } from '../domain/calculations';

const COLLECTION = 'recurringTemplates';

export interface RecurringTemplateInput {
  kind: 'income' | 'expense';
  description: string;
  expectedValue: number;
  categoryId: string;
  subcategoryId?: string;
  paymentMethodId?: string;
  incomeType?: RecurringTemplate['incomeType'];
  expenseType?: RecurringTemplate['expenseType'];
  recurrenceFrequency: RecurrenceFrequency;
  startMonthRef: string;
  endMonthRef?: string;
  dueDay?: number;
  isActive: boolean;
  notes?: string;
}

export async function listRecurringTemplates(uid: string): Promise<RecurringTemplate[]> {
  const templates = await listUserDocs<RecurringTemplate>(uid, COLLECTION);
  return templates.sort((a, b) => a.description.localeCompare(b.description, 'pt-BR'));
}

export function buildRecurringTemplate(
  uid: string,
  input: RecurringTemplateInput,
  existing?: RecurringTemplate,
): RecurringTemplate {
  const now = nowISO();
  return {
    ...existing,
    id: existing?.id ?? generateId(),
    userId: uid,
    kind: input.kind,
    description: input.description.trim(),
    expectedValue: round2(input.expectedValue),
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    paymentMethodId: input.paymentMethodId,
    incomeType: input.incomeType,
    expenseType: input.expenseType,
    recurrenceFrequency: input.recurrenceFrequency,
    startMonthRef: input.startMonthRef,
    endMonthRef: input.endMonthRef,
    dueDay: input.dueDay,
    isActive: input.isActive,
    notes: input.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function saveRecurringTemplate(uid: string, template: RecurringTemplate): Promise<void> {
  await saveUserDoc(uid, COLLECTION, template);
}

export async function deleteRecurringTemplate(uid: string, id: string): Promise<void> {
  await deleteUserDoc(uid, COLLECTION, id);
}

export async function setRecurringTemplateActive(
  uid: string,
  template: RecurringTemplate,
  isActive: boolean,
): Promise<RecurringTemplate> {
  const updated: RecurringTemplate = { ...template, isActive, updatedAt: nowISO() };
  await saveRecurringTemplate(uid, updated);
  return updated;
}

function dueDateFor(monthRef: string, dueDay?: number): string | undefined {
  if (!dueDay) return undefined;
  const [year, month] = monthRef.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthRef}-${String(Math.min(dueDay, lastDay)).padStart(2, '0')}`;
}

function expenseFromTemplate(uid: string, template: RecurringTemplate, monthRef: string): Expense {
  const now = nowISO();
  return {
    id: generateId(),
    userId: uid,
    monthRef,
    description: template.description,
    expectedValue: template.expectedValue,
    categoryId: template.categoryId,
    subcategoryId: template.subcategoryId,
    paymentMethodId: template.paymentMethodId ?? 'outro',
    dueDate: dueDateFor(monthRef, template.dueDay),
    status: 'pending',
    expenseType: template.expenseType ?? 'fixed',
    notes: template.notes,
    recurringTemplateId: template.id,
    createdAt: now,
    updatedAt: now,
  };
}

function incomeFromTemplate(uid: string, template: RecurringTemplate, monthRef: string): Income {
  const now = nowISO();
  return {
    id: generateId(),
    userId: uid,
    monthRef,
    description: template.description,
    expectedValue: template.expectedValue,
    type: template.incomeType ?? 'other',
    expectedDate: dueDateFor(monthRef, template.dueDay),
    status: 'expected',
    notes: template.notes,
    recurringTemplateId: template.id,
    createdAt: now,
    updatedAt: now,
  };
}

export async function generateRecurringForMonth(
  uid: string,
  monthRef: string,
): Promise<{ expenses: Expense[]; incomes: Income[] }> {
  const [templates, expenses, incomes] = await Promise.all([
    listRecurringTemplates(uid),
    listExpensesByMonth(uid, monthRef),
    listIncomesByMonth(uid, monthRef),
  ]);
  const toGenerate = generateRecurringItemsForMonth(templates, monthRef, expenses, incomes);
  const generatedExpenses: Expense[] = [];
  const generatedIncomes: Income[] = [];

  for (const template of toGenerate) {
    if (template.kind === 'expense') {
      const expense = expenseFromTemplate(uid, template, monthRef);
      await saveExpense(uid, expense);
      generatedExpenses.push(expense);
    } else {
      const income = incomeFromTemplate(uid, template, monthRef);
      await saveIncome(uid, income);
      generatedIncomes.push(income);
    }
  }
  return { expenses: generatedExpenses, incomes: generatedIncomes };
}

export async function generateRecurringForNextMonths(
  uid: string,
  startMonthRef: string,
  monthCount = 6,
): Promise<{ expenses: Expense[]; incomes: Income[] }> {
  const generatedExpenses: Expense[] = [];
  const generatedIncomes: Income[] = [];
  const start = parseMonthKey(startMonthRef);
  for (let i = 0; i < monthCount; i += 1) {
    const monthRef = shiftMonthRef(start, i).key;
    const generated = await generateRecurringForMonth(uid, monthRef);
    generatedExpenses.push(...generated.expenses);
    generatedIncomes.push(...generated.incomes);
  }
  return { expenses: generatedExpenses, incomes: generatedIncomes };
}

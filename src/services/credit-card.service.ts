import type { CreditCard, CreditCardInvoice, Expense, PaymentMethod } from '../domain/models';
import { calculateCreditCardInvoice } from '../domain/calculations';
import { listUserDocs, saveUserDoc } from './firestore.repository';
import { listExpensesByMonth } from './expense.service';
import { nowISO } from '../utils/month';
import { round2 } from '../utils/format';

const COLLECTION = 'creditCards';

const DEFAULT_CARDS: Array<Pick<CreditCard, 'id' | 'name' | 'bankName' | 'paymentMethodId'>> = [
  { id: 'cartao-itau', name: 'Cartao Itau', bankName: 'Itau', paymentMethodId: 'cartao-itau' },
  { id: 'cartao-nubank', name: 'Cartao Nubank', bankName: 'Nubank', paymentMethodId: 'cartao-nubank' },
];

export interface CreditCardInput {
  name: string;
  bankName?: string;
  brand?: string;
  closingDay?: number;
  dueDay?: number;
  limit?: number;
  isActive: boolean;
  paymentMethodId: string;
}

export function buildCreditCard(
  uid: string,
  input: CreditCardInput,
  existing?: CreditCard,
): CreditCard {
  const now = nowISO();
  return {
    ...existing,
    id: existing?.id ?? input.paymentMethodId,
    userId: uid,
    name: input.name.trim(),
    bankName: input.bankName,
    brand: input.brand,
    closingDay: input.closingDay,
    dueDay: input.dueDay,
    limit: input.limit !== undefined ? round2(input.limit) : undefined,
    isActive: input.isActive,
    paymentMethodId: input.paymentMethodId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function saveCreditCard(uid: string, card: CreditCard): Promise<void> {
  await saveUserDoc(uid, COLLECTION, card);
}

async function ensureDefaultCards(
  uid: string,
  cards: CreditCard[],
  paymentMethods: readonly PaymentMethod[],
): Promise<CreditCard[]> {
  const now = nowISO();
  const next = [...cards];
  for (const seed of DEFAULT_CARDS) {
    if (next.some((card) => card.id === seed.id)) continue;
    const method = paymentMethods.find((item) => item.id === seed.paymentMethodId);
    if (!method || method.type !== 'credit_card') continue;
    const card: CreditCard = {
      ...seed,
      name: method.name,
      userId: uid,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await saveCreditCard(uid, card);
    next.push(card);
  }
  return next;
}

export async function listCreditCards(
  uid: string,
  paymentMethods: readonly PaymentMethod[] = [],
): Promise<CreditCard[]> {
  const cards = await ensureDefaultCards(
    uid,
    await listUserDocs<CreditCard>(uid, COLLECTION),
    paymentMethods,
  );
  return cards.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function getCreditCardInvoicesForMonth(
  uid: string,
  monthRef: string,
  paymentMethods: readonly PaymentMethod[],
): Promise<CreditCardInvoice[]> {
  const [cards, expenses] = await Promise.all([
    listCreditCards(uid, paymentMethods),
    listExpensesByMonth(uid, monthRef),
  ]);
  return cards
    .filter((card) => card.isActive)
    .map((card) => calculateCreditCardInvoice(card, monthRef, expenses));
}

export function calculateInvoiceFromExpenses(
  card: CreditCard,
  monthRef: string,
  expenses: readonly Expense[],
): CreditCardInvoice {
  return calculateCreditCardInvoice(card, monthRef, expenses);
}

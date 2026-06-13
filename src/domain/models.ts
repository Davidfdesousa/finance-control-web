/**
 * Modelos de domínio do MVP 1.
 * Datas pontuais (vencimento, pagamento) usam string `YYYY-MM-DD`;
 * timestamps (createdAt/updatedAt) usam string ISO 8601.
 * Valores monetários são números em reais (arredondados a 2 casas ao salvar).
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoURL: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthRef {
  year: number;
  month: number; // 1..12
  key: string; // 'YYYY-MM'
}

/* ---------------- Receitas ---------------- */

export const INCOME_STATUSES = ['expected', 'received', 'delayed', 'canceled'] as const;
export type IncomeStatus = (typeof INCOME_STATUSES)[number];

export const INCOME_STATUS_LABELS: Record<IncomeStatus, string> = {
  expected: 'Previsto',
  received: 'Recebido',
  delayed: 'Atrasado',
  canceled: 'Cancelado',
};

export const INCOME_TYPES = [
  'salary',
  'external_help',
  'freelance',
  'reimbursement',
  'rent_income',
  'other',
] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salary: 'Salário',
  external_help: 'Ajuda externa',
  freelance: 'Freela',
  reimbursement: 'Reembolso',
  rent_income: 'Aluguel recebido',
  other: 'Outros',
};

export interface Income {
  id: string;
  userId: string;
  monthRef: string; // 'YYYY-MM'
  description: string;
  expectedValue: number;
  receivedValue?: number;
  type: IncomeType;
  expectedDate?: string;
  receivedDate?: string;
  status: IncomeStatus;
  notes?: string;
  recurringTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- Despesas ---------------- */

export const EXPENSE_STATUSES = [
  'pending',
  'paid',
  'partially_paid',
  'delayed',
  'canceled',
] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: 'Pendente',
  paid: 'Paga',
  partially_paid: 'Parcial',
  delayed: 'Atrasada',
  canceled: 'Cancelada',
};

export const EXPENSE_TYPES = ['fixed', 'variable', 'occasional', 'reserve', 'investment'] as const;
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  fixed: 'Fixa',
  variable: 'Variável',
  occasional: 'Eventual',
  reserve: 'Reserva',
  investment: 'Investimento',
};

export interface Expense {
  id: string;
  userId: string;
  monthRef: string; // 'YYYY-MM'
  description: string;
  expectedValue: number;
  actualValue?: number;
  categoryId: string;
  subcategoryId?: string;
  paymentMethodId: string;
  dueDate?: string;
  paidDate?: string;
  status: ExpenseStatus;
  expenseType: ExpenseType;
  notes?: string;
  isRecurringCandidate?: boolean;
  recurringTemplateId?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentCount?: number;
  creditCardInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- Recorrencias ---------------- */

export const RECURRENCE_FREQUENCIES = ['monthly', 'yearly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
};

export interface RecurringTemplate {
  id: string;
  userId: string;
  kind: 'income' | 'expense';
  description: string;
  expectedValue: number;
  categoryId: string;
  subcategoryId?: string;
  paymentMethodId?: string;
  incomeType?: IncomeType;
  expenseType?: ExpenseType;
  recurrenceFrequency: RecurrenceFrequency;
  startMonthRef: string;
  endMonthRef?: string;
  dueDay?: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- Parcelamentos ---------------- */

export interface InstallmentGroup {
  id: string;
  userId: string;
  description: string;
  totalValue: number;
  installmentCount: number;
  installmentValue: number;
  startMonthRef: string;
  categoryId: string;
  subcategoryId?: string;
  paymentMethodId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- Categorias ---------------- */

export const CATEGORY_TYPES = ['income', 'expense', 'special'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  isDefault: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  isDefault: boolean;
  subcategories: Subcategory[];
  createdAt: string;
  updatedAt: string;
}

/* ---------------- Formas de pagamento ---------------- */

export const PAYMENT_METHOD_TYPES = [
  'debit',
  'credit_card',
  'pix',
  'cash',
  'bank_slip',
  'bank_transfer',
  'other',
] as const;
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  debit: 'Débito',
  credit_card: 'Cartão de crédito',
  pix: 'Pix',
  cash: 'Dinheiro',
  bank_slip: 'Boleto',
  bank_transfer: 'Transferência',
  other: 'Outro',
};

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- Cartoes ---------------- */

export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  bankName?: string;
  brand?: string;
  closingDay?: number;
  dueDay?: number;
  limit?: number;
  isActive: boolean;
  paymentMethodId: string;
  createdAt: string;
  updatedAt: string;
}

export const CREDIT_CARD_INVOICE_STATUSES = [
  'open',
  'closed',
  'paid',
  'partially_paid',
  'overdue',
] as const;
export type CreditCardInvoiceStatus = (typeof CREDIT_CARD_INVOICE_STATUSES)[number];

export const CREDIT_CARD_INVOICE_STATUS_LABELS: Record<CreditCardInvoiceStatus, string> = {
  open: 'Aberta',
  closed: 'Fechada',
  paid: 'Paga',
  partially_paid: 'Parcial',
  overdue: 'Vencida',
};

export interface CreditCardInvoice {
  cardId: string;
  monthRef: string;
  expenses: Expense[];
  totalExpected: number;
  totalPaid: number;
  totalPending: number;
  status: CreditCardInvoiceStatus;
}

/* ---------------- Reserva de emergencia ---------------- */

export interface EmergencyReserve {
  id: string;
  userId: string;
  targetValue: number;
  currentValue: number;
  monthlyTargetValue: number;
  currentMonthPlannedContribution: number;
  currentMonthActualContribution: number;
  updatedAt: string;
}

/* ---------------- Centro de custo: Apto Mooca ---------------- */

export const PROPERTY_STATUSES = ['nao_alugado', 'em_reforma', 'anunciado', 'alugado'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  nao_alugado: 'Não alugado',
  em_reforma: 'Em reforma',
  anunciado: 'Anunciado',
  alugado: 'Alugado',
};

export interface ApartmentUnit {
  id: string;
  userId: string;
  name: string;
  status: PropertyStatus;
  expectedRentValue?: number;
  actualRentValue?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Configurações do usuário (guardadas no documento users/{uid}). */
export interface UserSettings {
  /** Status do imóvel Apto Mooca (centro de custo). */
  aptoMoocaStatus: PropertyStatus;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  aptoMoocaStatus: 'nao_alugado',
};

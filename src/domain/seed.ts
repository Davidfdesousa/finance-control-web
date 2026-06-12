/**
 * Dados padrão criados no primeiro login do usuário.
 * IDs são slugs estáveis para facilitar referências (ex.: relatórios, faturas no MVP 2).
 */
import type {
  Category,
  CategoryType,
  PaymentMethod,
  PaymentMethodType,
  Subcategory,
} from './models';

export const APTO_MOOCA_CATEGORY_ID = 'apto-mooca';
export const RESERVE_CATEGORY_ID = 'reserva';

function makeSubcategories(categoryId: string, entries: Array<[string, string]>): Subcategory[] {
  return entries.map(([id, name]) => ({
    id: `${categoryId}-${id}`,
    name,
    categoryId,
    isDefault: true,
  }));
}

function makeCategory(
  now: string,
  id: string,
  name: string,
  type: CategoryType,
  icon: string,
  color: string,
  subEntries: Array<[string, string]> = [],
): Category {
  return {
    id,
    name,
    type,
    icon,
    color,
    isDefault: true,
    subcategories: makeSubcategories(id, subEntries),
    createdAt: now,
    updatedAt: now,
  };
}

export function buildDefaultCategories(now: string): Category[] {
  return [
    // Receitas
    makeCategory(now, 'salario', 'Salário', 'income', '💼', '#1b4d3e'),
    makeCategory(now, 'ajuda-externa', 'Ajuda externa', 'income', '🤝', '#2f7d4f'),
    makeCategory(now, 'freela', 'Freela', 'income', '🧑‍💻', '#3b6ea5'),
    makeCategory(now, 'reembolso', 'Reembolso', 'income', '↩️', '#6b21a8'),
    makeCategory(now, 'aluguel-recebido', 'Aluguel recebido', 'income', '🏢', '#a96812'),
    makeCategory(now, 'outros-receitas', 'Outros', 'income', '➕', '#5c6a61'),

    // Despesas
    makeCategory(now, 'moradia', 'Moradia', 'expense', '🏠', '#1b4d3e', [
      ['aluguel', 'Aluguel'],
    ]),
    makeCategory(now, APTO_MOOCA_CATEGORY_ID, 'Apto Mooca', 'expense', '🏢', '#a96812', [
      ['parcela', 'Parcela'],
      ['condominio', 'Condomínio'],
      ['enel', 'Enel'],
      ['reforma', 'Reforma'],
      ['manutencao', 'Manutenção'],
    ]),
    makeCategory(now, 'carro', 'Carro', 'expense', '🚗', '#3b6ea5', [
      ['gasolina', 'Gasolina'],
      ['seguro', 'Seguro'],
      ['manutencao', 'Manutenção'],
      ['ipva', 'IPVA'],
      ['estacionamento', 'Estacionamento'],
      ['multas', 'Multas'],
    ]),
    makeCategory(now, 'saude', 'Saúde', 'expense', '🩺', '#b3402a', [
      ['psicologo', 'Psicólogo'],
      ['venvanse', 'Venvanse'],
      ['bupropiona', 'Bupropiona'],
      ['convenio-mae', 'Convênio mãe'],
      ['consultas', 'Consultas'],
      ['exames', 'Exames'],
      ['farmacia', 'Farmácia'],
    ]),
    makeCategory(now, 'pets', 'Pets', 'expense', '🐾', '#7c5e2a', [
      ['petlove', 'Petlove'],
      ['racao', 'Ração'],
      ['areia', 'Areia'],
      ['veterinario', 'Veterinário'],
      ['medicamentos', 'Medicamentos'],
    ]),
    makeCategory(now, 'assinaturas', 'Assinaturas', 'expense', '🔁', '#6b21a8', [
      ['gpt', 'GPT'],
      ['claude', 'Claude'],
      ['grok', 'Grok'],
      ['spotify', 'Spotify'],
      ['icloud', 'iCloud'],
      ['crunchyroll', 'Crunchyroll'],
      ['youtube', 'YouTube'],
    ]),

    // Reserva: categoria especial — dinheiro separado, não dinheiro perdido
    makeCategory(now, RESERVE_CATEGORY_ID, 'Reserva', 'special', '🛟', '#2f7d4f', [
      ['emergencia', 'Reserva de emergência'],
    ]),

    makeCategory(now, 'outros-despesas', 'Outros', 'expense', '📦', '#5c6a61'),
  ];
}

function makePaymentMethod(
  now: string,
  id: string,
  name: string,
  type: PaymentMethodType,
): PaymentMethod {
  return { id, name, type, isDefault: true, createdAt: now, updatedAt: now };
}

export function buildDefaultPaymentMethods(now: string): PaymentMethod[] {
  return [
    // Cartões são FORMA DE PAGAMENTO, nunca categoria de gasto (evita duplicidade
    // e prepara o agrupamento de faturas no MVP 2)
    makePaymentMethod(now, 'cartao-itau', 'Cartão Itaú', 'credit_card'),
    makePaymentMethod(now, 'cartao-nubank', 'Cartão Nubank', 'credit_card'),
    makePaymentMethod(now, 'pix', 'Pix', 'pix'),
    makePaymentMethod(now, 'debito', 'Débito', 'debit'),
    makePaymentMethod(now, 'boleto', 'Boleto', 'bank_slip'),
    makePaymentMethod(now, 'transferencia', 'Transferência', 'bank_transfer'),
    makePaymentMethod(now, 'dinheiro', 'Dinheiro', 'cash'),
    makePaymentMethod(now, 'outro', 'Outro', 'other'),
  ];
}

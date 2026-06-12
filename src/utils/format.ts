const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCurrencyBRL(value: number): string {
  return brlFormatter.format(round2(value));
}

/**
 * Converte texto digitado pelo usuário em número.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 50" etc.
 * Retorna null quando o texto não representa um número.
 */
export function parseCurrencyBRL(text: string): number | null {
  const cleaned = text.replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;

  let normalized: string;
  if (cleaned.includes(',')) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    const parts = cleaned.split('.');
    const looksLikeThousands =
      parts.length > 2 || (parts.length === 2 && parts[1].length === 3);
    normalized = looksLikeThousands ? cleaned.replace(/\./g, '') : cleaned;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return round2(value);
}

/** Converte 'YYYY-MM-DD' em 'DD/MM/YYYY'. */
export function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

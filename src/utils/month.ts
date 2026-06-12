import type { MonthRef } from '../domain/models';

export function createMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function createMonthRef(year: number, month: number): MonthRef {
  return { year, month, key: createMonthKey(year, month) };
}

export function parseMonthKey(key: string): MonthRef {
  const [yearPart, monthPart] = key.split('-');
  return createMonthRef(Number(yearPart), Number(monthPart));
}

export function getCurrentMonthRef(): MonthRef {
  const now = new Date();
  return createMonthRef(now.getFullYear(), now.getMonth() + 1);
}

export function shiftMonthRef(ref: MonthRef, delta: number): MonthRef {
  const totalMonths = ref.year * 12 + (ref.month - 1) + delta;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths - year * 12) + 1;
  return createMonthRef(year, month);
}

/** Ex.: 'Junho de 2026'. */
export function monthRefLabel(ref: MonthRef): string {
  const date = new Date(ref.year, ref.month - 1, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Data local de hoje em 'YYYY-MM-DD'. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Timestamp ISO 8601 de agora. */
export function nowISO(): string {
  return new Date().toISOString();
}

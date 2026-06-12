import type { Expense } from '../../domain/models';
import { EXPENSE_STATUS_LABELS } from '../../domain/models';
import { expenseEffectiveValue, isOverdue } from '../../domain/calculations';
import { formatCurrencyBRL, formatDateBR } from '../../utils/format';
import { todayISO } from '../../utils/month';
import { ICON_EDIT, ICON_TRASH } from '../icons';
import type { UiCheckbox } from '../ui/ui-checkbox';
import '../ui/ui-checkbox';

export interface ExpenseItemData {
  expense: Expense;
  categoryLabel: string;
  subcategoryLabel?: string;
  paymentLabel: string;
}

/** Linha de despesa (light DOM, estilizada pelo CSS global). */
export class ExpenseItem extends HTMLElement {
  private itemData: ExpenseItemData | null = null;

  set data(value: ExpenseItemData) {
    this.itemData = value;
    this.render();
  }

  private render(): void {
    if (!this.itemData) return;
    const { expense, categoryLabel, subcategoryLabel, paymentLabel } = this.itemData;
    const overdue = isOverdue(expense, todayISO());
    const statusKey = overdue && expense.status === 'pending' ? 'delayed' : expense.status;
    const statusLabel = overdue && expense.status === 'pending'
      ? 'Atrasada'
      : EXPENSE_STATUS_LABELS[expense.status];
    const paid = expense.status === 'paid';
    const value = expenseEffectiveValue(expense);
    const showExpectedHint =
      expense.actualValue !== undefined && expense.actualValue !== expense.expectedValue;

    this.innerHTML = `
      <div class="item-row">
        <ui-checkbox label="Marcar ${escapeHtml(expense.description)} como paga"
          ${paid ? 'checked' : ''}></ui-checkbox>
        <div class="item-main">
          <p class="item-title ${paid ? 'done' : ''}">${escapeHtml(expense.description)}</p>
          <div class="item-meta">
            <span class="tag">${escapeHtml(categoryLabel)}${
              subcategoryLabel ? ` · ${escapeHtml(subcategoryLabel)}` : ''
            }</span>
            <span class="tag">${escapeHtml(paymentLabel)}</span>
            ${expense.dueDate ? `<span>Vence ${formatDateBR(expense.dueDate)}</span>` : ''}
            <span class="badge ${statusKey}">${statusLabel}</span>
          </div>
        </div>
        <div class="item-side">
          <span class="money ${expense.status === 'canceled' ? 'muted' : ''}">${formatCurrencyBRL(value)}</span>
          ${
            showExpectedHint
              ? `<span class="small muted">prev. ${formatCurrencyBRL(expense.expectedValue)}</span>`
              : ''
          }
          <span class="row" style="gap:0">
            <button type="button" class="icon-btn" data-action="edit" aria-label="Editar despesa">${ICON_EDIT}</button>
            <button type="button" class="icon-btn danger" data-action="delete" aria-label="Excluir despesa">${ICON_TRASH}</button>
          </span>
        </div>
      </div>
    `;

    const checkbox = this.querySelector('ui-checkbox') as UiCheckbox;
    checkbox.addEventListener('change', (event) => {
      const detail = (event as CustomEvent<{ checked: boolean }>).detail;
      this.dispatchEvent(
        new CustomEvent('toggle-paid', {
          bubbles: true,
          detail: { expense, paid: detail.checked },
        }),
      );
    });

    this.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('edit', { bubbles: true, detail: { expense } }));
    });
    this.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('delete', { bubbles: true, detail: { expense } }));
    });
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

customElements.define('expense-item', ExpenseItem);

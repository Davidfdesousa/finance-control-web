import type { Expense } from '../../domain/models';
import { EXPENSE_STATUS_LABELS } from '../../domain/models';
import { expenseEffectiveValue } from '../../domain/calculations';
import { formatCurrencyBRL } from '../../utils/format';
import { escapeHtml } from '../../utils/escape';
import type { UiCheckbox } from '../ui/ui-checkbox';
import '../ui/ui-checkbox';

export class CreditCardInvoiceItem extends HTMLElement {
  set expense(expense: Expense) {
    const paid = expense.status === 'paid';
    this.innerHTML = `
      <div class="item-row">
        <ui-checkbox label="Marcar ${escapeHtml(expense.description)} como paga" ${paid ? 'checked' : ''}></ui-checkbox>
        <div class="item-main">
          <p class="item-title ${paid ? 'done' : ''}">${escapeHtml(expense.description)}</p>
          <div class="item-meta">
            <span class="badge ${expense.status}">${EXPENSE_STATUS_LABELS[expense.status]}</span>
            ${expense.installmentNumber ? `<span>${expense.installmentNumber}/${expense.installmentCount}</span>` : ''}
          </div>
        </div>
        <span class="money">${formatCurrencyBRL(expenseEffectiveValue(expense))}</span>
      </div>
    `;
    (this.querySelector('ui-checkbox') as UiCheckbox).addEventListener('change', (event) => {
      const checked = (event as CustomEvent<{ checked: boolean }>).detail.checked;
      this.dispatchEvent(
        new CustomEvent('toggle-paid', {
          bubbles: true,
          detail: { expense, paid: checked },
        }),
      );
    });
  }
}

customElements.define('credit-card-invoice-item', CreditCardInvoiceItem);

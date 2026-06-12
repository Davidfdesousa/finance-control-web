import type { Income } from '../../domain/models';
import { INCOME_STATUS_LABELS, INCOME_TYPE_LABELS } from '../../domain/models';
import { incomeReceivedValue } from '../../domain/calculations';
import { formatCurrencyBRL, formatDateBR } from '../../utils/format';
import { ICON_EDIT, ICON_TRASH } from '../icons';
import type { UiCheckbox } from '../ui/ui-checkbox';
import '../ui/ui-checkbox';
import '../ui/ui-card';

/**
 * Lista de receitas do mês. Dispara 'toggle-received', 'edit' e 'delete'
 * (detail: { income, received? }).
 */
export class IncomeList extends HTMLElement {
  set items(incomes: Income[]) {
    this.innerHTML = '';
    if (incomes.length === 0) return;

    const card = document.createElement('ui-card');
    card.setAttribute('pad', 'sm');
    for (const income of incomes) {
      card.appendChild(this.buildRow(income));
    }
    this.appendChild(card);
  }

  private buildRow(income: Income): HTMLElement {
    const row = document.createElement('div');
    row.className = 'item-row';
    const received = income.status === 'received';
    const receivedAmount = incomeReceivedValue(income);
    const showExpectedHint = received && receivedAmount !== income.expectedValue;

    row.innerHTML = `
      <ui-checkbox label="Marcar ${escapeHtml(income.description)} como recebida"
        ${received ? 'checked' : ''}></ui-checkbox>
      <div class="item-main">
        <p class="item-title">${escapeHtml(income.description)}</p>
        <div class="item-meta">
          <span class="tag">${INCOME_TYPE_LABELS[income.type]}</span>
          ${income.expectedDate ? `<span>Prev. ${formatDateBR(income.expectedDate)}</span>` : ''}
          <span class="badge ${income.status}">${INCOME_STATUS_LABELS[income.status]}</span>
        </div>
      </div>
      <div class="item-side">
        <span class="money ${received ? 'pos' : ''}">${formatCurrencyBRL(
          received ? receivedAmount : income.expectedValue,
        )}</span>
        ${
          showExpectedHint
            ? `<span class="small muted">prev. ${formatCurrencyBRL(income.expectedValue)}</span>`
            : ''
        }
        <span class="row" style="gap:0">
          <button type="button" class="icon-btn" data-action="edit" aria-label="Editar receita">${ICON_EDIT}</button>
          <button type="button" class="icon-btn danger" data-action="delete" aria-label="Excluir receita">${ICON_TRASH}</button>
        </span>
      </div>
    `;

    (row.querySelector('ui-checkbox') as UiCheckbox).addEventListener('change', (event) => {
      const detail = (event as CustomEvent<{ checked: boolean }>).detail;
      this.dispatchEvent(
        new CustomEvent('toggle-received', {
          bubbles: true,
          detail: { income, received: detail.checked },
        }),
      );
    });
    row.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('edit', { bubbles: true, detail: { income } }));
    });
    row.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('delete', { bubbles: true, detail: { income } }));
    });

    return row;
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

customElements.define('income-list', IncomeList);

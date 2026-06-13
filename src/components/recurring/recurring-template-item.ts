import type { RecurringTemplate } from '../../domain/models';
import { RECURRENCE_FREQUENCY_LABELS } from '../../domain/models';
import { formatCurrencyBRL } from '../../utils/format';
import { escapeHtml } from '../../utils/escape';
import { ICON_EDIT, ICON_TRASH } from '../icons';

export interface RecurringTemplateItemData {
  template: RecurringTemplate;
  categoryLabel: string;
  paymentLabel?: string;
}

export class RecurringTemplateItem extends HTMLElement {
  private itemData: RecurringTemplateItemData | null = null;

  set data(value: RecurringTemplateItemData) {
    this.itemData = value;
    this.render();
  }

  private render(): void {
    if (!this.itemData) return;
    const { template, categoryLabel, paymentLabel } = this.itemData;
    this.innerHTML = `
      <div class="item-row">
        <div class="item-main">
          <p class="item-title">${escapeHtml(template.description)}</p>
          <div class="item-meta">
            <span class="tag">${template.kind === 'expense' ? 'Despesa' : 'Receita'}</span>
            <span class="tag">${escapeHtml(categoryLabel)}</span>
            ${paymentLabel ? `<span class="tag">${escapeHtml(paymentLabel)}</span>` : ''}
            <span>${RECURRENCE_FREQUENCY_LABELS[template.recurrenceFrequency]}</span>
            <span class="badge ${template.isActive ? 'paid' : 'canceled'}">${template.isActive ? 'Ativa' : 'Pausada'}</span>
          </div>
        </div>
        <div class="item-side">
          <span class="money">${formatCurrencyBRL(template.expectedValue)}</span>
          <span class="row" style="gap:0">
            <button type="button" class="icon-btn" data-action="toggle" aria-label="Pausar ou ativar">
              ${template.isActive ? 'Pausar' : 'Ativar'}
            </button>
            <button type="button" class="icon-btn" data-action="edit" aria-label="Editar">${ICON_EDIT}</button>
            <button type="button" class="icon-btn danger" data-action="delete" aria-label="Excluir">${ICON_TRASH}</button>
          </span>
        </div>
      </div>
    `;
    this.querySelector('[data-action="toggle"]')?.addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('toggle-active', { bubbles: true, detail: { template } })),
    );
    this.querySelector('[data-action="edit"]')?.addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('edit', { bubbles: true, detail: { template } })),
    );
    this.querySelector('[data-action="delete"]')?.addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('delete', { bubbles: true, detail: { template } })),
    );
  }
}

customElements.define('recurring-template-item', RecurringTemplateItem);

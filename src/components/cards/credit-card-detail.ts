import type { CreditCard, CreditCardInvoice } from '../../domain/models';
import { formatCurrencyBRL } from '../../utils/format';
import { escapeHtml } from '../../utils/escape';
import './credit-card-invoice';
import '../ui/ui-card';

export class CreditCardDetail extends HTMLElement {
  set data(value: {
    card: CreditCard;
    invoice: CreditCardInvoice;
    categoryName: (id: string) => string;
  }) {
    this.innerHTML = `
      <div class="stack">
        <ui-card tone="pine">
          <div class="on-dark">
            <p class="metric-label">${escapeHtml(value.card.bankName ?? 'Cartao')}</p>
            <p class="metric-value big">${escapeHtml(value.card.name)}</p>
            <div class="item-meta">
              ${value.card.closingDay ? `<span>Fecha dia ${value.card.closingDay}</span>` : ''}
              ${value.card.dueDay ? `<span>Vence dia ${value.card.dueDay}</span>` : ''}
              ${value.card.limit ? `<span>Limite ${formatCurrencyBRL(value.card.limit)}</span>` : ''}
            </div>
          </div>
        </ui-card>
        <credit-card-invoice></credit-card-invoice>
      </div>
    `;
    (this.querySelector('credit-card-invoice') as HTMLElement & {
      data: { invoice: CreditCardInvoice; categoryName: (id: string) => string };
    }).data = { invoice: value.invoice, categoryName: value.categoryName };
  }
}

customElements.define('credit-card-detail', CreditCardDetail);

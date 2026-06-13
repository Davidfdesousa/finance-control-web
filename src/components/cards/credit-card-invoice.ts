import type { CreditCardInvoice } from '../../domain/models';
import { CREDIT_CARD_INVOICE_STATUS_LABELS } from '../../domain/models';
import { groupExpensesByCategory } from '../../domain/calculations';
import { formatCurrencyBRL } from '../../utils/format';
import { escapeHtml } from '../../utils/escape';
import './credit-card-invoice-item';
import '../ui/ui-card';

export class CreditCardInvoiceElement extends HTMLElement {
  set data(value: { invoice: CreditCardInvoice; categoryName: (id: string) => string }) {
    const byCategory = groupExpensesByCategory(value.invoice.expenses);
    this.innerHTML = `
      <div class="stack">
        <div class="grid-2">
          <ui-card pad="sm"><p class="metric-label">Fatura</p><p class="metric-value">${formatCurrencyBRL(value.invoice.totalExpected)}</p></ui-card>
          <ui-card pad="sm"><p class="metric-label">Pendente</p><p class="metric-value">${formatCurrencyBRL(value.invoice.totalPending)}</p></ui-card>
        </div>
        <div>
          <p class="section-title">Por categoria</p>
          <ui-card pad="sm">
            ${
              byCategory.length === 0
                ? '<p class="small muted">Sem itens nesta fatura.</p>'
                : byCategory
                    .map(
                      (item) => `
                        <div class="row-between small" style="padding: var(--sp-2) 0;">
                          <span>${escapeHtml(value.categoryName(item.key))}</span>
                          <span class="money">${formatCurrencyBRL(item.total)}</span>
                        </div>`,
                    )
                    .join('')
            }
          </ui-card>
        </div>
        <div>
          <div class="row-between">
            <p class="section-title" style="margin-bottom:0">Itens</p>
            <span class="badge ${value.invoice.status}">${CREDIT_CARD_INVOICE_STATUS_LABELS[value.invoice.status]}</span>
          </div>
          <ui-card pad="sm" class="invoice-items"></ui-card>
        </div>
      </div>
    `;
    const container = this.querySelector('.invoice-items') as HTMLElement;
    if (value.invoice.expenses.length === 0) {
      container.innerHTML = '<p class="small muted">Nenhuma despesa paga com este cartao no mes.</p>';
      return;
    }
    for (const expense of value.invoice.expenses) {
      const item = document.createElement('credit-card-invoice-item') as HTMLElement & {
        expense: typeof expense;
      };
      item.expense = expense;
      container.appendChild(item);
    }
  }
}

customElements.define('credit-card-invoice', CreditCardInvoiceElement);

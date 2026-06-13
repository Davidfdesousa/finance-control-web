import type { CreditCard, CreditCardInvoice } from '../../domain/models';
import { formatCurrencyBRL } from '../../utils/format';
import { escapeHtml } from '../../utils/escape';
import '../ui/ui-card';

export class CreditCardList extends HTMLElement {
  set data(value: { cards: CreditCard[]; invoices: CreditCardInvoice[]; selectedId: string }) {
    this.innerHTML = `
      <div class="stack">
        ${value.cards
          .map((card) => {
            const invoice = value.invoices.find((item) => item.cardId === card.id);
            const selected = card.id === value.selectedId;
            return `
              <button class="plain-card" type="button" data-id="${card.id}" aria-pressed="${selected}">
                <ui-card pad="sm" ${selected ? 'tone="soft"' : ''}>
                  <div class="row-between">
                    <div>
                      <p class="item-title">${escapeHtml(card.name)}</p>
                      <p class="small muted">${card.dueDay ? `Vence dia ${card.dueDay}` : 'Vencimento nao configurado'}</p>
                    </div>
                    <div class="item-side">
                      <span class="money">${formatCurrencyBRL(invoice?.totalExpected ?? 0)}</span>
                      <span class="small muted">${formatCurrencyBRL(invoice?.totalPending ?? 0)} pendente</span>
                    </div>
                  </div>
                </ui-card>
              </button>`;
          })
          .join('')}
      </div>
    `;
    this.querySelectorAll('.plain-card').forEach((button) =>
      button.addEventListener('click', () =>
        this.dispatchEvent(
          new CustomEvent('select-card', {
            bubbles: true,
            detail: { id: (button as HTMLElement).dataset.id },
          }),
        ),
      ),
    );
  }
}

customElements.define('credit-card-list', CreditCardList);

import type { InstallmentGroup } from '../../domain/models';
import type { InstallmentProgress } from '../../domain/calculations';
import { formatCurrencyBRL } from '../../utils/format';
import { escapeHtml } from '../../utils/escape';
import '../ui/ui-card';

export interface InstallmentListItem {
  group: InstallmentGroup;
  progress: InstallmentProgress;
}

export class InstallmentList extends HTMLElement {
  set items(items: InstallmentListItem[]) {
    this.innerHTML = items
      .map(
        ({ group, progress }) => `
          <ui-card pad="sm">
            <div class="item-row">
              <div class="item-main">
                <p class="item-title">${escapeHtml(group.description)}</p>
                <div class="item-meta">
                  <span>${group.installmentCount}x de ${formatCurrencyBRL(group.installmentValue)}</span>
                  <span>Inicio ${group.startMonthRef}</span>
                </div>
              </div>
              <div class="item-side">
                <span class="money">${formatCurrencyBRL(group.totalValue)}</span>
                <span class="small muted">${progress.paidCount} pagas · ${progress.pendingCount} pendentes</span>
                <span class="row" style="gap:0">
                  <button class="icon-btn" data-action="detail" data-id="${group.id}" type="button">Ver</button>
                  <button class="icon-btn" data-action="generate" data-id="${group.id}" type="button">Gerar</button>
                </span>
              </div>
            </div>
          </ui-card>`,
      )
      .join('');
    this.querySelectorAll('[data-action="detail"]').forEach((button) =>
      button.addEventListener('click', () =>
        this.dispatchEvent(
          new CustomEvent('detail', { bubbles: true, detail: { id: (button as HTMLElement).dataset.id } }),
        ),
      ),
    );
    this.querySelectorAll('[data-action="generate"]').forEach((button) =>
      button.addEventListener('click', () =>
        this.dispatchEvent(
          new CustomEvent('generate', { bubbles: true, detail: { id: (button as HTMLElement).dataset.id } }),
        ),
      ),
    );
  }
}

customElements.define('installment-list', InstallmentList);

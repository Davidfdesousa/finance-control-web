import type { Expense, InstallmentGroup } from '../../domain/models';
import { calculateInstallmentProgress } from '../../domain/calculations';
import { formatCurrencyBRL } from '../../utils/format';
import { escapeHtml } from '../../utils/escape';
import '../ui/progress-bar';
import '../ui/ui-card';

export class InstallmentDetail extends HTMLElement {
  set data(value: { group: InstallmentGroup; expenses: Expense[] }) {
    const progress = calculateInstallmentProgress(value.group, value.expenses);
    const percent =
      value.group.installmentCount <= 0
        ? 0
        : Math.round((progress.paidCount / value.group.installmentCount) * 100);
    this.innerHTML = `
      <div class="stack">
        <div class="row-between">
          <div>
            <p class="item-title">${escapeHtml(value.group.description)}</p>
            <p class="small muted">${progress.paidCount}/${value.group.installmentCount} parcelas pagas</p>
          </div>
          <span class="money">${formatCurrencyBRL(value.group.totalValue)}</span>
        </div>
        <progress-bar value="${percent}"></progress-bar>
        <div class="grid-2">
          <ui-card pad="sm"><p class="metric-label">Pago</p><p class="metric-value">${formatCurrencyBRL(progress.totalPaid)}</p></ui-card>
          <ui-card pad="sm"><p class="metric-label">Restante</p><p class="metric-value">${formatCurrencyBRL(progress.totalRemaining)}</p></ui-card>
        </div>
        <div>
          ${value.expenses
            .map(
              (expense) => `
                <div class="item-row">
                  <div class="item-main">
                    <p class="item-title">${escapeHtml(expense.description)}</p>
                    <p class="small muted">${expense.monthRef}</p>
                  </div>
                  <span class="badge ${expense.status}">${expense.status === 'paid' ? 'Paga' : 'Pendente'}</span>
                </div>`,
            )
            .join('')}
        </div>
      </div>
    `;
  }
}

customElements.define('installment-detail', InstallmentDetail);

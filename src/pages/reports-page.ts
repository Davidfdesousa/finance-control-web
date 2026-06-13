import { appStore } from '../state/store';
import { listIncomesByYear } from '../services/income.service';
import { listExpensesByYear } from '../services/expense.service';
import { buildYearSummary, type KeyTotal, type YearSummary } from '../domain/calculations';
import { formatCurrencyBRL } from '../utils/format';
import { getCurrentMonthRef } from '../utils/month';
import { escapeHtml } from '../utils/escape';
import '../components/ui/ui-card';
import '../components/ui/ui-loading';
import '../components/ui/ui-empty-state';
import '../components/ui/ui-button';

export class ReportsPage extends HTMLElement {
  private year = getCurrentMonthRef().year;
  private unsubscribe: (() => void) | null = null;
  private loadedKey = '';
  private requestKey = '';

  connectedCallback(): void {
    this.innerHTML = `
      <div class="page">
        <header><h1 class="page-title">Relatórios</h1></header>
        <div class="row-between">
          <button type="button" class="icon-btn year-prev" aria-label="Ano anterior"
            style="border: 1px solid var(--line); background: var(--surface);">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span class="year-label" aria-live="polite"
            style="font-family: var(--font-display); font-size: var(--text-lg);"></span>
          <button type="button" class="icon-btn year-next" aria-label="Próximo ano"
            style="border: 1px solid var(--line); background: var(--surface);">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <div class="reports-content stack"></div>
      </div>
    `;

    (this.querySelector('.year-prev') as HTMLElement).addEventListener('click', () => {
      this.year -= 1;
      void this.load();
    });
    (this.querySelector('.year-next') as HTMLElement).addEventListener('click', () => {
      this.year += 1;
      void this.load();
    });

    this.unsubscribe = appStore.subscribe((state) => {
      if (!state.user) return;
      const key = `${state.user.id}:${this.year}`;
      if (key !== this.loadedKey) {
        this.loadedKey = key;
        void this.load();
      }
    });
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private get content(): HTMLElement {
    return this.querySelector('.reports-content') as HTMLElement;
  }

  private async load(): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    const requestKey = `${user.id}:${this.year}`;
    this.requestKey = requestKey;
    this.loadedKey = requestKey;
    (this.querySelector('.year-label') as HTMLElement).textContent = String(this.year);
    this.content.innerHTML = '<ui-loading label="Somando o ano…"></ui-loading>';

    try {
      const [incomes, expenses] = await Promise.all([
        listIncomesByYear(user.id, this.year),
        listExpensesByYear(user.id, this.year),
      ]);
      if (this.requestKey !== requestKey || !this.isConnected) return;
      this.renderContent(buildYearSummary(this.year, incomes, expenses));
    } catch (error) {
      console.error('Falha ao carregar relatório anual:', error);
      if (this.requestKey !== requestKey || !this.isConnected) return;
      this.content.innerHTML = `
        <ui-empty-state heading="Não foi possível carregar"
          hint="Verifique sua conexão e tente novamente.">
          <ui-button size="sm" variant="outline" class="retry">Tentar de novo</ui-button>
        </ui-empty-state>
      `;
      this.content.querySelector('.retry')?.addEventListener('click', () => void this.load());
    }
  }

  private renderContent(summary: YearSummary): void {
    if (summary.monthsWithData === 0) {
      this.content.innerHTML = `
        <ui-empty-state heading="Sem movimentação em ${this.year}"
          hint="Cadastre receitas e despesas para ver o resumo anual."></ui-empty-state>
      `;
      return;
    }

    const { categories, paymentMethods } = appStore.get();
    const categoryName = (id: string): string => {
      const category = categories.find((c) => c.id === id);
      return category ? category.name : id;
    };
    const paymentName = (id: string): string =>
      paymentMethods.find((m) => m.id === id)?.name ?? id;

    const bars = (totals: KeyTotal[], nameOf: (key: string) => string): string => {
      if (totals.length === 0) return '<p class="muted small">Sem despesas no ano.</p>';
      const max = totals[0].total || 1;
      return totals
        .map(
          (t) => `
            <div class="bar-row">
              <div class="row-between small">
                <span>${escapeHtml(nameOf(t.key))}</span>
                <span class="money">${formatCurrencyBRL(t.total)}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${Math.max(4, Math.round((t.total / max) * 100))}%"></div>
              </div>
            </div>`,
        )
        .join('');
    };

    const balanceClass = summary.balance > 0 ? 'pos' : summary.balance < 0 ? 'neg' : '';

    this.content.innerHTML = `
      <ui-card tone="pine">
        <div class="on-dark">
          <p class="metric-label">Saldo do ano (recebido − pago)</p>
          <p class="metric-value big money ${balanceClass}">${formatCurrencyBRL(summary.balance)}</p>
          <p class="small muted" style="margin-top: var(--sp-2);">
            ${summary.monthsWithData} ${summary.monthsWithData === 1 ? 'mês' : 'meses'} com movimentação
          </p>
        </div>
      </ui-card>

      <div class="grid-2">
        <ui-card pad="sm">
          <p class="metric-label">Recebido no ano</p>
          <p class="metric-value money pos">${formatCurrencyBRL(summary.totalIncomeReceived)}</p>
          <p class="small muted">previsto ${formatCurrencyBRL(summary.totalIncomeExpected)}</p>
        </ui-card>
        <ui-card pad="sm">
          <p class="metric-label">Gasto no ano</p>
          <p class="metric-value money">${formatCurrencyBRL(summary.totalExpensePaid)}</p>
          <p class="small muted">previsto ${formatCurrencyBRL(summary.totalExpenseExpected)}</p>
        </ui-card>
        <ui-card pad="sm">
          <p class="metric-label">Média mensal de gastos</p>
          <p class="metric-value money">${formatCurrencyBRL(summary.monthlyAverageExpense)}</p>
        </ui-card>
      </div>

      <section>
        <h2 class="section-title">Total por categoria</h2>
        <ui-card pad="sm">${bars(summary.byCategory, categoryName)}</ui-card>
      </section>

      <section>
        <h2 class="section-title">Total por forma de pagamento</h2>
        <ui-card pad="sm">${bars(summary.byPaymentMethod, paymentName)}</ui-card>
      </section>
    `;
  }
}

customElements.define('reports-page', ReportsPage);

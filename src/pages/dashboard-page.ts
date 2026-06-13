import { appStore } from '../state/store';
import { listIncomesByMonth } from '../services/income.service';
import { listExpensesByMonth } from '../services/expense.service';
import { getCreditCardInvoicesForMonth } from '../services/credit-card.service';
import { getEmergencyReserve } from '../services/emergency-reserve.service';
import { listRecurringTemplates } from '../services/recurring.service';
import { getAptoMooca } from '../services/apartment.service';
import {
  buildMonthSummary,
  calculateApartmentCurrentResult,
  calculateEmergencyReserveProgress,
  generateRecurringItemsForMonth,
  groupExpensesByCategory,
  groupExpensesByPaymentMethod,
  upcomingPendingExpenses,
  expensePendingValue,
  type KeyTotal,
} from '../domain/calculations';
import { APTO_MOOCA_CATEGORY_ID } from '../domain/seed';
import {
  PROPERTY_STATUS_LABELS,
  type ApartmentUnit,
  type CreditCardInvoice,
  type EmergencyReserve,
  type Expense,
  type Income,
  type RecurringTemplate,
} from '../domain/models';
import { formatCurrencyBRL, formatDateBR } from '../utils/format';
import { escapeHtml } from '../utils/escape';
import '../components/ui/ui-card';
import '../components/ui/ui-loading';
import '../components/ui/ui-empty-state';
import '../components/ui/ui-month-switcher';
import '../components/ui/ui-button';

function signClass(value: number): string {
  if (value > 0) return 'pos';
  if (value < 0) return 'neg';
  return '';
}

export class DashboardPage extends HTMLElement {
  private incomes: Income[] = [];
  private expenses: Expense[] = [];
  private invoices: CreditCardInvoice[] = [];
  private reserve: EmergencyReserve | null = null;
  private recurringTemplates: RecurringTemplate[] = [];
  private apartment: ApartmentUnit | null = null;
  private unsubscribe: (() => void) | null = null;
  private loadedKey = '';
  private requestKey = '';

  connectedCallback(): void {
    const userName = appStore.get().user?.name.split(' ')[0] ?? '';
    this.innerHTML = `
      <div class="page">
        <header>
          <p class="muted small">Olá, ${escapeHtml(userName)}</p>
          <h1 class="page-title">Visão do mês</h1>
        </header>
        <ui-month-switcher></ui-month-switcher>
        <div class="dashboard-content stack"></div>
      </div>
    `;

    this.unsubscribe = appStore.subscribe((state) => {
      if (!state.user) return;
      const key = `${state.user.id}:${state.monthRef.key}`;
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
    return this.querySelector('.dashboard-content') as HTMLElement;
  }

  private async load(): Promise<void> {
    const { user, monthRef } = appStore.get();
    if (!user) return;
    const requestKey = `${user.id}:${monthRef.key}`;
    this.requestKey = requestKey;
    this.content.innerHTML = '<ui-loading label="Somando o mês…"></ui-loading>';

    try {
      const [incomes, expenses, invoices, reserve, recurringTemplates, apartment] = await Promise.all([
        listIncomesByMonth(user.id, monthRef.key),
        listExpensesByMonth(user.id, monthRef.key),
        getCreditCardInvoicesForMonth(user.id, monthRef.key, appStore.get().paymentMethods),
        getEmergencyReserve(user.id),
        listRecurringTemplates(user.id),
        getAptoMooca(user.id),
      ]);
      if (this.requestKey !== requestKey || !this.isConnected) return;
      this.incomes = incomes;
      this.expenses = expenses;
      this.invoices = invoices;
      this.reserve = reserve;
      this.recurringTemplates = recurringTemplates;
      this.apartment = apartment;
      this.renderContent();
    } catch (error) {
      console.error('Falha ao carregar o dashboard:', error);
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

  private renderContent(): void {
    const { categories, paymentMethods, settings } = appStore.get();
    const summary = buildMonthSummary(this.incomes, this.expenses, categories);
    const pending = upcomingPendingExpenses(this.expenses, 5);
    const byCategory = groupExpensesByCategory(this.expenses);
    const byPayment = groupExpensesByPaymentMethod(this.expenses);
    const apto = calculateApartmentCurrentResult(
      this.apartment,
      this.expenses,
      APTO_MOOCA_CATEGORY_ID,
    );
    const reserveProgress = calculateEmergencyReserveProgress(this.reserve);
    const recurringGenerated =
      this.expenses.filter((e) => e.recurringTemplateId).length +
      this.incomes.filter((i) => i.recurringTemplateId).length;
    const recurringPending = generateRecurringItemsForMonth(
      this.recurringTemplates,
      appStore.get().monthRef.key,
      this.expenses,
      this.incomes,
    ).length;
    const itauInvoice = this.invoices.find((invoice) => invoice.cardId === 'cartao-itau');
    const nubankInvoice = this.invoices.find((invoice) => invoice.cardId === 'cartao-nubank');

    const categoryName = (id: string): string => {
      const category = categories.find((c) => c.id === id);
      return category ? category.name : id;
    };
    const paymentName = (id: string): string =>
      paymentMethods.find((m) => m.id === id)?.name ?? id;

    const metricCard = (label: string, value: number, extra = ''): string => `
      <ui-card pad="sm">
        <p class="metric-label">${label}</p>
        <p class="metric-value money">${formatCurrencyBRL(value)}</p>
        ${extra}
      </ui-card>
    `;

    const bars = (totals: KeyTotal[], nameOf: (key: string) => string): string => {
      if (totals.length === 0) {
        return '<p class="muted small">Sem despesas neste mês.</p>';
      }
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

    const pendingRows =
      pending.length === 0
        ? '<p class="muted small">Nenhuma despesa pendente.</p>'
        : pending
            .map(
              (e) => `
                <div class="item-row">
                  <div class="item-main">
                    <p class="item-title">${escapeHtml(e.description)}</p>
                    <div class="item-meta">
                      ${e.dueDate ? `<span>Vence ${formatDateBR(e.dueDate)}</span>` : '<span>Sem vencimento</span>'}
                      <span class="tag">${escapeHtml(paymentName(e.paymentMethodId))}</span>
                    </div>
                  </div>
                  <span class="money">${formatCurrencyBRL(expensePendingValue(e))}</span>
                </div>`,
            )
            .join('');

    this.content.innerHTML = `
      <ui-card tone="pine">
        <div class="on-dark row-between" style="align-items: flex-start;">
          <div>
            <p class="metric-label">Saldo previsto</p>
            <p class="metric-value big money ${signClass(summary.expectedBalance)}">${formatCurrencyBRL(summary.expectedBalance)}</p>
          </div>
          <div style="text-align: right;">
            <p class="metric-label">Saldo real</p>
            <p class="metric-value big money ${signClass(summary.actualBalance)}">${formatCurrencyBRL(summary.actualBalance)}</p>
          </div>
        </div>
      </ui-card>

      <div class="grid-2">
        ${metricCard('Receita prevista', summary.expectedIncome)}
        ${metricCard('Receita recebida', summary.receivedIncome)}
        ${metricCard('Despesa prevista', summary.expectedExpense)}
        ${metricCard('Despesa paga', summary.paidExpense)}
        ${metricCard('Despesa pendente', summary.pendingExpense)}
        ${metricCard(
          'Reserva no mês',
          reserveProgress.currentValue,
          `<p class="small muted">${reserveProgress.percent}% da meta</p>`,
        )}
        ${metricCard('Fatura Itau', itauInvoice?.totalExpected ?? 0)}
        ${metricCard('Fatura Nubank', nubankInvoice?.totalExpected ?? 0)}
      </div>

      <section>
        <h2 class="section-title">Automacoes do mes</h2>
        <ui-card pad="sm">
          <div class="item-row">
            <span class="item-main">Recorrencias geradas</span>
            <span class="money">${recurringGenerated}</span>
          </div>
          <div class="item-row">
            <span class="item-main ${recurringPending > 0 ? 'neg' : ''}">Recorrencias pendentes</span>
            <span class="money ${recurringPending > 0 ? 'neg' : ''}">${recurringPending}</span>
          </div>
          <div class="item-row">
            <span class="item-main">Aporte reserva planejado</span>
            <span class="money">${formatCurrencyBRL(reserveProgress.currentMonthPlannedContribution)}</span>
          </div>
          <div class="item-row">
            <span class="item-main">Aporte reserva realizado</span>
            <span class="money">${formatCurrencyBRL(reserveProgress.currentMonthActualContribution)}</span>
          </div>
        </ui-card>
      </section>

      <section>
        <div class="row-between">
          <h2 class="section-title">Próximas pendências</h2>
          <a class="small" href="#/despesas" style="color: var(--pine); font-weight: 700;">Ver todas</a>
        </div>
        <ui-card pad="sm">${pendingRows}</ui-card>
      </section>

      <section>
        <h2 class="section-title">Apto Mooca</h2>
        <ui-card pad="sm">
          <div class="row-between">
            <span class="item-title">Centro de custo</span>
            <span class="tag">${PROPERTY_STATUS_LABELS[this.apartment?.status ?? settings.aptoMoocaStatus]}</span>
          </div>
          <div class="item-row" style="margin-top: var(--sp-2);">
            <span class="item-main muted small">Aluguel recebido</span>
            <span class="money">${formatCurrencyBRL(apto.incomeTotal)}</span>
          </div>
          <div class="item-row">
            <span class="item-main muted small">Custos do imóvel</span>
            <span class="money">− ${formatCurrencyBRL(apto.costTotal)}</span>
          </div>
          <div class="item-row">
            <span class="item-main item-title small">Resultado do mês</span>
            <span class="money ${signClass(apto.result)}">${formatCurrencyBRL(apto.result)}</span>
          </div>
        </ui-card>
      </section>

      <section>
        <h2 class="section-title">Total por categoria</h2>
        <ui-card pad="sm">${bars(byCategory, categoryName)}</ui-card>
      </section>

      <section>
        <h2 class="section-title">Total por forma de pagamento</h2>
        <ui-card pad="sm">${bars(byPayment, paymentName)}</ui-card>
      </section>
    `;
  }
}

customElements.define('dashboard-page', DashboardPage);

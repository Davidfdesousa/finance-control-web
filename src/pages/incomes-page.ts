import { appStore } from '../state/store';
import {
  buildIncome,
  deleteIncome,
  listIncomesByMonth,
  saveIncome,
  setIncomeReceived,
  type IncomeInput,
} from '../services/income.service';
import { sumIncomeExpected, sumIncomeReceived } from '../domain/calculations';
import type { Income } from '../domain/models';
import { formatCurrencyBRL } from '../utils/format';
import { IncomeForm } from '../components/income/income-form';
import { IncomeList } from '../components/income/income-list';
import type { UiModal } from '../components/ui/ui-modal';
import { ICON_PLUS } from '../components/icons';
import '../components/ui/ui-modal';
import '../components/ui/ui-card';
import '../components/ui/ui-loading';
import '../components/ui/ui-empty-state';
import '../components/ui/ui-month-switcher';

export class IncomesPage extends HTMLElement {
  private incomes: Income[] = [];
  private editing: Income | null = null;
  private unsubscribe: (() => void) | null = null;
  private loadedKey = '';
  private requestKey = '';

  connectedCallback(): void {
    this.innerHTML = `
      <div class="page">
        <header><h1 class="page-title">Receitas</h1></header>
        <ui-month-switcher></ui-month-switcher>
        <div class="incomes-content"></div>
      </div>
      <button type="button" class="fab">${ICON_PLUS} Nova receita</button>
      <ui-modal heading="Nova receita"><income-form></income-form></ui-modal>
    `;

    (this.querySelector('.fab') as HTMLElement).addEventListener('click', () =>
      this.openForm(null),
    );
    this.form.addEventListener('save', (event) => {
      void this.handleSave((event as CustomEvent<IncomeInput>).detail);
    });
    this.form.addEventListener('cancel', () => this.modal.closeModal());

    this.content.addEventListener('toggle-received', (event) => {
      const { income, received } = (
        event as CustomEvent<{ income: Income; received: boolean }>
      ).detail;
      void this.handleToggleReceived(income, received);
    });
    this.content.addEventListener('edit', (event) => {
      this.openForm((event as CustomEvent<{ income: Income }>).detail.income);
    });
    this.content.addEventListener('delete', (event) => {
      void this.handleDelete((event as CustomEvent<{ income: Income }>).detail.income);
    });

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
    return this.querySelector('.incomes-content') as HTMLElement;
  }

  private get modal(): UiModal {
    return this.querySelector('ui-modal') as UiModal;
  }

  private get form(): IncomeForm {
    return this.querySelector('income-form') as IncomeForm;
  }

  private async load(): Promise<void> {
    const { user, monthRef } = appStore.get();
    if (!user) return;
    const requestKey = `${user.id}:${monthRef.key}`;
    this.requestKey = requestKey;
    this.content.innerHTML = '<ui-loading label="Buscando receitas…"></ui-loading>';

    try {
      const incomes = await listIncomesByMonth(user.id, monthRef.key);
      if (this.requestKey !== requestKey || !this.isConnected) return;
      this.incomes = incomes;
      this.renderList();
    } catch (error) {
      console.error('Falha ao carregar receitas:', error);
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

  private async handleToggleReceived(income: Income, received: boolean): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    try {
      const updated = await setIncomeReceived(user.id, income, received);
      this.incomes = this.incomes.map((i) => (i.id === updated.id ? updated : i));
    } catch (error) {
      console.error('Falha ao atualizar receita:', error);
      window.alert('Não foi possível atualizar a receita. Tente novamente.');
    }
    this.renderList();
  }

  private async handleDelete(income: Income): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    if (!window.confirm(`Excluir a receita "${income.description}"?`)) return;
    try {
      await deleteIncome(user.id, income.id);
      this.incomes = this.incomes.filter((i) => i.id !== income.id);
      this.renderList();
    } catch (error) {
      console.error('Falha ao excluir receita:', error);
      window.alert('Não foi possível excluir a receita. Tente novamente.');
    }
  }

  private async handleSave(input: IncomeInput): Promise<void> {
    const { user, monthRef } = appStore.get();
    if (!user) return;
    const monthKey = this.editing?.monthRef ?? monthRef.key;
    const income = buildIncome(user.id, monthKey, input, this.editing ?? undefined);
    try {
      await saveIncome(user.id, income);
    } catch (error) {
      console.error('Falha ao salvar receita:', error);
      window.alert('Não foi possível salvar a receita. Tente novamente.');
      return;
    }
    this.modal.closeModal();
    if (income.monthRef === appStore.get().monthRef.key) {
      const existing = this.incomes.some((i) => i.id === income.id);
      this.incomes = existing
        ? this.incomes.map((i) => (i.id === income.id ? income : i))
        : [...this.incomes, income];
      this.renderList();
    }
  }

  private openForm(income: Income | null): void {
    this.editing = income;
    this.form.setup(income);
    this.modal.openModal(income ? 'Editar receita' : 'Nova receita');
  }

  private renderList(): void {
    if (this.incomes.length === 0) {
      this.content.innerHTML = `
        <ui-empty-state heading="Nenhuma receita neste mês"
          hint="Toque em “Nova receita” para registrar a primeira."></ui-empty-state>
      `;
      return;
    }

    this.content.innerHTML = `
      <div class="grid-2">
        <ui-card pad="sm">
          <p class="metric-label">Previsto</p>
          <p class="metric-value money">${formatCurrencyBRL(sumIncomeExpected(this.incomes))}</p>
        </ui-card>
        <ui-card pad="sm">
          <p class="metric-label">Recebido</p>
          <p class="metric-value money pos">${formatCurrencyBRL(sumIncomeReceived(this.incomes))}</p>
        </ui-card>
      </div>
      <div style="margin-top: var(--sp-3);">
        <income-list></income-list>
      </div>
    `;
    (this.content.querySelector('income-list') as IncomeList).items = this.incomes;
  }
}

customElements.define('incomes-page', IncomesPage);

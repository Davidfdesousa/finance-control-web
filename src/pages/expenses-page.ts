import { appStore } from '../state/store';
import {
  buildExpense,
  deleteExpense,
  listExpensesByMonth,
  saveExpense,
  setExpensePaid,
  type ExpenseInput,
} from '../services/expense.service';
import { expensePendingValue, isOverdue } from '../domain/calculations';
import type { Expense } from '../domain/models';
import { todayISO } from '../utils/month';
import { escapeHtml } from '../utils/escape';
import { ExpenseForm } from '../components/expense/expense-form';
import { ExpenseList } from '../components/expense/expense-list';
import type { ExpenseItemData } from '../components/expense/expense-item';
import type { UiModal } from '../components/ui/ui-modal';
import type { UiSelect } from '../components/ui/ui-select';
import { ICON_PLUS } from '../components/icons';
import '../components/ui/ui-modal';
import '../components/ui/ui-select';
import '../components/ui/ui-loading';
import '../components/ui/ui-empty-state';
import '../components/ui/ui-month-switcher';

type StatusFilter = 'all' | 'pending' | 'paid' | 'delayed';

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'paid', label: 'Pagas' },
  { id: 'delayed', label: 'Atrasadas' },
];

export class ExpensesPage extends HTMLElement {
  private expenses: Expense[] = [];
  private statusFilter: StatusFilter = 'all';
  private editing: Expense | null = null;
  private unsubscribe: (() => void) | null = null;
  private loadedKey = '';
  private requestKey = '';

  connectedCallback(): void {
    this.innerHTML = `
      <div class="page">
        <header><h1 class="page-title">Despesas</h1></header>
        <ui-month-switcher></ui-month-switcher>
        <div class="chip-row" role="group" aria-label="Filtrar por status">
          ${STATUS_FILTERS.map(
            (f) => `
              <button type="button" class="chip" data-status="${f.id}"
                aria-pressed="${f.id === 'all'}">${f.label}</button>`,
          ).join('')}
        </div>
        <div class="grid-2">
          <ui-select data-f="categoryFilter" label="Categoria" placeholder="Todas"></ui-select>
          <ui-select data-f="paymentFilter" label="Forma de pagamento" placeholder="Todas"></ui-select>
        </div>
        <div class="expenses-content"></div>
      </div>
      <button type="button" class="fab">${ICON_PLUS} Nova despesa</button>
      <ui-modal heading="Nova despesa"><expense-form></expense-form></ui-modal>
    `;

    this.wireEvents();

    this.unsubscribe = appStore.subscribe((state) => {
      if (!state.user) return;
      this.categoryFilterEl.options = state.categories
        .filter((c) => c.type === 'expense' || c.type === 'special')
        .map((c) => ({ value: c.id, label: c.name }));
      this.paymentFilterEl.options = state.paymentMethods.map((m) => ({
        value: m.id,
        label: m.name,
      }));
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

  /* ---------- elementos ---------- */

  private get content(): HTMLElement {
    return this.querySelector('.expenses-content') as HTMLElement;
  }

  private get modal(): UiModal {
    return this.querySelector('ui-modal') as UiModal;
  }

  private get form(): ExpenseForm {
    return this.querySelector('expense-form') as ExpenseForm;
  }

  private get categoryFilterEl(): UiSelect {
    return this.querySelector('[data-f="categoryFilter"]') as UiSelect;
  }

  private get paymentFilterEl(): UiSelect {
    return this.querySelector('[data-f="paymentFilter"]') as UiSelect;
  }

  /* ---------- eventos ---------- */

  private wireEvents(): void {
    this.querySelectorAll<HTMLButtonElement>('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        this.statusFilter = chip.dataset.status as StatusFilter;
        this.querySelectorAll('.chip').forEach((c) =>
          c.setAttribute('aria-pressed', String(c === chip)),
        );
        this.renderList();
      });
    });

    this.categoryFilterEl.addEventListener('change', () => this.renderList());
    this.paymentFilterEl.addEventListener('change', () => this.renderList());

    (this.querySelector('.fab') as HTMLElement).addEventListener('click', () =>
      this.openForm(null),
    );

    this.form.addEventListener('save', (event) => {
      void this.handleSave((event as CustomEvent<ExpenseInput>).detail);
    });
    this.form.addEventListener('cancel', () => this.modal.closeModal());

    this.content.addEventListener('toggle-paid', (event) => {
      const { expense, paid } = (event as CustomEvent<{ expense: Expense; paid: boolean }>)
        .detail;
      void this.handleTogglePaid(expense, paid);
    });
    this.content.addEventListener('edit', (event) => {
      this.openForm((event as CustomEvent<{ expense: Expense }>).detail.expense);
    });
    this.content.addEventListener('delete', (event) => {
      void this.handleDelete((event as CustomEvent<{ expense: Expense }>).detail.expense);
    });
  }

  /* ---------- dados ---------- */

  private async load(): Promise<void> {
    const { user, monthRef } = appStore.get();
    if (!user) return;
    const requestKey = `${user.id}:${monthRef.key}`;
    this.requestKey = requestKey;
    this.content.innerHTML = '<ui-loading label="Buscando despesas…"></ui-loading>';

    try {
      const expenses = await listExpensesByMonth(user.id, monthRef.key);
      if (this.requestKey !== requestKey || !this.isConnected) return;
      this.expenses = expenses;
      this.renderList();
    } catch (error) {
      console.error('Falha ao carregar despesas:', error);
      if (this.requestKey !== requestKey || !this.isConnected) return;
      this.content.innerHTML = `
        <ui-empty-state icon="⚠️" heading="Não foi possível carregar"
          hint="Verifique sua conexão e tente novamente.">
          <ui-button size="sm" variant="outline" class="retry">Tentar de novo</ui-button>
        </ui-empty-state>
      `;
      this.content.querySelector('.retry')?.addEventListener('click', () => void this.load());
    }
  }

  private async handleTogglePaid(expense: Expense, paid: boolean): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    try {
      const updated = await setExpensePaid(user.id, expense, paid);
      this.expenses = this.expenses.map((e) => (e.id === updated.id ? updated : e));
    } catch (error) {
      console.error('Falha ao atualizar status de pagamento:', error);
      window.alert('Não foi possível atualizar a despesa. Tente novamente.');
    }
    this.renderList();
  }

  private async handleDelete(expense: Expense): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    if (!window.confirm(`Excluir a despesa "${expense.description}"?`)) return;
    try {
      await deleteExpense(user.id, expense.id);
      this.expenses = this.expenses.filter((e) => e.id !== expense.id);
      this.renderList();
    } catch (error) {
      console.error('Falha ao excluir despesa:', error);
      window.alert('Não foi possível excluir a despesa. Tente novamente.');
    }
  }

  private async handleSave(input: ExpenseInput): Promise<void> {
    const { user, monthRef } = appStore.get();
    if (!user) return;
    const monthKey = this.editing?.monthRef ?? monthRef.key;
    const expense = buildExpense(user.id, monthKey, input, this.editing ?? undefined);
    try {
      await saveExpense(user.id, expense);
    } catch (error) {
      console.error('Falha ao salvar despesa:', error);
      window.alert('Não foi possível salvar a despesa. Tente novamente.');
      return;
    }
    this.modal.closeModal();
    if (expense.monthRef === appStore.get().monthRef.key) {
      const existing = this.expenses.some((e) => e.id === expense.id);
      this.expenses = existing
        ? this.expenses.map((e) => (e.id === expense.id ? expense : e))
        : [...this.expenses, expense];
      this.expenses.sort(
        (a, b) =>
          (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99') ||
          a.description.localeCompare(b.description, 'pt-BR'),
      );
      this.renderList();
    }
  }

  /* ---------- renderização ---------- */

  private openForm(expense: Expense | null): void {
    this.editing = expense;
    const { categories, paymentMethods } = appStore.get();
    this.form.setup({ categories, paymentMethods, expense });
    this.modal.openModal(expense ? 'Editar despesa' : 'Nova despesa');
  }

  private filteredExpenses(): Expense[] {
    const today = todayISO();
    const categoryId = this.categoryFilterEl.value;
    const paymentId = this.paymentFilterEl.value;
    return this.expenses.filter((e) => {
      if (categoryId && e.categoryId !== categoryId) return false;
      if (paymentId && e.paymentMethodId !== paymentId) return false;
      switch (this.statusFilter) {
        case 'pending':
          return expensePendingValue(e) > 0;
        case 'paid':
          return e.status === 'paid';
        case 'delayed':
          return isOverdue(e, today);
        default:
          return true;
      }
    });
  }

  private renderList(): void {
    const { categories, paymentMethods } = appStore.get();
    const filtered = this.filteredExpenses();

    if (this.expenses.length === 0) {
      this.content.innerHTML = `
        <ui-empty-state icon="🧾" heading="Nenhuma despesa neste mês"
          hint="Toque em “Nova despesa” para registrar a primeira."></ui-empty-state>
      `;
      return;
    }
    if (filtered.length === 0) {
      this.content.innerHTML = `
        <ui-empty-state icon="🔍" heading="Nada com esses filtros"
          hint="Ajuste os filtros para ver outras despesas."></ui-empty-state>
      `;
      return;
    }

    const items: ExpenseItemData[] = filtered.map((expense) => {
      const category = categories.find((c) => c.id === expense.categoryId);
      const subcategory = category?.subcategories.find((s) => s.id === expense.subcategoryId);
      return {
        expense,
        categoryLabel: category ? `${category.icon ?? ''} ${category.name}`.trim() : 'Sem categoria',
        subcategoryLabel: subcategory?.name,
        paymentLabel:
          paymentMethods.find((m) => m.id === expense.paymentMethodId)?.name ?? 'Sem forma',
      };
    });

    this.content.innerHTML = `
      <p class="small muted">${filtered.length} ${
        filtered.length === 1 ? 'despesa' : 'despesas'
      } · ${escapeHtml(STATUS_FILTERS.find((f) => f.id === this.statusFilter)?.label ?? '')}</p>
      <expense-list></expense-list>
    `;
    (this.content.querySelector('expense-list') as ExpenseList).items = items;
  }
}

customElements.define('expenses-page', ExpensesPage);

import { appStore } from '../state/store';
import type { CreditCard, CreditCardInvoice, Expense } from '../domain/models';
import {
  buildCreditCard,
  getCreditCardInvoicesForMonth,
  listCreditCards,
  saveCreditCard,
} from '../services/credit-card.service';
import { setExpensePaid } from '../services/expense.service';
import { formatCurrencyBRL } from '../utils/format';
import type { UiInput } from '../components/ui/ui-input';
import type { UiMoneyInput } from '../components/ui/ui-money-input';
import type { UiModal } from '../components/ui/ui-modal';
import type { CreditCardList } from '../components/cards/credit-card-list';
import type { CreditCardDetail } from '../components/cards/credit-card-detail';
import '../components/cards/credit-card-list';
import '../components/cards/credit-card-detail';
import '../components/ui/ui-modal';
import '../components/ui/ui-input';
import '../components/ui/ui-money-input';
import '../components/ui/ui-button';
import '../components/ui/ui-card';
import '../components/ui/ui-loading';
import '../components/ui/ui-empty-state';
import '../components/ui/ui-month-switcher';

export class CardsPage extends HTMLElement {
  private cards: CreditCard[] = [];
  private invoices: CreditCardInvoice[] = [];
  private selectedId = '';
  private editing: CreditCard | null = null;
  private unsubscribe: (() => void) | null = null;
  private loadedKey = '';

  connectedCallback(): void {
    this.innerHTML = `
      <div class="page">
        <header>
          <h1 class="page-title">Cartoes</h1>
          <p class="small muted">Faturas calculadas a partir das despesas do mes.</p>
        </header>
        <ui-month-switcher></ui-month-switcher>
        <div class="cards-content"></div>
      </div>
      <ui-modal heading="Editar cartao">
        <form class="form-grid card-form" novalidate>
          <ui-input data-f="name" label="Nome"></ui-input>
          <ui-input data-f="bank" label="Banco"></ui-input>
          <ui-input data-f="brand" label="Bandeira"></ui-input>
          <div class="grid-2">
            <ui-input data-f="closing" type="number" inputmode="numeric" label="Fechamento"></ui-input>
            <ui-input data-f="due" type="number" inputmode="numeric" label="Vencimento"></ui-input>
          </div>
          <ui-money-input data-f="limit" label="Limite"></ui-money-input>
          <div class="form-actions">
            <ui-button data-f="cancel" variant="outline">Cancelar</ui-button>
            <ui-button data-f="save">Salvar</ui-button>
          </div>
        </form>
      </ui-modal>
    `;
    this.wireEvents();
    this.unsubscribe = appStore.subscribe((state) => {
      if (!state.user) return;
      const key = `${state.user.id}:${state.monthRef.key}:${state.paymentMethods.length}`;
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
    return this.querySelector('.cards-content') as HTMLElement;
  }

  private get modal(): UiModal {
    return this.querySelector('ui-modal') as UiModal;
  }

  private wireEvents(): void {
    this.content.addEventListener('select-card', (event) => {
      this.selectedId = (event as CustomEvent<{ id: string }>).detail.id;
      this.renderContent();
    });
    this.content.addEventListener('toggle-paid', (event) =>
      void this.togglePaid((event as CustomEvent<{ expense: Expense; paid: boolean }>).detail),
    );
    this.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.matches('[data-action="edit-card"]')) this.openCardForm();
    });
    (this.querySelector('[data-f="cancel"]') as HTMLElement).addEventListener('click', () =>
      this.modal.closeModal(),
    );
    (this.querySelector('[data-f="save"]') as HTMLElement).addEventListener('click', () =>
      void this.saveCardForm(),
    );
  }

  private async load(): Promise<void> {
    const { user, monthRef, paymentMethods } = appStore.get();
    if (!user) return;
    this.content.innerHTML = '<ui-loading label="Montando faturas..."></ui-loading>';
    [this.cards, this.invoices] = await Promise.all([
      listCreditCards(user.id, paymentMethods),
      getCreditCardInvoicesForMonth(user.id, monthRef.key, paymentMethods),
    ]);
    this.selectedId = this.selectedId || this.cards[0]?.id || '';
    this.renderContent();
  }

  private async togglePaid({ expense, paid }: { expense: Expense; paid: boolean }): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    await setExpensePaid(user.id, expense, paid);
    await this.load();
  }

  private openCardForm(): void {
    this.editing = this.cards.find((card) => card.id === this.selectedId) ?? null;
    if (!this.editing) return;
    this.field<UiInput>('name').value = this.editing.name;
    this.field<UiInput>('bank').value = this.editing.bankName ?? '';
    this.field<UiInput>('brand').value = this.editing.brand ?? '';
    this.field<UiInput>('closing').value = this.editing.closingDay ? String(this.editing.closingDay) : '';
    this.field<UiInput>('due').value = this.editing.dueDay ? String(this.editing.dueDay) : '';
    this.field<UiMoneyInput>('limit').value = this.editing.limit ?? null;
    this.modal.openModal('Editar cartao');
  }

  private field<T extends HTMLElement>(name: string): T {
    return this.querySelector(`[data-f="${name}"]`) as T;
  }

  private async saveCardForm(): Promise<void> {
    const { user } = appStore.get();
    if (!user || !this.editing) return;
    const limit = this.field<UiMoneyInput>('limit').value;
    const card = buildCreditCard(
      user.id,
      {
        name: this.field<UiInput>('name').value || this.editing.name,
        bankName: this.field<UiInput>('bank').value || undefined,
        brand: this.field<UiInput>('brand').value || undefined,
        closingDay: Number(this.field<UiInput>('closing').value) || undefined,
        dueDay: Number(this.field<UiInput>('due').value) || undefined,
        limit: limit ?? undefined,
        isActive: this.editing.isActive,
        paymentMethodId: this.editing.paymentMethodId,
      },
      this.editing,
    );
    await saveCreditCard(user.id, card);
    this.modal.closeModal();
    await this.load();
  }

  private renderContent(): void {
    if (this.cards.length === 0) {
      this.content.innerHTML = `
        <ui-empty-state heading="Nenhum cartao"
          hint="Crie formas de pagamento do tipo cartao de credito nas configuracoes."></ui-empty-state>
      `;
      return;
    }
    const card = this.cards.find((item) => item.id === this.selectedId) ?? this.cards[0];
    const invoice = this.invoices.find((item) => item.cardId === card.id) ?? {
      cardId: card.id,
      monthRef: appStore.get().monthRef.key,
      expenses: [],
      totalExpected: 0,
      totalPaid: 0,
      totalPending: 0,
      status: 'open' as const,
    };
    const total = this.invoices.reduce((acc, item) => acc + item.totalExpected, 0);
    this.content.innerHTML = `
      <ui-card pad="sm">
        <div class="row-between">
          <div>
            <p class="metric-label">Total em cartoes</p>
            <p class="metric-value">${formatCurrencyBRL(total)}</p>
          </div>
          <ui-button size="sm" variant="outline" data-action="edit-card">Editar</ui-button>
        </div>
      </ui-card>
      <credit-card-list></credit-card-list>
      <credit-card-detail></credit-card-detail>
    `;
    (this.content.querySelector('credit-card-list') as CreditCardList).data = {
      cards: this.cards,
      invoices: this.invoices,
      selectedId: card.id,
    };
    (this.content.querySelector('credit-card-detail') as CreditCardDetail).data = {
      card,
      invoice,
      categoryName: (id: string) =>
        appStore.get().categories.find((category) => category.id === id)?.name ?? id,
    };
  }
}

customElements.define('cards-page', CardsPage);

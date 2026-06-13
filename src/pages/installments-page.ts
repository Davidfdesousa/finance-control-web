import { appStore } from '../state/store';
import type { Expense, InstallmentGroup } from '../domain/models';
import type { InstallmentProgress } from '../domain/calculations';
import {
  createInstallmentGroupWithExpenses,
  generateInstallmentExpenses,
  getInstallmentProgress,
  listExpensesForInstallmentGroup,
  listInstallmentGroups,
  type InstallmentGroupInput,
} from '../services/installment.service';
import { ICON_PLUS } from '../components/icons';
import type { UiModal } from '../components/ui/ui-modal';
import type { InstallmentForm } from '../components/installment/installment-form';
import type { InstallmentList } from '../components/installment/installment-list';
import type { InstallmentDetail } from '../components/installment/installment-detail';
import '../components/installment/installment-form';
import '../components/installment/installment-list';
import '../components/installment/installment-detail';
import '../components/ui/ui-modal';
import '../components/ui/ui-loading';
import '../components/ui/ui-empty-state';

export class InstallmentsPage extends HTMLElement {
  private groups: InstallmentGroup[] = [];
  private progress = new Map<string, InstallmentProgress>();
  private unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    this.innerHTML = `
      <div class="page">
        <header><h1 class="page-title">Parcelamentos</h1></header>
        <div class="installments-content"></div>
      </div>
      <button type="button" class="fab">${ICON_PLUS} Novo parcelamento</button>
      <ui-modal heading="Novo parcelamento"><installment-form></installment-form></ui-modal>
      <ui-modal class="detail-modal" heading="Parcelas"><installment-detail></installment-detail></ui-modal>
    `;
    this.wireEvents();
    this.unsubscribe = appStore.subscribe((state) => {
      if (!state.user) return;
      void this.load();
    });
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private get content(): HTMLElement {
    return this.querySelector('.installments-content') as HTMLElement;
  }

  private get modal(): UiModal {
    return this.querySelector('ui-modal') as UiModal;
  }

  private get detailModal(): UiModal {
    return this.querySelector('.detail-modal') as UiModal;
  }

  private get form(): InstallmentForm {
    return this.querySelector('installment-form') as InstallmentForm;
  }

  private wireEvents(): void {
    (this.querySelector('.fab') as HTMLElement).addEventListener('click', () => {
      const { categories, paymentMethods } = appStore.get();
      this.form.setup({ categories, paymentMethods });
      this.modal.openModal('Novo parcelamento');
    });
    this.form.addEventListener('cancel', () => this.modal.closeModal());
    this.form.addEventListener('save', (event) =>
      void this.handleSave((event as CustomEvent<InstallmentGroupInput>).detail),
    );
    this.content.addEventListener('detail', (event) =>
      void this.openDetail((event as CustomEvent<{ id: string }>).detail.id),
    );
    this.content.addEventListener('generate', (event) =>
      void this.generateMissing((event as CustomEvent<{ id: string }>).detail.id),
    );
  }

  private async load(): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    this.content.innerHTML = '<ui-loading label="Carregando parcelamentos..."></ui-loading>';
    this.groups = await listInstallmentGroups(user.id);
    this.progress.clear();
    await Promise.all(
      this.groups.map(async (group) => {
        this.progress.set(group.id, await getInstallmentProgress(user.id, group));
      }),
    );
    this.renderList();
  }

  private async handleSave(input: InstallmentGroupInput): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    await createInstallmentGroupWithExpenses(user.id, input);
    this.modal.closeModal();
    await this.load();
  }

  private async generateMissing(id: string): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    const group = this.groups.find((item) => item.id === id);
    if (!group) return;
    const generated = await generateInstallmentExpenses(user.id, group);
    window.alert(`${generated.length} parcelas geradas.`);
    await this.load();
  }

  private async openDetail(id: string): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    const group = this.groups.find((item) => item.id === id);
    if (!group) return;
    const expenses: Expense[] = await listExpensesForInstallmentGroup(user.id, group.id);
    (this.querySelector('installment-detail') as InstallmentDetail).data = { group, expenses };
    this.detailModal.openModal(group.description);
  }

  private renderList(): void {
    if (this.groups.length === 0) {
      this.content.innerHTML = `
        <ui-empty-state heading="Nenhum parcelamento"
          hint="Crie compras em parcelas para gerar despesas nos meses corretos."></ui-empty-state>
      `;
      return;
    }
    this.content.innerHTML = '<installment-list></installment-list>';
    (this.content.querySelector('installment-list') as InstallmentList).items = this.groups.map((group) => ({
      group,
      progress: this.progress.get(group.id) ?? {
        paidCount: 0,
        pendingCount: group.installmentCount,
        totalPaid: 0,
        totalRemaining: group.totalValue,
      },
    }));
  }
}

customElements.define('installments-page', InstallmentsPage);

import { appStore } from '../state/store';
import type { RecurringTemplate } from '../domain/models';
import {
  buildRecurringTemplate,
  deleteRecurringTemplate,
  generateRecurringForMonth,
  generateRecurringForNextMonths,
  listRecurringTemplates,
  saveRecurringTemplate,
  setRecurringTemplateActive,
  type RecurringTemplateInput,
} from '../services/recurring.service';
import { escapeHtml } from '../utils/escape';
import { ICON_PLUS } from '../components/icons';
import type { UiModal } from '../components/ui/ui-modal';
import type { RecurringTemplateForm } from '../components/recurring/recurring-template-form';
import type { RecurringTemplateList } from '../components/recurring/recurring-template-list';
import '../components/recurring/recurring-template-form';
import '../components/recurring/recurring-template-list';
import '../components/recurring/month-generator-panel';
import '../components/ui/ui-modal';
import '../components/ui/ui-loading';
import '../components/ui/ui-empty-state';
import '../components/ui/ui-month-switcher';

export class RecurringPage extends HTMLElement {
  private templates: RecurringTemplate[] = [];
  private editing: RecurringTemplate | null = null;
  private unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    this.innerHTML = `
      <div class="page">
        <header><h1 class="page-title">Recorrencias</h1></header>
        <ui-month-switcher></ui-month-switcher>
        <month-generator-panel></month-generator-panel>
        <div class="recurring-feedback small muted"></div>
        <div class="recurring-content"></div>
      </div>
      <button type="button" class="fab">${ICON_PLUS} Nova recorrencia</button>
      <ui-modal heading="Nova recorrencia"><recurring-template-form></recurring-template-form></ui-modal>
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
    return this.querySelector('.recurring-content') as HTMLElement;
  }

  private get modal(): UiModal {
    return this.querySelector('ui-modal') as UiModal;
  }

  private get form(): RecurringTemplateForm {
    return this.querySelector('recurring-template-form') as RecurringTemplateForm;
  }

  private wireEvents(): void {
    (this.querySelector('.fab') as HTMLElement).addEventListener('click', () => this.openForm(null));
    this.form.addEventListener('save', (event) =>
      void this.handleSave((event as CustomEvent<RecurringTemplateInput>).detail),
    );
    this.form.addEventListener('cancel', () => this.modal.closeModal());
    this.addEventListener('generate-current', () => void this.generateCurrent());
    this.addEventListener('generate-next', () => void this.generateNext());
    this.content.addEventListener('edit', (event) =>
      this.openForm((event as CustomEvent<{ template: RecurringTemplate }>).detail.template),
    );
    this.content.addEventListener('toggle-active', (event) =>
      void this.toggleActive((event as CustomEvent<{ template: RecurringTemplate }>).detail.template),
    );
    this.content.addEventListener('delete', (event) =>
      void this.deleteTemplate((event as CustomEvent<{ template: RecurringTemplate }>).detail.template),
    );
  }

  private async load(): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    this.content.innerHTML = '<ui-loading label="Carregando recorrencias..."></ui-loading>';
    this.templates = await listRecurringTemplates(user.id);
    this.renderList();
  }

  private openForm(template: RecurringTemplate | null): void {
    const { categories, paymentMethods } = appStore.get();
    this.editing = template;
    this.form.setup({ categories, paymentMethods, template });
    this.modal.openModal(template ? 'Editar recorrencia' : 'Nova recorrencia');
  }

  private async handleSave(input: RecurringTemplateInput): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    const template = buildRecurringTemplate(user.id, input, this.editing ?? undefined);
    await saveRecurringTemplate(user.id, template);
    this.modal.closeModal();
    await this.load();
  }

  private async toggleActive(template: RecurringTemplate): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    await setRecurringTemplateActive(user.id, template, !template.isActive);
    await this.load();
  }

  private async deleteTemplate(template: RecurringTemplate): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    if (!window.confirm(`Excluir "${template.description}"?`)) return;
    await deleteRecurringTemplate(user.id, template.id);
    await this.load();
  }

  private async generateCurrent(): Promise<void> {
    const { user, monthRef } = appStore.get();
    if (!user) return;
    const result = await generateRecurringForMonth(user.id, monthRef.key);
    this.feedback(`Gerados ${result.expenses.length} despesas e ${result.incomes.length} receitas em ${monthRef.key}.`);
  }

  private async generateNext(): Promise<void> {
    const { user, monthRef } = appStore.get();
    if (!user) return;
    const result = await generateRecurringForNextMonths(user.id, monthRef.key, 6);
    this.feedback(`Gerados ${result.expenses.length} despesas e ${result.incomes.length} receitas nos proximos 6 meses.`);
  }

  private feedback(message: string): void {
    (this.querySelector('.recurring-feedback') as HTMLElement).textContent = message;
  }

  private renderList(): void {
    const { categories, paymentMethods } = appStore.get();
    if (this.templates.length === 0) {
      this.content.innerHTML = `
        <ui-empty-state heading="Nenhuma recorrencia"
          hint="Crie modelos para aluguel, assinaturas, saude, pets e outros gastos fixos."></ui-empty-state>
      `;
      return;
    }
    this.content.innerHTML = `
      <p class="small muted">${this.templates.length} modelos cadastrados</p>
      <recurring-template-list></recurring-template-list>
    `;
    const list = this.content.querySelector('recurring-template-list') as RecurringTemplateList;
    list.items = this.templates.map((template) => ({
      template,
      categoryLabel: categories.find((category) => category.id === template.categoryId)?.name ?? template.categoryId,
      paymentLabel: template.paymentMethodId
        ? escapeHtml(paymentMethods.find((method) => method.id === template.paymentMethodId)?.name ?? template.paymentMethodId)
        : undefined,
    }));
  }
}

customElements.define('recurring-page', RecurringPage);

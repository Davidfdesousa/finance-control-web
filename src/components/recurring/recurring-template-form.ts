import {
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
  INCOME_TYPES,
  INCOME_TYPE_LABELS,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_FREQUENCY_LABELS,
  type Category,
  type PaymentMethod,
  type RecurringTemplate,
} from '../../domain/models';
import type { RecurringTemplateInput } from '../../services/recurring.service';
import type { UiInput } from '../ui/ui-input';
import type { UiMoneyInput } from '../ui/ui-money-input';
import type { UiSelect } from '../ui/ui-select';
import '../ui/ui-input';
import '../ui/ui-money-input';
import '../ui/ui-select';
import '../ui/ui-button';

export interface RecurringTemplateFormSetup {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  template: RecurringTemplate | null;
}

export class RecurringTemplateForm extends HTMLElement {
  private categories: Category[] = [];

  setup({ categories, paymentMethods, template }: RecurringTemplateFormSetup): void {
    this.categories = categories;
    this.render();
    this.field<UiSelect>('kind').options = [
      { value: 'expense', label: 'Despesa' },
      { value: 'income', label: 'Receita' },
    ];
    this.field<UiSelect>('frequency').options = RECURRENCE_FREQUENCIES.map((value) => ({
      value,
      label: RECURRENCE_FREQUENCY_LABELS[value],
    }));
    this.field<UiSelect>('payment').options = paymentMethods.map((method) => ({
      value: method.id,
      label: method.name,
    }));
    this.field<UiSelect>('active').options = [
      { value: 'true', label: 'Ativa' },
      { value: 'false', label: 'Pausada' },
    ];
    this.field<UiSelect>('kind').value = template?.kind ?? 'expense';
    this.syncKindFields();

    if (template) {
      this.field<UiInput>('description').value = template.description;
      this.field<UiMoneyInput>('value').value = template.expectedValue;
      this.field<UiSelect>('category').value = template.categoryId;
      this.syncSubcategories();
      this.field<UiSelect>('subcategory').value = template.subcategoryId ?? '';
      this.field<UiSelect>('payment').value = template.paymentMethodId ?? '';
      this.field<UiSelect>('incomeType').value = template.incomeType ?? 'other';
      this.field<UiSelect>('expenseType').value = template.expenseType ?? 'fixed';
      this.field<UiSelect>('frequency').value = template.recurrenceFrequency;
      this.field<UiInput>('start').value = template.startMonthRef;
      this.field<UiInput>('end').value = template.endMonthRef ?? '';
      this.field<UiInput>('dueDay').value = template.dueDay ? String(template.dueDay) : '';
      this.field<UiSelect>('active').value = String(template.isActive);
      this.field<UiInput>('notes').value = template.notes ?? '';
    } else {
      const monthKey = new Date().toISOString().slice(0, 7);
      this.field<UiInput>('start').value = monthKey;
      this.field<UiSelect>('frequency').value = 'monthly';
      this.field<UiSelect>('expenseType').value = 'fixed';
      this.field<UiSelect>('incomeType').value = 'other';
      this.field<UiSelect>('active').value = 'true';
      this.syncSubcategories();
    }
  }

  private field<T extends HTMLElement>(name: string): T {
    return this.querySelector(`[data-f="${name}"]`) as T;
  }

  private render(): void {
    this.innerHTML = `
      <form class="form-grid" novalidate>
        <p class="form-error" role="alert" hidden></p>
        <ui-select data-f="kind" label="Tipo"></ui-select>
        <ui-input data-f="description" label="Descricao" placeholder="Ex.: GPT, aluguel, salario"></ui-input>
        <ui-money-input data-f="value" label="Valor esperado"></ui-money-input>
        <ui-select data-f="category" label="Categoria" placeholder="Selecione"></ui-select>
        <ui-select data-f="subcategory" label="Subcategoria" placeholder="Sem subcategoria"></ui-select>
        <ui-select data-f="payment" label="Forma de pagamento" placeholder="Sem forma"></ui-select>
        <ui-select data-f="expenseType" label="Tipo de despesa"></ui-select>
        <ui-select data-f="incomeType" label="Tipo de receita"></ui-select>
        <ui-select data-f="frequency" label="Frequencia"></ui-select>
        <div class="grid-2">
          <ui-input data-f="start" type="month" label="Mes inicial"></ui-input>
          <ui-input data-f="end" type="month" label="Mes final"></ui-input>
        </div>
        <ui-input data-f="dueDay" type="number" inputmode="numeric" label="Dia de vencimento"></ui-input>
        <ui-select data-f="active" label="Status"></ui-select>
        <ui-input data-f="notes" label="Observacoes" rows="2"></ui-input>
        <div class="form-actions">
          <ui-button data-f="cancel" variant="outline">Cancelar</ui-button>
          <ui-button data-f="save">Salvar</ui-button>
        </div>
      </form>
    `;
    this.field<UiSelect>('kind').addEventListener('change', () => this.syncKindFields());
    this.field<UiSelect>('category').addEventListener('change', () => this.syncSubcategories());
    this.field<HTMLElement>('cancel').addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('cancel', { bubbles: true })),
    );
    this.field<HTMLElement>('save').addEventListener('click', () => this.submit());
    (this.querySelector('form') as HTMLFormElement).addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit();
    });
  }

  private syncKindFields(): void {
    const kind = this.field<UiSelect>('kind').value || 'expense';
    this.field<UiSelect>('category').options = this.categories
      .filter((category) =>
        kind === 'income'
          ? category.type === 'income'
          : category.type === 'expense' || category.type === 'special',
      )
      .map((category) => ({ value: category.id, label: category.name }));
    this.field<UiSelect>('expenseType').options = EXPENSE_TYPES.map((value) => ({
      value,
      label: EXPENSE_TYPE_LABELS[value],
    }));
    this.field<UiSelect>('incomeType').options = INCOME_TYPES.map((value) => ({
      value,
      label: INCOME_TYPE_LABELS[value],
    }));
    this.field<UiSelect>('payment').hidden = kind === 'income';
    this.field<UiSelect>('expenseType').hidden = kind === 'income';
    this.field<UiSelect>('incomeType').hidden = kind === 'expense';
    this.syncSubcategories();
  }

  private syncSubcategories(): void {
    const category = this.categories.find((item) => item.id === this.field<UiSelect>('category').value);
    this.field<UiSelect>('subcategory').options = (category?.subcategories ?? []).map((item) => ({
      value: item.id,
      label: item.name,
    }));
  }

  private submit(): void {
    const errorEl = this.querySelector('.form-error') as HTMLElement;
    const kind = this.field<UiSelect>('kind').value as 'income' | 'expense';
    const value = this.field<UiMoneyInput>('value').value;
    const description = this.field<UiInput>('description').value.trim();
    const categoryId = this.field<UiSelect>('category').value;
    const paymentMethodId = this.field<UiSelect>('payment').value;
    const startMonthRef = this.field<UiInput>('start').value;
    let valid = true;

    if (!description) valid = false;
    if (!value || value <= 0) valid = false;
    if (!categoryId) valid = false;
    if (kind === 'expense' && !paymentMethodId) valid = false;
    if (!startMonthRef) valid = false;

    errorEl.hidden = valid;
    errorEl.textContent = valid ? '' : 'Preencha os campos obrigatorios.';
    if (!valid) return;

    const dueDayText = this.field<UiInput>('dueDay').value;
    const dueDay = dueDayText ? Number(dueDayText) : undefined;
    const notes = this.field<UiInput>('notes').value.trim();
    const input: RecurringTemplateInput = {
      kind,
      description,
      expectedValue: value as number,
      categoryId,
      subcategoryId: this.field<UiSelect>('subcategory').value || undefined,
      paymentMethodId: kind === 'expense' ? paymentMethodId : undefined,
      incomeType: kind === 'income' ? (this.field<UiSelect>('incomeType').value as RecurringTemplateInput['incomeType']) : undefined,
      expenseType: kind === 'expense' ? (this.field<UiSelect>('expenseType').value as RecurringTemplateInput['expenseType']) : undefined,
      recurrenceFrequency: this.field<UiSelect>('frequency').value as RecurringTemplateInput['recurrenceFrequency'],
      startMonthRef,
      endMonthRef: this.field<UiInput>('end').value || undefined,
      dueDay: dueDay && dueDay >= 1 && dueDay <= 31 ? dueDay : undefined,
      isActive: this.field<UiSelect>('active').value !== 'false',
      notes: notes || undefined,
    };
    this.dispatchEvent(new CustomEvent<RecurringTemplateInput>('save', { bubbles: true, detail: input }));
  }
}

customElements.define('recurring-template-form', RecurringTemplateForm);

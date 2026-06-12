import {
  EXPENSE_STATUSES,
  EXPENSE_STATUS_LABELS,
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
  type Category,
  type Expense,
  type PaymentMethod,
} from '../../domain/models';
import type { ExpenseInput } from '../../services/expense.service';
import type { UiInput } from '../ui/ui-input';
import type { UiMoneyInput } from '../ui/ui-money-input';
import type { UiSelect } from '../ui/ui-select';
import type { UiDateInput } from '../ui/ui-date-input';
import '../ui/ui-input';
import '../ui/ui-money-input';
import '../ui/ui-select';
import '../ui/ui-date-input';
import '../ui/ui-button';

export interface ExpenseFormSetup {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  expense: Expense | null;
}

/**
 * Formulário de despesa. Dispara 'save' (detail: ExpenseInput) e 'cancel'.
 */
export class ExpenseForm extends HTMLElement {
  private categories: Category[] = [];

  setup({ categories, paymentMethods, expense }: ExpenseFormSetup): void {
    this.categories = categories.filter((c) => c.type === 'expense' || c.type === 'special');
    this.render();

    this.field<UiSelect>('category').options = this.categories.map((c) => ({
      value: c.id,
      label: `${c.icon ?? ''} ${c.name}`.trim(),
    }));
    this.field<UiSelect>('payment').options = paymentMethods.map((m) => ({
      value: m.id,
      label: m.name,
    }));
    this.field<UiSelect>('status').options = EXPENSE_STATUSES.map((s) => ({
      value: s,
      label: EXPENSE_STATUS_LABELS[s],
    }));
    this.field<UiSelect>('type').options = EXPENSE_TYPES.map((t) => ({
      value: t,
      label: EXPENSE_TYPE_LABELS[t],
    }));

    if (expense) {
      this.field<UiInput>('description').value = expense.description;
      this.field<UiMoneyInput>('expected').value = expense.expectedValue;
      // this.field<UiMoneyInput>('actual').value = expense.actualValue ?? null;
      this.field<UiSelect>('category').value = expense.categoryId;
      this.syncSubcategories();
      this.field<UiSelect>('subcategory').value = expense.subcategoryId ?? '';
      this.field<UiSelect>('payment').value = expense.paymentMethodId;
      this.field<UiDateInput>('due').value = expense.dueDate ?? '';
      this.field<UiSelect>('status').value = expense.status;
      this.field<UiSelect>('type').value = expense.expenseType;
      this.field<UiInput>('notes').value = expense.notes ?? '';
    } else {
      this.field<UiSelect>('status').value = 'pending';
      this.field<UiSelect>('type').value = 'variable';
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

        <ui-select data-f="category" label="Categoria" placeholder="Selecione…"></ui-select>
        <ui-select data-f="subcategory" label="Subcategoria" placeholder="Sem subcategoria"></ui-select>
        
        <ui-input data-f="description" label="Descrição" placeholder="Ex.: Condomínio"></ui-input>
        <ui-select data-f="type" label="Tipo de despesa"></ui-select>
        <div >
          <ui-money-input data-f="expected" label="Valor previsto"></ui-money-input>
          <!-- <ui-money-input data-f="actual" label="Valor real (opcional)"></ui-money-input> -->
        </div>
        

          <ui-date-input data-f="due" label="Vencimento"></ui-date-input>
          <ui-select data-f="payment" label="Forma de pagamento" placeholder="Selecione…"></ui-select>
          <ui-select data-f="status" label="Status"></ui-select>

        

        
        
        <ui-input data-f="notes" label="Observação" rows="2" placeholder="Opcional"></ui-input>
        
        <div class="form-actions">
          <ui-button data-f="cancel" variant="outline">Cancelar</ui-button>
          <ui-button data-f="save">Salvar despesa</ui-button>
        </div>
      </form>
    `;

    this.field<UiSelect>('category').addEventListener('change', () => {
      this.syncSubcategories();
      this.autoSelectReserveType();
    });
    this.field<HTMLElement>('cancel').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('cancel', { bubbles: true }));
    });
    this.field<HTMLElement>('save').addEventListener('click', () => this.submit());
    (this.querySelector('form') as HTMLFormElement).addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit();
    });
  }

  private syncSubcategories(): void {
    const categoryId = this.field<UiSelect>('category').value;
    const category = this.categories.find((c) => c.id === categoryId);
    this.field<UiSelect>('subcategory').options = (category?.subcategories ?? []).map((s) => ({
      value: s.id,
      label: s.name,
    }));
  }

  /** Categoria especial (Reserva) sugere o tipo 'reserve' automaticamente. */
  private autoSelectReserveType(): void {
    const categoryId = this.field<UiSelect>('category').value;
    const category = this.categories.find((c) => c.id === categoryId);
    if (category?.type === 'special') {
      this.field<UiSelect>('type').value = 'reserve';
    }
  }

  private submit(): void {
    const description = this.field<UiInput>('description');
    const expected = this.field<UiMoneyInput>('expected');
    // const actual = this.field<UiMoneyInput>('actual');
    const category = this.field<UiSelect>('category');
    const payment = this.field<UiSelect>('payment');
    const errorEl = this.querySelector('.form-error') as HTMLElement;

    let valid = true;
    if (!description.value.trim()) {
      description.setError('Informe a descrição.');
      valid = false;
    }
    const expectedValue = expected.value;
    if (expectedValue === null || expectedValue <= 0) {
      expected.setError('Informe um valor maior que zero.');
      valid = false;
    }
    // if (actual.isInvalidText) {
    //   actual.setError('Valor inválido.');
    //   valid = false;
    // }
    if (!category.value) {
      category.setError('Escolha uma categoria.');
      valid = false;
    }
    if (!payment.value) {
      payment.setError('Escolha a forma de pagamento.');
      valid = false;
    }

    errorEl.hidden = valid;
    errorEl.textContent = valid ? '' : 'Revise os campos destacados antes de salvar.';
    if (!valid) return;

    const notes = this.field<UiInput>('notes').value.trim();
    const subcategoryId = this.field<UiSelect>('subcategory').value;
    const dueDate = this.field<UiDateInput>('due').value;
    // const actualValue = actual.value;

    const input: ExpenseInput = {
      description: description.value,
      expectedValue: expectedValue as number,
      // actualValue: actualValue ?? undefined,
      categoryId: category.value,
      subcategoryId: subcategoryId || undefined,
      paymentMethodId: payment.value,
      dueDate: dueDate || undefined,
      status: this.field<UiSelect>('status').value as ExpenseInput['status'],
      expenseType: this.field<UiSelect>('type').value as ExpenseInput['expenseType'],
      notes: notes || undefined,
    };

    this.dispatchEvent(new CustomEvent<ExpenseInput>('save', { bubbles: true, detail: input }));
  }
}

customElements.define('expense-form', ExpenseForm);

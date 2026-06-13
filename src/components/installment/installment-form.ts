import type { Category, PaymentMethod } from '../../domain/models';
import type { InstallmentGroupInput } from '../../services/installment.service';
import { formatCurrencyBRL, round2 } from '../../utils/format';
import type { UiInput } from '../ui/ui-input';
import type { UiMoneyInput } from '../ui/ui-money-input';
import type { UiSelect } from '../ui/ui-select';
import '../ui/ui-input';
import '../ui/ui-money-input';
import '../ui/ui-select';
import '../ui/ui-button';

export interface InstallmentFormSetup {
  categories: Category[];
  paymentMethods: PaymentMethod[];
}

export class InstallmentForm extends HTMLElement {
  private categories: Category[] = [];

  setup({ categories, paymentMethods }: InstallmentFormSetup): void {
    this.categories = categories.filter((category) => category.type === 'expense');
    this.render();
    this.field<UiSelect>('category').options = this.categories.map((category) => ({
      value: category.id,
      label: category.name,
    }));
    this.field<UiSelect>('payment').options = paymentMethods.map((method) => ({
      value: method.id,
      label: method.name,
    }));
    this.field<UiInput>('start').value = new Date().toISOString().slice(0, 7);
    this.syncSubcategories();
    this.updateInstallmentValue();
  }

  private field<T extends HTMLElement>(name: string): T {
    return this.querySelector(`[data-f="${name}"]`) as T;
  }

  private render(): void {
    this.innerHTML = `
      <form class="form-grid" novalidate>
        <p class="form-error" role="alert" hidden></p>
        <ui-input data-f="description" label="Descricao" placeholder="Ex.: Piso Apto Mooca"></ui-input>
        <ui-money-input data-f="total" label="Valor total"></ui-money-input>
        <ui-input data-f="count" type="number" inputmode="numeric" label="Numero de parcelas"></ui-input>
        <p class="small muted" data-f="installmentValue">Parcela: R$ 0,00</p>
        <ui-input data-f="start" type="month" label="Mes inicial"></ui-input>
        <ui-select data-f="category" label="Categoria" placeholder="Selecione"></ui-select>
        <ui-select data-f="subcategory" label="Subcategoria" placeholder="Sem subcategoria"></ui-select>
        <ui-select data-f="payment" label="Forma de pagamento" placeholder="Selecione"></ui-select>
        <ui-input data-f="notes" label="Observacoes" rows="2"></ui-input>
        <div class="form-actions">
          <ui-button data-f="cancel" variant="outline">Cancelar</ui-button>
          <ui-button data-f="save">Criar parcelas</ui-button>
        </div>
      </form>
    `;
    this.field<UiSelect>('category').addEventListener('change', () => this.syncSubcategories());
    this.field<UiMoneyInput>('total').addEventListener('input', () => this.updateInstallmentValue());
    this.field<UiInput>('count').addEventListener('input', () => this.updateInstallmentValue());
    this.field<HTMLElement>('cancel').addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('cancel', { bubbles: true })),
    );
    this.field<HTMLElement>('save').addEventListener('click', () => this.submit());
    (this.querySelector('form') as HTMLFormElement).addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit();
    });
  }

  private syncSubcategories(): void {
    const category = this.categories.find((item) => item.id === this.field<UiSelect>('category').value);
    this.field<UiSelect>('subcategory').options = (category?.subcategories ?? []).map((item) => ({
      value: item.id,
      label: item.name,
    }));
  }

  private updateInstallmentValue(): void {
    const total = this.field<UiMoneyInput>('total').value ?? 0;
    const count = Number(this.field<UiInput>('count').value || 0);
    const value = count > 0 ? round2(total / count) : 0;
    (this.field<HTMLElement>('installmentValue')).textContent = `Parcela: ${formatCurrencyBRL(value)}`;
  }

  private submit(): void {
    const description = this.field<UiInput>('description').value.trim();
    const totalValue = this.field<UiMoneyInput>('total').value;
    const installmentCount = Number(this.field<UiInput>('count').value || 0);
    const startMonthRef = this.field<UiInput>('start').value;
    const categoryId = this.field<UiSelect>('category').value;
    const paymentMethodId = this.field<UiSelect>('payment').value;
    const errorEl = this.querySelector('.form-error') as HTMLElement;
    const valid =
      Boolean(description) &&
      Boolean(totalValue && totalValue > 0) &&
      installmentCount > 0 &&
      Boolean(startMonthRef) &&
      Boolean(categoryId) &&
      Boolean(paymentMethodId);
    errorEl.hidden = valid;
    errorEl.textContent = valid ? '' : 'Preencha os campos obrigatorios.';
    if (!valid) return;

    const notes = this.field<UiInput>('notes').value.trim();
    const input: InstallmentGroupInput = {
      description,
      totalValue: totalValue as number,
      installmentCount,
      startMonthRef,
      categoryId,
      subcategoryId: this.field<UiSelect>('subcategory').value || undefined,
      paymentMethodId,
      notes: notes || undefined,
    };
    this.dispatchEvent(new CustomEvent<InstallmentGroupInput>('save', { bubbles: true, detail: input }));
  }
}

customElements.define('installment-form', InstallmentForm);

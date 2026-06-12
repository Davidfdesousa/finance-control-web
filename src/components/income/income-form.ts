import {
  INCOME_STATUSES,
  INCOME_STATUS_LABELS,
  INCOME_TYPES,
  INCOME_TYPE_LABELS,
  type Income,
} from '../../domain/models';
import type { IncomeInput } from '../../services/income.service';
import type { UiInput } from '../ui/ui-input';
import type { UiMoneyInput } from '../ui/ui-money-input';
import type { UiSelect } from '../ui/ui-select';
import type { UiDateInput } from '../ui/ui-date-input';
import '../ui/ui-input';
import '../ui/ui-money-input';
import '../ui/ui-select';
import '../ui/ui-date-input';
import '../ui/ui-button';

/**
 * Formulário de receita. Dispara 'save' (detail: IncomeInput) e 'cancel'.
 */
export class IncomeForm extends HTMLElement {
  setup(income: Income | null): void {
    this.render();

    this.field<UiSelect>('type').options = INCOME_TYPES.map((t) => ({
      value: t,
      label: INCOME_TYPE_LABELS[t],
    }));
    this.field<UiSelect>('status').options = INCOME_STATUSES.map((s) => ({
      value: s,
      label: INCOME_STATUS_LABELS[s],
    }));

    if (income) {
      this.field<UiInput>('description').value = income.description;
      this.field<UiMoneyInput>('expected').value = income.expectedValue;
      this.field<UiMoneyInput>('received').value = income.receivedValue ?? null;
      this.field<UiSelect>('type').value = income.type;
      this.field<UiDateInput>('expectedDate').value = income.expectedDate ?? '';
      this.field<UiSelect>('status').value = income.status;
      this.field<UiInput>('notes').value = income.notes ?? '';
    } else {
      this.field<UiSelect>('type').value = 'salary';
      this.field<UiSelect>('status').value = 'expected';
    }
  }

  private field<T extends HTMLElement>(name: string): T {
    return this.querySelector(`[data-f="${name}"]`) as T;
  }

  private render(): void {
    this.innerHTML = `
      <form class="form-grid" novalidate>
        <p class="form-error" role="alert" hidden></p>
        <ui-input data-f="description" label="Descrição" placeholder="Ex.: Salário"></ui-input>
        <div class="grid-2">
          <ui-money-input data-f="expected" label="Valor previsto"></ui-money-input>
          <ui-money-input data-f="received" label="Valor recebido (opcional)"></ui-money-input>
        </div>
        <ui-select data-f="type" label="Tipo de receita"></ui-select>
        <div class="grid-2">
          <ui-date-input data-f="expectedDate" label="Data prevista"></ui-date-input>
          <ui-select data-f="status" label="Status"></ui-select>
        </div>
        <ui-input data-f="notes" label="Observação" rows="2" placeholder="Opcional"></ui-input>
        <div class="form-actions">
          <ui-button data-f="cancel" variant="outline">Cancelar</ui-button>
          <ui-button data-f="save">Salvar receita</ui-button>
        </div>
      </form>
    `;

    this.field<HTMLElement>('cancel').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('cancel', { bubbles: true }));
    });
    this.field<HTMLElement>('save').addEventListener('click', () => this.submit());
    (this.querySelector('form') as HTMLFormElement).addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit();
    });
  }

  private submit(): void {
    const description = this.field<UiInput>('description');
    const expected = this.field<UiMoneyInput>('expected');
    const received = this.field<UiMoneyInput>('received');
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
    if (received.isInvalidText) {
      received.setError('Valor inválido.');
      valid = false;
    }

    errorEl.hidden = valid;
    errorEl.textContent = valid ? '' : 'Revise os campos destacados antes de salvar.';
    if (!valid) return;

    const notes = this.field<UiInput>('notes').value.trim();
    const expectedDate = this.field<UiDateInput>('expectedDate').value;
    const receivedValue = received.value;

    const input: IncomeInput = {
      description: description.value,
      expectedValue: expectedValue as number,
      receivedValue: receivedValue ?? undefined,
      type: this.field<UiSelect>('type').value as IncomeInput['type'],
      expectedDate: expectedDate || undefined,
      status: this.field<UiSelect>('status').value as IncomeInput['status'],
      notes: notes || undefined,
    };

    this.dispatchEvent(new CustomEvent<IncomeInput>('save', { bubbles: true, detail: input }));
  }
}

customElements.define('income-form', IncomeForm);

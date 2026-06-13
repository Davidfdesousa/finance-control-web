import { appStore } from '../state/store';
import type { EmergencyReserve } from '../domain/models';
import {
  buildEmergencyReserve,
  getEmergencyReserve,
  saveEmergencyReserve,
} from '../services/emergency-reserve.service';
import type { UiMoneyInput } from '../components/ui/ui-money-input';
import '../components/reserve/emergency-reserve-card';
import '../components/ui/ui-money-input';
import '../components/ui/ui-button';
import '../components/ui/ui-card';
import '../components/ui/ui-loading';

export class EmergencyReservePage extends HTMLElement {
  private reserve: EmergencyReserve | null = null;
  private unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    this.innerHTML = `
      <div class="page">
        <header><h1 class="page-title">Reserva</h1></header>
        <div class="reserve-content"></div>
      </div>
    `;
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
    return this.querySelector('.reserve-content') as HTMLElement;
  }

  private async load(): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    this.content.innerHTML = '<ui-loading label="Carregando reserva..."></ui-loading>';
    this.reserve = await getEmergencyReserve(user.id);
    this.renderContent();
  }

  private renderContent(): void {
    this.content.innerHTML = `
      <div class="stack">
        <emergency-reserve-card></emergency-reserve-card>
        <ui-card pad="sm">
          <form class="form-grid" novalidate>
            <ui-money-input data-f="target" label="Meta"></ui-money-input>
            <ui-money-input data-f="current" label="Valor atual"></ui-money-input>
            <ui-money-input data-f="monthly" label="Aporte alvo mensal"></ui-money-input>
            <ui-money-input data-f="planned" label="Aporte planejado do mes"></ui-money-input>
            <ui-money-input data-f="actual" label="Aporte realizado do mes"></ui-money-input>
            <ui-button data-f="save">Salvar reserva</ui-button>
          </form>
        </ui-card>
      </div>
    `;
    (this.content.querySelector('emergency-reserve-card') as HTMLElement & {
      reserve: EmergencyReserve | null;
    }).reserve = this.reserve;
    this.field('target').value = this.reserve?.targetValue ?? 0;
    this.field('current').value = this.reserve?.currentValue ?? 0;
    this.field('monthly').value = this.reserve?.monthlyTargetValue ?? 0;
    this.field('planned').value = this.reserve?.currentMonthPlannedContribution ?? 0;
    this.field('actual').value = this.reserve?.currentMonthActualContribution ?? 0;
    (this.content.querySelector('[data-f="save"]') as HTMLElement).addEventListener('click', () =>
      void this.save(),
    );
  }

  private field(name: string): UiMoneyInput {
    return this.content.querySelector(`[data-f="${name}"]`) as UiMoneyInput;
  }

  private async save(): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    const reserve = buildEmergencyReserve(user.id, {
      targetValue: this.field('target').value ?? 0,
      currentValue: this.field('current').value ?? 0,
      monthlyTargetValue: this.field('monthly').value ?? 0,
      currentMonthPlannedContribution: this.field('planned').value ?? 0,
      currentMonthActualContribution: this.field('actual').value ?? 0,
    });
    await saveEmergencyReserve(user.id, reserve);
    this.reserve = reserve;
    this.renderContent();
  }
}

customElements.define('emergency-reserve-page', EmergencyReservePage);

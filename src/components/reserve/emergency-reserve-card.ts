import type { EmergencyReserve } from '../../domain/models';
import { calculateEmergencyReserveProgress } from '../../domain/calculations';
import { formatCurrencyBRL } from '../../utils/format';
import '../ui/progress-bar';
import '../ui/ui-card';

export class EmergencyReserveCard extends HTMLElement {
  set reserve(value: EmergencyReserve | null) {
    const progress = calculateEmergencyReserveProgress(value);
    this.innerHTML = `
      <ui-card pad="sm">
        <div class="stack">
          <div class="row-between">
            <div>
              <p class="metric-label">Reserva de emergencia</p>
              <p class="metric-value">${formatCurrencyBRL(progress.currentValue)}</p>
            </div>
            <span class="money">${progress.percent}%</span>
          </div>
          <progress-bar value="${progress.percent}"></progress-bar>
          <div class="grid-2">
            <div>
              <p class="small muted">Meta</p>
              <p class="money">${formatCurrencyBRL(progress.targetValue)}</p>
            </div>
            <div>
              <p class="small muted">Falta</p>
              <p class="money">${formatCurrencyBRL(progress.missingValue)}</p>
            </div>
            <div>
              <p class="small muted">Planejado mes</p>
              <p class="money">${formatCurrencyBRL(progress.currentMonthPlannedContribution)}</p>
            </div>
            <div>
              <p class="small muted">Realizado mes</p>
              <p class="money">${formatCurrencyBRL(progress.currentMonthActualContribution)}</p>
            </div>
          </div>
        </div>
      </ui-card>
    `;
  }
}

customElements.define('emergency-reserve-card', EmergencyReserveCard);

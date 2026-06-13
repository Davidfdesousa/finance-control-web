import '../ui/ui-button';
import '../ui/ui-card';

export class MonthGeneratorPanel extends HTMLElement {
  connectedCallback(): void {
    this.innerHTML = `
      <ui-card pad="sm">
        <div class="stack">
          <div>
            <p class="item-title">Gerador de recorrencias</p>
            <p class="small muted">Cria receitas e despesas reais a partir dos modelos ativos.</p>
          </div>
          <div class="grid-2">
            <ui-button data-action="current" size="sm">Gerar mes</ui-button>
            <ui-button data-action="next" size="sm" variant="outline">Proximos 6</ui-button>
          </div>
        </div>
      </ui-card>
    `;
    this.querySelector('[data-action="current"]')?.addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('generate-current', { bubbles: true })),
    );
    this.querySelector('[data-action="next"]')?.addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('generate-next', { bubbles: true })),
    );
  }
}

customElements.define('month-generator-panel', MonthGeneratorPanel);

import { appStore } from '../state/store';
import { logout } from '../services/auth.service';
import { updateAptoMoocaStatus } from '../services/settings.service';
import {
  PAYMENT_METHOD_TYPE_LABELS,
  PROPERTY_STATUSES,
  PROPERTY_STATUS_LABELS,
  type CategoryType,
  type PropertyStatus,
} from '../domain/models';
import { escapeHtml } from '../utils/escape';
import type { UiSelect } from '../components/ui/ui-select';
import '../components/ui/ui-card';
import '../components/ui/ui-select';
import '../components/ui/ui-button';

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  income: 'Receita',
  expense: 'Despesa',
  special: 'Especial',
};

export class SettingsPage extends HTMLElement {
  private unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    this.unsubscribe = appStore.subscribe(() => this.render());
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private render(): void {
    const { user, settings, categories, paymentMethods } = appStore.get();
    if (!user) return;

    const avatar = user.photoURL
      ? `<img src="${escapeHtml(user.photoURL)}" alt="" referrerpolicy="no-referrer"
          style="width:56px;height:56px;border-radius:50%;object-fit:cover;" />`
      : `<span style="width:56px;height:56px;border-radius:50%;background:var(--pine);color:var(--paper);
          display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-display);
          font-size:1.5rem;">${escapeHtml(user.name.charAt(0).toUpperCase())}</span>`;

    const categoryRows = categories
      .map(
        (c) => `
          <div class="item-row">
            <div class="item-main">
              <p class="item-title">${escapeHtml(`${c.icon ?? ''} ${c.name}`.trim())}
                <span class="tag">${CATEGORY_TYPE_LABELS[c.type]}</span>
              </p>
              ${
                c.subcategories.length > 0
                  ? `<div class="item-meta">${c.subcategories
                      .map((s) => `<span class="tag">${escapeHtml(s.name)}</span>`)
                      .join('')}</div>`
                  : ''
              }
            </div>
          </div>`,
      )
      .join('');

    const paymentRows = paymentMethods
      .map(
        (m) => `
          <div class="item-row">
            <div class="item-main">
              <p class="item-title">${escapeHtml(m.name)}
                <span class="tag">${PAYMENT_METHOD_TYPE_LABELS[m.type]}</span>
              </p>
            </div>
          </div>`,
      )
      .join('');

    this.innerHTML = `
      <div class="page">
        <header><h1 class="page-title">Configurações</h1></header>

        <ui-card>
          <div class="row">
            ${avatar}
            <div class="item-main">
              <p class="item-title">${escapeHtml(user.name)}</p>
              <p class="small muted">${escapeHtml(user.email)}</p>
            </div>
          </div>
          <div style="margin-top: var(--sp-4);">
            <ui-button full variant="danger" class="logout-btn">Sair da conta</ui-button>
          </div>
        </ui-card>

        <section>
          <h2 class="section-title">Apto Mooca</h2>
          <ui-card pad="sm">
            <p class="small muted" style="margin-bottom: var(--sp-3);">
              Centro de custo do imóvel. Quando for alugado, mude o status e cadastre a
              receita do tipo “Aluguel recebido”.
            </p>
            <ui-select class="apto-status" label="Status do imóvel"></ui-select>
          </ui-card>
        </section>

        <section>
          <h2 class="section-title">Categorias</h2>
          <ui-card pad="sm">${categoryRows || '<p class="muted small">Nenhuma categoria.</p>'}</ui-card>
        </section>

        <section>
          <h2 class="section-title">Formas de pagamento</h2>
          <ui-card pad="sm">${paymentRows || '<p class="muted small">Nenhuma forma de pagamento.</p>'}</ui-card>
        </section>

        <p class="small muted">
          As categorias e formas de pagamento padrão são criadas automaticamente no primeiro
          login. A edição completa chega nas próximas versões.
        </p>
      </div>
    `;

    const statusSelect = this.querySelector('.apto-status') as UiSelect;
    statusSelect.options = PROPERTY_STATUSES.map((s) => ({
      value: s,
      label: PROPERTY_STATUS_LABELS[s],
    }));
    statusSelect.value = settings.aptoMoocaStatus;
    statusSelect.addEventListener('change', () => {
      void this.handleStatusChange(statusSelect.value as PropertyStatus);
    });

    (this.querySelector('.logout-btn') as HTMLElement).addEventListener('click', () => {
      void logout();
    });
  }

  private async handleStatusChange(status: PropertyStatus): Promise<void> {
    const { user } = appStore.get();
    if (!user) return;
    try {
      const settings = await updateAptoMoocaStatus(user.id, status);
      appStore.set({ settings });
    } catch (error) {
      console.error('Falha ao atualizar status do imóvel:', error);
      window.alert('Não foi possível salvar o status do imóvel.');
    }
  }
}

customElements.define('settings-page', SettingsPage);

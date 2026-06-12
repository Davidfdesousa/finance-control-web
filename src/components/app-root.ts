import { hasFirebaseConfig } from '../services/firebase';
import { watchAuth } from '../services/auth.service';
import './app-shell';
import './ui/ui-card';

/**
 * Raiz da aplicação: valida a configuração do Firebase e inicia a autenticação.
 */
export class AppRoot extends HTMLElement {
  connectedCallback(): void {
    if (!hasFirebaseConfig()) {
      this.innerHTML = `
        <div class="page" style="padding-top: var(--sp-10);">
          <h1 class="page-title">Falta configurar o Firebase</h1>
          <ui-card>
            <p>Para rodar o app, crie um arquivo <strong>.env</strong> na raiz do projeto
            (copie de <strong>.env.example</strong>) e preencha as credenciais do seu
            projeto Firebase.</p>
            <p class="small muted" style="margin-top: var(--sp-3);">
              Console Firebase → Configurações do projeto → Seus apps → SDK setup and config.
              Depois reinicie o <strong>npm run dev</strong>.
            </p>
          </ui-card>
        </div>
      `;
      return;
    }

    watchAuth();
    this.innerHTML = '<app-shell></app-shell>';
  }
}

customElements.define('app-root', AppRoot);

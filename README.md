# Bolso · Controle Financeiro Pessoal (MVP 1)

Aplicação web **mobile first** para controle financeiro pessoal: receitas, despesas,
status pago/pendente, dashboard mensal e resumo anual — organizada por mês/ano
(`YYYY-MM`) e por usuário no Firestore.

**Stack:** Vite · TypeScript · Web Components nativos · Firebase Auth (Google) · Firestore.
Sem React, sem Angular, sem Vue, sem backend próprio.

---

## Estrutura de pastas

```
controle-financeiro/
├── index.html                  # Entrada (fonts + #app)
├── firestore.rules             # Regras de segurança do Firestore
├── .env.example                # Modelo das credenciais Firebase
└── src/
    ├── main.ts                 # Registra componentes e monta <app-root>
    ├── styles/
    │   ├── tokens.css          # Design tokens (cores, espaçamento, raio, tipografia)
    │   └── global.css          # Estilos globais (páginas, listas, chips, FAB…)
    ├── domain/                 # Regras de negócio — sem UI, sem Firebase
    │   ├── models.ts           # Entidades: Income, Expense, Category, PaymentMethod…
    │   ├── calculations.ts     # Funções puras: totais, saldos, agrupamentos, resumo anual
    │   └── seed.ts             # Categorias/formas de pagamento padrão (Apto Mooca, Reserva…)
    ├── services/               # Integração com Firebase
    │   ├── firebase.ts         # Inicialização (lê .env)
    │   ├── firestore.repository.ts  # Acesso genérico a users/{uid}/<coleção>
    │   ├── auth.service.ts     # Login Google, logout, watchAuth
    │   ├── settings.service.ts # Perfil, seed inicial, status do Apto Mooca
    │   ├── income.service.ts   # CRUD de receitas + marcar recebida
    │   └── expense.service.ts  # CRUD de despesas + marcar paga
    ├── state/
    │   └── store.ts            # Store pub/sub tipado (usuário, mês selecionado, seeds)
    ├── utils/
    │   ├── format.ts           # formatCurrencyBRL, parseCurrencyBRL, formatDateBR
    │   ├── month.ts            # getCurrentMonthRef, createMonthKey, shiftMonthRef…
    │   ├── id.ts               # generateId
    │   └── escape.ts           # escapeHtml
    ├── components/
    │   ├── app-root.ts         # Valida config do Firebase e inicia o app
    │   ├── app-shell.ts        # Router + navegação inferior
    │   ├── app-router.ts       # Rotas por hash com guarda de autenticação
    │   ├── icons.ts            # SVGs inline
    │   ├── ui/                 # ui-button, ui-input, ui-select, ui-card, ui-checkbox,
    │   │                       # ui-modal, ui-bottom-nav, ui-money-input, ui-date-input,
    │   │                       # ui-empty-state, ui-loading, ui-month-switcher
    │   ├── expense/            # expense-form, expense-list, expense-item
    │   └── income/             # income-form, income-list
    └── pages/                  # auth, dashboard, despesas, receitas, relatórios, config
```

---

## 1. Instalar dependências

Requer Node 18+.

```bash
npm install
```

## 2. Configurar o Firebase

Consulte o guia completo em [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

Resumo dos passos:

1. Acesse o [Console do Firebase](https://console.firebase.google.com) e crie um projeto.
2. Crie um app **Web** dentro do projeto e copie as credenciais geradas.
3. **Authentication** → *Sign-in method* → habilite **Google**.
4. **Firestore Database** → *Criar banco de dados* (modo production).
5. Publique as regras de segurança a partir do arquivo `firestore.rules`.
6. Copie o `.env.example` para `.env` e preencha com os valores do `firebaseConfig`.

O guia [FIREBASE_SETUP.md](FIREBASE_SETUP.md) cobre cada passo em detalhe, incluindo onde encontrar as configuracoes, como confirmar o dominio autorizado e um checklist de validacao.

## 3. Rodar localmente

```bash
npm run dev
```

Abra http://localhost:5173. No primeiro login com Google, o app cria automaticamente
o perfil, as categorias (incluindo **Apto Mooca** e **Reserva**), subcategorias e
formas de pagamento padrão.

## 4. Build de produção

```bash
npm run build    # roda tsc (checagem de tipos) + vite build → dist/
npm run preview  # serve o build localmente
```

---

## Modelo de dados no Firestore

```
users/{uid}                       → { profile, settings }   (settings.aptoMoocaStatus)
users/{uid}/categories/{id}       → Category (subcategorias embutidas)
users/{uid}/paymentMethods/{id}   → PaymentMethod
users/{uid}/incomes/{id}          → Income  (campo monthRef: 'YYYY-MM')
users/{uid}/expenses/{id}         → Expense (campo monthRef: 'YYYY-MM')
```

> **Por que coleções planas em vez de `months/{key}/expenses`?** Mantém os dados
> organizados por usuário e mês (campo indexado `monthRef`), permite buscar o mês com
> um único `where('monthRef','==',…)` e o **ano inteiro com uma única query de range**
> (`>= '2026-01'` e `<= '2026-12'`), sem precisar de 12 leituras nem de índices
> compostos. A organização lógica por mês/ano é a mesma exigida no MVP.

## Decisões técnicas

- **Web Components nativos**: primitivas `ui-*` usam Shadow DOM (encapsulamento +
  tokens via CSS custom properties, que atravessam o shadow boundary); páginas usam
  light DOM para compor as primitivas com o CSS global.
- **Domínio separado da UI**: `src/domain/calculations.ts` só tem funções puras
  (saldos, totais, agrupamentos, resumo anual, resultado de centro de custo), fáceis
  de testar e reaproveitar no MVP 2.
- **Cartões são forma de pagamento, não categoria**: `Cartão Itaú`/`Cartão Nubank`
  nascem como `paymentMethods` com `type: credit_card`. O agrupamento "total por forma
  de pagamento" do dashboard já é, na prática, a prévia da fatura do MVP 2
  (`creditCardInvoiceId` já existe no modelo de despesa).
- **Apto Mooca como centro de custo**: categoria própria com subcategorias (Parcela,
  Condomínio, Enel, Reforma, Manutenção) e card no dashboard com
  `resultado = aluguel recebido − custos` (hoje `0 − custos`). O status do imóvel
  (`nao_alugado | em_reforma | anunciado | alugado`) fica em `users/{uid}.settings` e
  é editável em Configurações.
- **Reserva não é dinheiro perdido**: categoria especial (`type: 'special'`) +
  despesas com `expenseType: 'reserve'`. O aporte entra no fluxo do mês (sai do
  bolso), mas o dashboard mostra um card próprio "Reserva no mês"; o modelo já permite
  separar aporte planejado × realizado no futuro.
- **Status simples na UI, completo no modelo**: o checkbox alterna apenas
  `paid ↔ pending` (preenchendo/limpando `paidDate`), mas o modelo aceita
  `partially_paid`, `delayed`, `canceled` — e o formulário já permite usá-los.
- **Datas como strings** (`YYYY-MM-DD` / ISO) e **valores em reais com 2 casas**:
  comparáveis lexicograficamente, sem fuso/Timestamp no MVP.
- **Escritas com `setDoc` completo** (sem merge): o documento espelha a entidade;
  campos removidos (ex.: `paidDate` ao desmarcar) somem de verdade.
- **Atualização de tela pós-mutação** é local (lista em memória) — sem `onSnapshot`
  no MVP 1, o que simplifica o ciclo de vida dos componentes.

## Critérios de aceite cobertos

Login/logout Google · dashboard do mês com 7 indicadores + pendências + totais por
categoria e forma de pagamento + card Apto Mooca · troca de mês · CRUD completo de
receitas e despesas · marcar pago/recebido via checkbox · filtros de despesas
(status, categoria, forma) · relatório anual (totais, saldo, média mensal,
agrupamentos) · seed automático no primeiro login · persistência total no Firestore
(dados por `uid`) · layout mobile first com navegação inferior.

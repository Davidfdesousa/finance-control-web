# Configurando o Firebase

Guia passo a passo para conectar o projeto a um projeto Firebase.

---

## 1. Criar o app Web dentro do projeto

No Console do Firebase, com o projeto aberto:

1. Clique em **Add app**.
2. Escolha o ícone **Web**.
3. Em **App nickname**, coloque algo como:

```
finance-controls-web
```

4. Não precisa marcar Firebase Hosting agora, a menos que você queira publicar pelo Firebase.
5. Clique em **Register app**.

Depois disso, o Firebase vai mostrar um bloco parecido com este:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "finance-controls-731c6.firebaseapp.com",
  projectId: "finance-controls-731c6",
  storageBucket: "finance-controls-731c6.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

Esses valores são exatamente os que você precisa copiar para o `.env`.

A própria documentação do Firebase indica que, para projetos Web, você registra um app Web dentro do projeto e usa o objeto `firebaseConfig` gerado no console.

---

## 2. Preencher o `.env`

Na raiz do projeto, rode:

```bash
copy .env.example .env    # Windows
cp .env.example .env      # macOS / Linux
```

Depois abra o arquivo `.env` e preencha assim, usando os valores do `firebaseConfig`:

```
VITE_FIREBASE_API_KEY=valor_do_apiKey
VITE_FIREBASE_AUTH_DOMAIN=valor_do_authDomain
VITE_FIREBASE_PROJECT_ID=valor_do_projectId
VITE_FIREBASE_STORAGE_BUCKET=valor_do_storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=valor_do_messagingSenderId
VITE_FIREBASE_APP_ID=valor_do_appId
```

Exemplo usando o formato provável do seu projeto:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=finance-controls-731c6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=finance-controls-731c6
VITE_FIREBASE_STORAGE_BUCKET=finance-controls-731c6.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Não invente esses valores. Copie exatamente do bloco que o Firebase vai gerar.

> **Observacao:** o `apiKey` do Firebase em apps Web nao e uma senha secreta. O proprio Firebase trata esses dados de configuracao como publicos, mas a protecao real vem das regras do Firestore e do Authentication.

---

## 3. Onde encontrar as configs depois, se voce fechar a tela

Caso voce crie o app e depois feche a tela de configuracao:

1. Clique na engrenagem no menu lateral esquerdo.
2. Entre em **Project settings**.
3. Desca ate a secao **Your apps** / **Seus apps**.
4. Clique no app Web que voce criou.
5. Procure por **SDK setup and configuration**.
6. Selecione **Config**.
7. Copie os valores do `firebaseConfig`.

O mapeamento e este:

```
apiKey              -> VITE_FIREBASE_API_KEY
authDomain          -> VITE_FIREBASE_AUTH_DOMAIN
projectId           -> VITE_FIREBASE_PROJECT_ID
storageBucket       -> VITE_FIREBASE_STORAGE_BUCKET
messagingSenderId   -> VITE_FIREBASE_MESSAGING_SENDER_ID
appId               -> VITE_FIREBASE_APP_ID
```

---

## 4. Ativar login com Google

Depois de configurar o app Web:

1. No menu lateral, clique em **Authentication**.
2. Clique em **Get started**, se aparecer.
3. Va em **Sign-in method**.
4. Clique em **Google**.
5. Ative o provider.
6. Escolha um e-mail de suporte do projeto.
7. Clique em **Save**.

A documentacao oficial do Firebase para login com Google orienta habilitar o provedor Google dentro de **Authentication > Sign-in method**.

---

## 5. Confirmar dominio autorizado

Ainda em **Authentication**:

1. Va em **Settings**.
2. Entre em **Authorized domains**.
3. Confirme que existe:

```
localhost
```

Normalmente ele ja vem por padrao.

Para rodar local com Vite em `http://localhost:5173`, o dominio autorizado precisa ser apenas `localhost`, nao precisa incluir a porta.

---

## 6. Criar o Firestore Database

No menu lateral:

1. Clique em **Databases & Storage** (ou **Build > Firestore Database**).
2. Entre em **Firestore Database**.
3. Clique em **Create database**.
4. Escolha **Production mode**.
5. Escolha a regiao.

Para usuarios no Brasil, pode usar uma regiao proxima se aparecer. Se nao souber, escolha uma opcao padrao recomendada pelo Firebase. Depois de criado, normalmente nao e algo que voce fica trocando.

O Firebase recomenda usar Authentication junto com Firestore Security Rules para proteger os dados no Cloud Firestore em apps Web.

---

## 7. Publicar as regras do Firestore

Depois que o banco existir:

1. Entre em **Firestore Database**.
2. Clique na aba **Rules** / **Regras**.
3. Abra o arquivo `firestore.rules` na raiz do projeto.
4. Copie todo o conteudo.
5. Cole no editor de regras do Firebase.
6. Clique em **Publish**.

O Firebase permite publicar regras pelo console, pela CLI ou pela API. Pelo console, voce edita as regras e clica em **Publish**.

---

## 8. Rodar o projeto localmente

Depois de preencher o `.env`, salve o arquivo e rode:

```bash
npm run dev
```

Abra `http://localhost:5173` e faca login com Google.

No primeiro login, o app cria automaticamente:

- Perfil do usuario.
- Categorias padrao.
- Categoria **Apto Mooca**.
- Categoria **Reserva**.
- Subcategorias.
- Formas de pagamento padrao.

---

## 9. Checklist rapido para validar se esta tudo certo

Antes de testar o app, confirme:

- [ ] App Web criado em **Project Overview > Add app > Web**.
- [ ] `.env` preenchido com os valores do `firebaseConfig`.
- [ ] **Authentication > Google** habilitado.
- [ ] **Authentication > Authorized domains** contem `localhost`.
- [ ] **Firestore Database** criado em modo production.
- [ ] Regras do arquivo `firestore.rules` publicadas.
- [ ] Servidor local reiniciado depois de alterar o `.env`.

Esse ultimo ponto e importante: se voce editou o `.env` com o Vite ja rodando, pare o terminal com `Ctrl + C` e rode novamente:

```bash
npm run dev
```

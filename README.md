# Projeto LES

## Sobre o projeto

Este projeto esta sendo desenvolvido para a disciplina de Laboratorio de Engenharia de Software (LES) da Fatec Mogi das Cruzes.

O objetivo e construir um sistema web de e-commerce com duas areas principais:

- Cliente
- Administrador

O sistema segue arquitetura MVC, separando interface, regras de negocio e acesso aos dados.

## Tecnologias utilizadas

### Front-end

- HTML5
- CSS3
- JavaScript

### Back-end

- Node.js
- Firebase Authentication
- Firebase Data Connect
- GraphQL
- Cloudinary

### Banco de dados

- PostgreSQL gerenciado pelo Firebase Data Connect

## Modelagem de dados

Algumas entidades principais do sistema:

- Usuario
- Endereco
- Produto
- Pedido
- ItemPedido
- CartaoCredito
- Cupom

## Arquitetura

O projeto utiliza o padrao MVC:

- Model: representacao e manipulacao dos dados
- View: interface do usuario
- Controller: regras de negocio e comunicacao entre View e Model

# Setup local

## Arquivos de exemplo incluidos no repositorio:

- `server/.env.example`
- `server/serviceAccount.example.json`

## Como configurar:

1. Crie `server/.env` usando `server/.env.example` como base.
2. Crie `server/serviceAccount.json` usando `server/serviceAccount.example.json` como base.
3. Preencha as credenciais do Firebase Web, Firebase Data Connect, Cloudinary e a conta de servico.

### O que cada arquivo faz

#### `server/.env`

Guarda as variaveis de ambiente do projeto, por exemplo:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_API_KEY`
- `DATACONNECT_LOCATION`
- `DATACONNECT_SERVICE_ID`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_PRESET`

#### `server/serviceAccount.json`

E a credencial privada da conta de servico do Firebase/Google Cloud. Ela e usada somente pelo servidor para gerar o token OAuth que acessa o Firebase Data Connect.

Esse arquivo nao deve ir para o front-end nem para um repositorio publico.

## Observacoes

- `FIREBASE_API_KEY` nao substitui o `serviceAccount.json`. Eles tem funcoes diferentes.
- `.firebaserc` normalmente nao e segredo, mas pode ser removido do versionamento se cada pessoa for usar um projeto Firebase proprio.
- Se um arquivo sensivel ja foi enviado ao Git alguma vez, colocar no `.gitignore` impede novos envios, mas nao limpa o historico antigo.

## Como rodar o projeto

Execute no terminal:

```bash
npm start
```

Isso inicia:

- o back-end em `http://localhost:3000`
- o front-end em `http://localhost:5500/view/index.html`

Para encerrar ambos, pressione `CTRL+C`.

Se a porta `5500` ja estiver em uso, o inicializador tenta automaticamente a proxima porta disponivel e mostra o link correto no terminal.

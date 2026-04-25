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

## Testes automatizados com Cypress

O projeto possui um teste E2E para simular uma compra com escolhas aleatorias na tela:

- escolhe um ou mais produtos na home
- envia para o carrinho
- abre a finalizacao de compra
- escolhe endereco, cartoes, cupom promocional e cupons de troca/sobra
- conclui a compra
- valida se o pedido aparece na lista de pedidos do cliente

Antes de rodar pela primeira vez, instale o Cypress:

```bash
npm install --save-dev cypress
```

Depois, crie `cypress.env.json` usando `cypress.env.example.json` como base:

```json
{
  "USER_EMAIL": "cliente.teste@email.com",
  "USER_PASSWORD": "senha-do-cliente-ativo",
  "MAX_RANDOM_PRODUCTS": 3,
  "MAX_EXTRA_CARDS": 3
}
```

Para executar:

1. Em um terminal, rode `npm start`.
2. Em outro terminal, rode `npm run cy:open` ou `npm run cy:run`.

Observacao importante: esse teste usa o banco real configurado no `.env`. Ele pode criar pedidos, consumir cupons, alterar estoque reservado/fisico e atualizar ranking do cliente.

## Exportar e importar dados de catalogo

O projeto possui scripts para compartilhar dados iniciais entre bancos Firebase Data Connect sem exportar dados de usuarios.

O export inclui:

- tipos e status do sistema
- bandeiras de cartao
- grupos de precificacao
- marcas
- categorias
- produtos
- imagens dos produtos
- fornecedores
- entradas de estoque

O export nao inclui:

- usuarios
- enderecos
- telefones
- cartoes de credito
- pedidos
- pagamentos
- cupons de clientes
- trocas
- logs de auditoria

Por seguranca, `estoqueReservado` e `quantidadeVendida` saem zerados no arquivo exportado, porque esses campos podem refletir carrinhos e compras de usuarios.

### Exportar catalogo

Com o `.env` apontando para o banco de origem, execute:

```bash
npm run seed:export
```

Isso cria:

```bash
seed/catalogo.json
```

Tambem e possivel escolher outro caminho:

```bash
npm run seed:export -- seed/meu-catalogo.json
```

### Importar catalogo

No projeto de destino, configure `server/.env` com as credenciais do Firebase Data Connect e do Cloudinary da pessoa que vai receber os dados.

Depois execute:

```bash
npm run seed:import
```

Por padrao, ele le:

```bash
seed/catalogo.json
```

Tambem e possivel escolher outro arquivo:

```bash
npm run seed:import -- seed/meu-catalogo.json
```

Durante a importacao, as imagens dos produtos sao reenviadas para o Cloudinary configurado no `.env` de destino. O diretorio usado no Cloudinary pode ser ajustado por:

```bash
CLOUDINARY_SEED_FOLDER=ecommerce-seed
```

O import tenta reaproveitar registros existentes por nome ou `codigoProduto`, atualizando produtos ja existentes e evitando duplicar entradas de estoque identicas.

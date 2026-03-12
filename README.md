# Projeto LES
## 📌 Sobre o Projeto

Este projeto está sendo desenvolvido como parte da disciplina **Laboratório de Engenharia de Software (LES)** na **Faculdade de Tecnologia Mogi das Cruzes (Fatec MC)**.

O objetivo é criar um sistema web de e-commerce, permitindo que clientes naveguem por produtos, realizem compras e acompanhem seu histórico de pedidos, enquanto administradores podem gerenciar produtos e informações do sistema.

O sistema terá dois tipos principais de usuários:

- Cliente

  - Cadastro e login

  - Visualização de produtos

  - Realização de pedidos

  - Consulta de histórico

- Administrador

  - Gerenciamento de produtos

  - Controle de informações do sistema

  - Acesso a funcionalidades administrativas

O projeto segue uma arquitetura baseada em MVC, separando responsabilidades entre interface, lógica de aplicação e acesso aos dados.

## 🧱 Tecnologias Utilizadas
### Front-end

O front-end será responsável pela interface visual do sistema e pela interação com o usuário.

Tecnologias utilizadas:

HTML5 — estrutura das páginas

CSS3 — estilização e layout da interface

JavaScript — interatividade e comunicação com o back-end

### Back-end

O back-end será responsável pela lógica de negócio do sistema e pela comunicação com o banco de dados.

Tecnologias utilizadas:

Firebase Data Connect

GraphQL — definição de tipos e comunicação com o banco

### Banco de Dados

O banco de dados armazenará as informações do sistema, como clientes, produtos, pedidos e endereços.

Tecnologia utilizada:

PostgreSQL (gerenciado pelo Firebase Data Connect)

## 🧩 Modelagem de Dados

A modelagem de dados será definida utilizando GraphQL, com entidades principais como:

Cliente

Endereço

Produto

Pedido

Itens do Pedido

## 🏗️ Arquitetura

O projeto seguirá o padrão MVC (Model-View-Controller):

Model → Representação e manipulação dos dados

View → Interface do usuário (HTML/CSS/JS)

Controller → Regras de negócio e comunicação entre View e Model

Essa separação facilita manutenção, organização do código e escalabilidade do sistema.

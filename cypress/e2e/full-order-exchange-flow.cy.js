function expectOkResponse(interception, label) {
  expect(interception.response, `${label} response`).to.exist;
  expect(interception.response.statusCode, `${label} status`).to.be.within(200, 299);
}

function envBoolean(name, defaultValue) {
  const value = Cypress.env(name);
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return ["1", "true", "sim", "yes"].includes(String(value).toLowerCase());
}

function envNumber(name, defaultValue) {
  const value = Number(Cypress.env(name));
  return Number.isFinite(value) ? value : defaultValue;
}

function envText(name, defaultValue) {
  const value = Cypress.env(name);
  return value === undefined || value === null || value === "" ? defaultValue : String(value);
}

function envList(name, defaultValue) {
  const value = Cypress.env(name);
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return defaultValue;
}

function randomInt(min, max) {
  return Cypress._.random(min, max);
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function clickButtonNow(label) {
  cy.contains("button", label).then(($button) => {
    expect($button.length, `botao ${label}`).to.be.greaterThan(0);
    $button[0].click();
  });
}

function clickMatchingButtonNow(selector, label) {
  cy.contains(selector, label).then(($button) => {
    expect($button.length, `botao ${label}`).to.be.greaterThan(0);
    $button[0].click();
  });
}

function luhnCheckDigit(numberWithoutCheckDigit) {
  const digits = onlyDigits(numberWithoutCheckDigit).split("").map(Number);
  let sum = 0;
  let doubleDigit = true;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = digits[index];
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return String((10 - (sum % 10)) % 10);
}

function buildVisaTestCardNumber() {
  const prefix = "411111";
  const body = Cypress._.times(9, () => String(randomInt(0, 9))).join("");
  const partial = `${prefix}${body}`;
  return `${partial}${luhnCheckDigit(partial)}`;
}

function waitForCheckoutData() {
  cy.intercept("GET", "**/api/carrinho").as("checkoutCarrinho");
  cy.intercept("GET", "**/api/usuario/enderecos").as("checkoutEnderecos");
  cy.intercept("GET", "**/api/usuario/cartoes").as("checkoutCartoes");
  cy.intercept("GET", "**/api/usuario/cupons").as("checkoutCupons");
  cy.reload();
  cy.wait("@checkoutCarrinho", { timeout: 90000 }).then((interception) => {
    expectOkResponse(interception, "carregar carrinho no checkout");
  });
  cy.wait("@checkoutEnderecos", { timeout: 90000 }).then((interception) => {
    expectOkResponse(interception, "carregar enderecos no checkout");
  });
  cy.wait("@checkoutCartoes", { timeout: 90000 }).then((interception) => {
    expectOkResponse(interception, "carregar cartoes no checkout");
  });
  cy.wait("@checkoutCupons", { timeout: 90000 }).then((interception) => {
    expectOkResponse(interception, "carregar cupons no checkout");
  });
  cy.waitForAppIdle();
}

function addProductsFromHome() {
  const maxProducts = Math.max(1, envNumber("FULL_FLOW_MAX_RANDOM_PRODUCTS", 2));
  cy.intercept("POST", "**/api/carrinho/adicionar").as("addToCartFullFlow");

  cy.get("#productsList .product-card", { timeout: 60000 })
    .filter((_, element) => Boolean(element.querySelector(".product-actions button")))
    .should("have.length.greaterThan", 0)
    .then(($cards) => {
      const amount = Math.min($cards.length, randomInt(1, maxProducts));
      const indexes = Cypress._.sampleSize(
        Array.from({ length: $cards.length }, (_, index) => index),
        amount
      );

      cy.wrap(indexes).each((index) => {
        cy.get("#productsList .product-card")
          .filter((_, element) => Boolean(element.querySelector(".product-actions button")))
          .eq(index)
          .within(() => {
            cy.get(".product-actions button").first().click({ force: true });
          });

        cy.wait("@addToCartFullFlow", { timeout: 60000 }).then((interception) => {
          expectOkResponse(interception, "adicionar produto ao carrinho");
        });
        cy.waitForAppIdle();
        cy.closeCartPopupIfOpen();
      });
    });
}

function assertCartHasPositiveItems() {
  cy.get("#cart-items-list .cart-item", { timeout: 60000 }).should(($items) => {
    const positiveItems = Array.from($items).filter((item) => {
      const text = item.innerText || "";
      return !item.classList.contains("is-zero") && !text.includes("Nenhum produto");
    });

    expect(positiveItems, "itens com quantidade positiva no carrinho").to.have.length.greaterThan(0);
  });
}

function goToCheckoutFromHome() {
  addProductsFromHome();

  cy.get("#btn-carrinho").click();
  cy.location("pathname", { timeout: 60000 }).should("include", "/view/pages/carrinho.html");
  cy.waitForAppIdle();
  assertCartHasPositiveItems();

  cy.get("#btn-finalizar").click();
  cy.location("pathname", { timeout: 60000 }).should("include", "/view/pages/finalizar.html");
  cy.waitForAppIdle();
  waitForCheckoutData();

  cy.get("#checkout-items-list .checkout-item", { timeout: 60000 })
    .should("have.length.greaterThan", 0)
    .and("not.contain", "Nenhum produto");
}

function addAddressDuringCheckout() {
  const suffix = Date.now().toString().slice(-5);
  cy.intercept("POST", "**/api/usuario/enderecos").as("createCheckoutAddress");

  cy.get("#btn-endereco-add").click();
  cy.get("#endereco-modal").should("not.have.class", "hidden");
  cy.selectRandomOption("#end-tipoResidencia");
  cy.selectRandomOption("#end-tipoLogradouro");
  cy.get("#end-logradouro").clear().type(`Rua Cypress ${suffix}`);
  cy.get("#end-numero").clear().type(String(randomInt(10, 9999)));
  cy.get("#end-bairro").clear().type("Centro");
  cy.get("#end-cep").clear().type("01001000");
  cy.get("#end-cidade").clear().type("Sao Paulo");
  cy.get("#end-estado").clear().type("SP");
  cy.get("#end-pais").clear().type("Brasil");
  cy.get("#end-observacoes").clear().type("Endereco criado por teste automatizado.");
  cy.get("#btn-endereco-salvar").click();

  cy.wait("@createCheckoutAddress", { timeout: 90000 }).then((interception) => {
    expectOkResponse(interception, "criar endereco no checkout");
    if (interception.response.body?.id) {
      cy.wrap(interception.response.body.id, { log: false }).as("fullFlowAddressId");
    }
  });
  cy.get("#endereco-modal", { timeout: 60000 }).should("have.class", "hidden");
  cy.waitForAppIdle();
}

function addCardDuringCheckout(cardNumber) {
  cy.intercept("POST", "**/api/usuario/cartoes").as("createCheckoutCard");
  cy.get("#btn-cartao-add").click();
  cy.get("#cartao-modal").should("not.have.class", "hidden");
  cy.selectRandomOption("#modal-cartao-bandeira");
  cy.get("#modal-cartao-numero").clear().type(cardNumber, { log: false });
  cy.get("#modal-cartao-nome")
    .clear()
    .type(envText("FULL_FLOW_CARD_HOLDER", "Cliente Teste Cypress"));
  cy.get("#modal-cartao-cvv").clear().type(envText("FULL_FLOW_CARD_CVV", "123"), { log: false });
  cy.get("#modal-cartao-validade").clear().type(envText("FULL_FLOW_CARD_EXPIRY", "2032-12"));
  cy.get("#btn-cartao-salvar").click();

  cy.wait("@createCheckoutCard", { timeout: 90000 }).then((interception) => {
    expectOkResponse(interception, "criar cartao no checkout");
  });
  cy.get("#cartao-modal", { timeout: 60000 }).should("have.class", "hidden");
  cy.waitForAppIdle();
}

function selectCardByFinal4(selector, final4) {
  cy.get(selector).then(($select) => {
    const option = Array.from($select[0].options).find((item) => item.textContent.includes(final4));
    expect(option, `cartao final ${final4}`).to.exist;
    cy.wrap($select).select(option.value);
  });
  cy.waitForAppIdle();
}

function createAddressIfConfigured() {
  if (envBoolean("FULL_FLOW_NEW_ADDRESS", true)) {
    addAddressDuringCheckout();
  }
}

function chooseAddressAfterReloads() {
  if (envBoolean("FULL_FLOW_NEW_ADDRESS", true)) {
    cy.get("@fullFlowAddressId").then((addressId) => {
      cy.get("#endereco-select", { timeout: 60000 }).should(($select) => {
        const options = Array.from($select[0].options).filter((option) => option.value && !option.disabled);
        expect(options, "enderecos disponiveis no checkout").to.have.length.greaterThan(0);
      });

      cy.get("#endereco-select").then(($select) => {
        const options = Array.from($select[0].options).filter((option) => option.value && !option.disabled);
        const createdOption = options.find((option) => option.value === addressId);

        if (createdOption) {
          cy.wrap($select).select(createdOption.value);
          return;
        }

        if (envBoolean("FULL_FLOW_REQUIRE_NEW_ADDRESS", false)) {
          throw new Error(
            `Endereco criado (${addressId}) nao apareceu no select do checkout. ` +
              "Defina FULL_FLOW_REQUIRE_NEW_ADDRESS=false para permitir fallback."
          );
        }

        cy.log(`Endereco criado ${addressId} nao apareceu no select; usando outro endereco disponivel.`);
        cy.wrap($select).select(options[0].value);
      });
    });
    cy.waitForAppIdle();
    return;
  }

  cy.selectRandomOption("#endereco-select");
  cy.waitForAppIdle();
}

function ensureCheckoutCards() {
  const count = Math.max(0, envNumber("FULL_FLOW_NEW_CARD_COUNT", 2));
  const configuredNumber = onlyDigits(Cypress.env("FULL_FLOW_NEW_CARD_NUMBER"));
  const cards = [];

  Cypress._.times(count, (index) => {
    const number = index === 0 && configuredNumber ? configuredNumber : buildVisaTestCardNumber();
    cards.push(number);
    addCardDuringCheckout(number);
  });

  cy.wrap(cards, { log: false }).as("fullFlowCardNumbers");
}

function choosePrincipalCard() {
  cy.get("@fullFlowCardNumbers").then((cards) => {
    const numbers = Array.isArray(cards) ? cards : [];
    if (numbers.length) {
      selectCardByFinal4("#cartao-principal", numbers[0].slice(-4));
      return;
    }

    cy.get("#cartao-principal").then(($select) => {
      expect($select.prop("disabled"), "cartao principal habilitado").to.equal(false);
      const options = Array.from($select[0].options).filter((option) => option.value);
      expect(options, "cartoes disponiveis").to.have.length.greaterThan(0);
      cy.wrap($select).select(options[0].value);
    });
    cy.waitForAppIdle();
  });
}

function maybeChoosePromoCoupon() {
  const mode = envText("FULL_FLOW_PROMO_MODE", "if_available").toLowerCase();
  if (mode === "none" || mode === "never") return;

  cy.get("#cupom-promo").then(($select) => {
    const options = Array.from($select[0].options).filter((option) => option.value);
    if (!options.length) return;
    if (mode === "random" && !Cypress._.sample([true, false])) return;
    cy.wrap($select).select(Cypress._.sample(options).value);
  });
  cy.waitForAppIdle();
}

function maybeChooseExchangeCoupons() {
  const mode = envText("FULL_FLOW_EXCHANGE_COUPON_MODE", "if_available").toLowerCase();
  if (mode === "none" || mode === "never") return;

  const maxCoupons = Math.max(0, envNumber("FULL_FLOW_MAX_EXCHANGE_COUPONS", 1));
  cy.get("body").then(($body) => {
    const checkboxes = Array.from($body.find("#cupom-troca-list input[type='checkbox']"))
      .filter((item) => !item.disabled);
    if (!checkboxes.length || maxCoupons <= 0) return;

    const amount = mode === "random"
      ? randomInt(0, Math.min(maxCoupons, checkboxes.length))
      : Math.min(maxCoupons, checkboxes.length);
    const sampled = Cypress._.sampleSize(
      Array.from({ length: checkboxes.length }, (_, index) => index),
      amount
    );

    cy.wrap(sampled).each((index) => {
      cy.get("#cupom-troca-list input[type='checkbox']").eq(index).then(($checkbox) => {
        if ($checkbox.prop("disabled") || $checkbox.prop("checked")) return;
        cy.wrap($checkbox).check({ force: true });
        cy.waitForAppIdle();
      });
    });
  });
}

function addExtraCardsIfPossible() {
  const target = Math.max(0, envNumber("FULL_FLOW_MAX_EXTRA_CARDS", 1));
  if (target <= 0) return;

  cy.get("@fullFlowCardNumbers").then((cards) => {
    const numbers = Array.isArray(cards) ? cards : [];
    const extraNumbers = numbers.slice(1, target + 1);

    cy.wrap(extraNumbers).each((number) => {
      cy.get("#btn-cartao-extra-add").then(($button) => {
        if ($button.prop("disabled")) return;
        const beforeCount = Cypress.$("#cartoes-extras-list .card-extra-row").length;
        cy.wrap($button).click();
        cy.waitForAppIdle();
        cy.get("body").then(() => {
          const rows = Cypress.$("#cartoes-extras-list .card-extra-row");
          if (rows.length <= beforeCount) return;
          cy.get("#cartoes-extras-list .card-extra-row").last().within(() => {
            cy.get("select").then(($select) => {
              const final4 = number.slice(-4);
              const option = Array.from($select[0].options).find((item) => item.textContent.includes(final4));
              if (option) {
                cy.wrap($select).select(option.value);
              }
            });
            cy.get("input")
              .clear()
              .type(envText("FULL_FLOW_EXTRA_CARD_VALUE", "10"))
              .blur();
          });
          cy.waitForAppIdle();
        });
      });
    });
  });
}

function configureCheckoutPayment() {
  createAddressIfConfigured();
  ensureCheckoutCards();
  chooseAddressAfterReloads();
  choosePrincipalCard();
  addExtraCardsIfPossible();
  maybeChoosePromoCoupon();
  maybeChooseExchangeCoupons();
  cy.waitForAppIdle();
}

function finalizeCheckout() {
  cy.intercept("POST", "**/api/checkout/finalizar").as("finishCheckoutFullFlow");
  cy.get("#btn-comprar").click();

  return cy.wait("@finishCheckoutFullFlow", { timeout: 120000 }).then((interception) => {
    expectOkResponse(interception, "finalizar compra");
    expect(interception.response.body).to.have.property("ok", true);
    expect(interception.response.body.pedidoId, "pedido criado").to.be.a("string").and.not.be.empty;
    expect(interception.response.body.status, "status do pedido").to.be.oneOf(["APROVADA", "REPROVADA"]);
    return interception.response.body;
  });
}

function openCustomerOrders() {
  cy.visit("/view/pages/perfil.html#pedidos");
  cy.waitForAppIdle();
  cy.get("#pedidos-list .pedido-card", { timeout: 60000 }).should("have.length.greaterThan", 0);
}

function withinOrderCard(cardSelector, pedidoId, expectedStatus, callback) {
  cy.get(cardSelector, { timeout: 90000 })
    .should("have.length.greaterThan", 0)
    .then(($cards) => {
      const cards = Array.from($cards);
      const cardById = cards.find((card) => card.dataset.pedidoId === pedidoId);
      const fallbackCard = cards.find((card) => (card.innerText || "").includes(expectedStatus));
      const card = cardById || fallbackCard;

      expect(
        card,
        `card do pedido ${pedidoId} ou card mais recente com status ${expectedStatus}`
      ).to.exist;

      if (!cardById) {
        cy.log(`Pedido ${pedidoId} sem data-pedido-id no DOM; usando fallback por status ${expectedStatus}.`);
      }

      cy.wrap(Cypress.$(card)).should("contain.text", expectedStatus).within(callback);
    });
}

function withinOrderCardMatching(cardSelector, pedidoId, expectedPattern, callback) {
  cy.get(cardSelector, { timeout: 90000 })
    .should("have.length.greaterThan", 0)
    .then(($cards) => {
      const cards = Array.from($cards);
      const matches = (card) => expectedPattern.test(card.innerText || "");
      const cardById = cards.find((card) => card.dataset.pedidoId === pedidoId);
      const fallbackCard = cards.find(matches);
      const card = cardById || fallbackCard;

      expect(card, `card do pedido ${pedidoId} ou card que combina com ${expectedPattern}`).to.exist;

      if (!cardById) {
        cy.log(`Pedido ${pedidoId} sem data-pedido-id no DOM; usando fallback por texto.`);
      }

      cy.wrap(Cypress.$(card)).should(($card) => {
        expect($card.text()).to.match(expectedPattern);
      }).within(callback);
    });
}

function withinExchangeCard(cardSelector, descricaoId, expectedText, callback) {
  cy.get(cardSelector, { timeout: 90000 })
    .should("have.length.greaterThan", 0)
    .then(($cards) => {
      const cards = Array.from($cards);
      const cardById = cards.find((card) => card.dataset.descricaoId === descricaoId);
      const fallbackCard = cards.find((card) => (card.innerText || "").includes(expectedText));
      const card = cardById || fallbackCard;

      expect(card, `card da troca ${descricaoId} ou card com texto ${expectedText}`).to.exist;

      if (!cardById) {
        cy.log(`Troca ${descricaoId} sem data-descricao-id no DOM; usando fallback por texto.`);
      }

      cy.wrap(Cypress.$(card)).should("contain.text", expectedText).within(callback);
    });
}

function checkoutAttemptFromCurrentHome() {
  goToCheckoutFromHome();
  configureCheckoutPayment();
  return finalizeCheckout();
}

function retryRejectedOrderIfNeeded(result) {
  if (result.status !== "REPROVADA") {
    return cy.wrap(result, { log: false });
  }

  openCustomerOrders();
  withinOrderCard("#pedidos-list .pedido-card", result.pedidoId, "REPROVADA", () => {
    clickButtonNow("RECOLOCAR NO CARRINHO");
  });
  cy.waitForAppIdle();

  cy.visit("/view/pages/carrinho.html");
  cy.waitForAppIdle();
  assertCartHasPositiveItems();
  cy.get("#btn-finalizar").click();
  cy.location("pathname", { timeout: 60000 }).should("include", "/view/pages/finalizar.html");
  cy.waitForAppIdle();
  waitForCheckoutData();

  ensureCheckoutCards();
  choosePrincipalCard();
  return finalizeCheckout().then((retryResult) => {
    expect(retryResult.status, "pedido reaprovado apos tentativa").to.equal("APROVADA");
    return retryResult;
  });
}

function assertCustomerOrderDetails(pedidoId) {
  openCustomerOrders();
  withinOrderCard("#pedidos-list .pedido-card", pedidoId, "APROVADA", () => {
    clickButtonNow("VER DETALHES");
  });
  cy.waitForAppIdle();
  cy.get("#pedido-detalhe-title").should("contain.text", "APROVADA");
  cy.get("#pedido-itens-list .pedido-item", { timeout: 60000 }).should("have.length.greaterThan", 0);
  cy.get("#pedido-pagamento").should("not.be.empty");
}

function openAdminOrders() {
  cy.get("#nav-pedidos").click();
  cy.waitForAppIdle();
  cy.get("#pedidosList .pedido-card", { timeout: 90000 }).should("have.length.greaterThan", 0);
}

function sortAdminOrdersByNewest() {
  cy.get('.pedido-sort-button[data-field="dataCriacao"]').click();
  cy.waitForAppIdle();
}

function confirmAdminModal() {
  cy.get("#pedido-confirm-modal").should("not.have.class", "hidden");
  cy.get("#pedido-confirm-ok").click();
  cy.get("#pedido-confirm-modal", { timeout: 60000 }).should("have.class", "hidden");
  cy.waitForAppIdle();
}

function advanceApprovedOrderToDelivered(pedidoId) {
  openAdminOrders();
  sortAdminOrdersByNewest();

  cy.intercept("POST", "**/api/admin/pedidos/status").as("updateAdminOrderStatus");
  withinOrderCard("#pedidosList .pedido-card", pedidoId, "APROVADA", () => {
    clickButtonNow("ENTREGAR PRODUTO");
  });
  confirmAdminModal();
  cy.wait("@updateAdminOrderStatus", { timeout: 90000 }).then((interception) => {
    expectOkResponse(interception, "mover pedido para transporte");
  });
  cy.waitForAppIdle();

  withinOrderCard("#pedidosList .pedido-card", pedidoId, "EM TRANSPORTE", () => {
    clickButtonNow("CONFIRMAR PRODUTO ENTREGUE");
  });
  confirmAdminModal();
  cy.wait("@updateAdminOrderStatus", { timeout: 90000 }).then((interception) => {
    expectOkResponse(interception, "mover pedido para entregue");
  });
  cy.waitForAppIdle();

  withinOrderCard("#pedidosList .pedido-card", pedidoId, "ENTREGUE", () => {
    clickButtonNow("DETALHES");
  });
  cy.waitForAppIdle();
  cy.get("#pedido-detalhe-title").should("contain.text", "ENTREGUE");
  cy.get("#pedido-itens-list .pedido-item", { timeout: 60000 }).should("have.length.greaterThan", 0);
}

function openExchangeFormWithRetry(attempt = 0) {
  cy.get("#btn-solicitar-troca", { timeout: 60000 }).then(($button) => {
    expect($button.length, "botao SOLICITAR TROCA").to.be.greaterThan(0);
    $button[0].click();
  });
  cy.waitForAppIdle();
  cy.wait(500, { log: false });

  return cy.get("body").then(($body) => {
    const form = $body.find("#troca-form-panel");
    const formOpen = form.length > 0 && !form.hasClass("hidden");
    if (formOpen) {
      return;
    }

    if (attempt >= 3) {
      expect(formOpen, "formulario de troca aberto").to.equal(true);
      return;
    }

    const unauthenticated = $body.text().includes("Usuario nao autenticado");
    if (unauthenticated) {
      cy.log("Tela de trocas retornou usuario nao autenticado; recarregando antes de tentar novamente.");
      cy.reload();
      cy.waitForAppIdle();
    } else {
      cy.log("Formulario de troca ainda fechado; tentando abrir novamente.");
    }

    cy.wait(1000, { log: false });
    return openExchangeFormWithRetry(attempt + 1);
  });
}

function createExchangeRequest(pedidoId) {
  cy.visit("/view/pages/perfil.html#trocas");
  cy.waitForAppIdle();
  openExchangeFormWithRetry();
  cy.get("#troca-form-panel", { timeout: 60000 }).should("not.have.class", "hidden");
  cy.get("#troca-pedido", { timeout: 90000 }).should(($select) => {
    const options = Array.from($select[0].options).filter((option) => option.value && !option.disabled);
    expect(options, "pedidos elegiveis para troca").to.have.length.greaterThan(0);
  });
  cy.get("#troca-pedido").then(($select) => {
    const options = Array.from($select[0].options).filter((option) => option.value && !option.disabled);
    const createdOrderOption = options.find((option) => option.value === pedidoId);
    const option = createdOrderOption || options[0];

    if (!createdOrderOption) {
      cy.log(`Pedido ${pedidoId} nao apareceu no seletor de troca; usando o primeiro pedido elegivel.`);
    }

    cy.wrap($select).select(option.value);
  });
  cy.waitForAppIdle();

  const maxProducts = Math.max(1, envNumber("FULL_FLOW_RETURN_MAX_PRODUCTS", 2));
  cy.get("#troca-itens-list .troca-item-card", { timeout: 60000 }).then(($items) => {
    const indexesToKeep = Cypress._.sampleSize(
      Array.from({ length: $items.length }, (_, index) => index),
      Math.min(maxProducts, $items.length)
    );

    cy.get("#troca-itens-list .troca-item-card").each(($card, index) => {
      cy.wrap($card).within(() => {
        const shouldKeep = indexesToKeep.includes(index);
        cy.get(".troca-item-check").then(($checkbox) => {
          if (shouldKeep && !$checkbox.prop("checked")) {
            cy.wrap($checkbox).check({ force: true });
          } else if (!shouldKeep && $checkbox.prop("checked")) {
            cy.wrap($checkbox).uncheck({ force: true });
          }
        });

        if (shouldKeep) {
          cy.get(".troca-item-qtd").then(($input) => {
            const max = Number($input.attr("max") || 1);
            const mode = envText("FULL_FLOW_RETURN_QUANTITY_MODE", "random").toLowerCase();
            const quantity = mode === "max" ? max : randomInt(1, Math.max(1, max));
            cy.wrap($input).clear().type(String(quantity)).blur();
          });
        }
      });
    });
  });

  cy.get("#troca-motivo").clear().type(envText("FULL_FLOW_EXCHANGE_REASON", "Teste automatizado de devolucao"));
  cy.get("#troca-descricao")
    .clear()
    .type(envText("FULL_FLOW_EXCHANGE_DESCRIPTION", "Descricao generica criada pelo Cypress."));

  cy.intercept("POST", "**/api/usuario/trocas/solicitar").as("requestExchange");
  cy.get("#btn-save-troca").click();
  return cy.wait("@requestExchange", { timeout: 90000 }).then((interception) => {
    expectOkResponse(interception, "solicitar troca");
    expect(interception.response.body.descricaoId, "descricao de troca criada").to.be.a("string").and.not.be.empty;
    return interception.response.body.descricaoId;
  });
}

function openAdminExchange(descricaoId) {
  cy.get("#nav-trocas").click();
  cy.waitForAppIdle();
  withinExchangeCard("#trocasList .troca-card", descricaoId, "EM AGUARDO", () => {
    clickButtonNow("DETALHES");
  });
  cy.waitForAppIdle();
  cy.get("#troca-detalhe-section").should("not.have.class", "hidden");
}

function chooseExchangeClassification() {
  const values = envList("FULL_FLOW_EXCHANGE_CLASSIFICATIONS", [
    "Produto sem defeito constatado",
    "Produto com defeito intermitente",
    "Produto incompativel com sistema do cliente"
  ]);
  return Cypress._.sample(values);
}

function evaluateNextExchangeItem() {
  return cy.get("body").then(($body) => {
    const pending = $body.find('#troca-itens-list .troca-item-card button:contains("AVALIAR"):not(:disabled)');
    if (!pending.length) return;

    clickMatchingButtonNow('#troca-itens-list .troca-item-card button:not(:disabled)', "AVALIAR");
    cy.get("#troca-avaliacao-modal").should("not.have.class", "hidden");
    cy.get("#troca-avaliacao-classificacao").select(chooseExchangeClassification());
    cy.get("#troca-avaliacao-descricao")
      .clear()
      .type(envText("FULL_FLOW_ADMIN_TECH_DESCRIPTION", "Avaliacao tecnica generica criada pelo Cypress."));

    cy.get("body").then(($currentBody) => {
      const stockChoiceVisible = $currentBody.find("#troca-avaliacao-estoque:not(.hidden)").length > 0;
      if (stockChoiceVisible) {
        const value = Cypress._.sample(["sim", "nao"]);
        cy.get(`input[name="troca-retorna-estoque"][value="${value}"]`).check({ force: true });
      }
    });

    cy.intercept("POST", "**/api/admin/trocas/avaliar").as("evaluateExchangeItem");
    cy.get("#troca-avaliacao-confirm").click();

    cy.get("body").then(($currentBody) => {
      const confirmOpen = $currentBody.find("#pedido-confirm-modal:not(.hidden)").length > 0;
      if (confirmOpen) {
        cy.get("#pedido-confirm-ok").click();
      }
    });

    return cy.wait("@evaluateExchangeItem", { timeout: 90000 }).then((interception) => {
      expectOkResponse(interception, "avaliar item de troca");
      return cy.waitForAppIdle().then(() => evaluateNextExchangeItem());
    });
  });
}

function evaluateAndFinishExchange(descricaoId) {
  openAdminExchange(descricaoId);
  evaluateNextExchangeItem().then(() => {
    cy.get("#troca-finalizar", { timeout: 90000 }).should("not.be.disabled");
    cy.intercept("POST", "**/api/admin/trocas/finalizar").as("finishExchange");
    cy.get("#troca-finalizar").click();
    confirmAdminModal();
    cy.wait("@finishExchange", { timeout: 120000 }).then((interception) => {
      expectOkResponse(interception, "finalizar troca");
      expect(interception.response.body).to.have.property("ok", true);
    });
    cy.waitForAppIdle();
    cy.get("#troca-detalhe-title").should("contain.text", "CONCLUIDA");
  });
}

function assertGeneratedCouponInCustomerOrder(pedidoId) {
  openCustomerOrders();
  withinOrderCardMatching(
    "#pedidos-list .pedido-card",
    pedidoId,
    /TROCADO|ITENS TROCADOS|POSSUI TROCAS/,
    () => {
      clickButtonNow("VER DETALHES");
    }
  );
  cy.waitForAppIdle();
  cy.get("#pedido-detalhe-title").should(($title) => {
    expect($title.text()).to.match(/TROCADO|ITENS TROCADOS|POSSUI TROCAS/);
  });
  cy.get("#pedido-itens-list", { timeout: 60000 }).should(($items) => {
    const text = $items.text();
    expect(text).to.include("Cupom de troca gerado:");
    expect(text).not.to.include("Ainda nao gerado");
  });
}

describe("Fluxo completo de pedido, entrega e troca", () => {
  it("cliente compra, admin entrega, cliente solicita troca, admin avalia e cliente confere o cupom", () => {
    cy.loginCliente();

    checkoutAttemptFromCurrentHome()
      .then((result) => retryRejectedOrderIfNeeded(result))
      .then((approvedResult) => {
        expect(approvedResult.status, "pedido aprovado para seguir o fluxo").to.equal("APROVADA");
        cy.wrap(approvedResult.pedidoId, { log: false }).as("approvedPedidoId");
      });

    cy.get("@approvedPedidoId").then((pedidoId) => {
      assertCustomerOrderDetails(pedidoId);
      cy.loginAdmin();
      advanceApprovedOrderToDelivered(pedidoId);
      cy.loginCliente();
      createExchangeRequest(pedidoId).then((descricaoId) => {
        cy.wrap(descricaoId, { log: false }).as("descricaoTrocaId");
      });
    });

    cy.get("@descricaoTrocaId").then((descricaoId) => {
      cy.loginAdmin();
      evaluateAndFinishExchange(descricaoId);
      cy.loginCliente();
      cy.get("@approvedPedidoId").then((pedidoId) => {
        assertGeneratedCouponInCustomerOrder(pedidoId);
      });
    });
  });
});

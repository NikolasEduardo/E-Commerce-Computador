function expectOkResponse(interception, label) {
  expect(interception.response, `${label} response`).to.exist;
  expect(interception.response.statusCode, `${label} status`).to.be.within(200, 299);
}

function randomInt(min, max) {
  return Cypress._.random(min, max);
}

function getMaxRandomProducts() {
  const value = Number(Cypress.env("MAX_RANDOM_PRODUCTS") || 3);
  return Number.isFinite(value) && value > 0 ? value : 3;
}

function getMaxExtraCards() {
  const value = Number(Cypress.env("MAX_EXTRA_CARDS") || 3);
  return Number.isFinite(value) && value >= 0 ? value : 3;
}

function addRandomProductsFromHome() {
  cy.intercept("POST", "**/api/carrinho/adicionar").as("addToCart");

  cy.get("#productsList .product-card", { timeout: 60000 })
    .filter((_, element) => Boolean(element.querySelector(".product-actions button")))
    .should("have.length.greaterThan", 0)
    .then(($cards) => {
      const maxProducts = Math.min($cards.length, getMaxRandomProducts());
      const amount = randomInt(1, maxProducts);
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

        cy.wait("@addToCart", { timeout: 60000 }).then((interception) => {
          expectOkResponse(interception, "adicionar ao carrinho");
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

function maybeChoosePromoCoupon() {
  cy.get("#cupom-promo").then(($select) => {
    const options = Array.from($select[0].options).filter((option) => option.value);
    if (!options.length || !Cypress._.sample([true, false])) {
      return;
    }

    const chosen = Cypress._.sample(options);
    cy.wrap($select).select(chosen.value);
    cy.waitForAppIdle();
  });
}

function maybeChooseExchangeCoupons() {
  cy.get("body").then(($body) => {
    const checkboxes = Array.from($body.find("#cupom-troca-list input[type='checkbox']"));
    if (!checkboxes.length) {
      return;
    }

    const amount = randomInt(0, checkboxes.length);
    const sampledIndexes = Cypress._.sampleSize(
      Array.from({ length: checkboxes.length }, (_, index) => index),
      amount
    );

    cy.wrap(sampledIndexes).each((index) => {
      cy.get("#cupom-troca-list input[type='checkbox']").eq(index).then(($checkbox) => {
        if ($checkbox.prop("disabled") || $checkbox.prop("checked")) {
          return;
        }

        cy.wrap($checkbox).check({ force: true });
        cy.waitForAppIdle();
      });
    });
  });
}

function chooseCardsRandomly() {
  cy.get("#cartao-principal").then(($select) => {
    expect($select.prop("disabled"), "cartao principal habilitado").to.equal(false);

    const options = Array.from($select[0].options).filter((option) => option.value);
    expect(options, "cartoes cadastrados").to.have.length.greaterThan(0);

    const principal = Cypress._.sample(options);
    cy.wrap($select).select(principal.value);
  });

  cy.waitForAppIdle();

  cy.get("#cartao-principal option[value!='']").then(($options) => {
    const availableExtras = Math.max(0, $options.length - 1);
    const maxExtras = Math.min(availableExtras, getMaxExtraCards());
    const amount = maxExtras > 0 ? randomInt(0, maxExtras) : 0;

    Cypress._.times(amount, () => {
      cy.get("#btn-cartao-extra-add").click();
      cy.waitForAppIdle();
    });
  });

  cy.get("body").then(($body) => {
    const rows = $body.find("#cartoes-extras-list .card-extra-row");
    if (!rows.length) {
      return;
    }

    cy.get("#cartoes-extras-list .card-extra-row").each(($row) => {
      cy.wrap($row).within(() => {
        cy.get("select").then(($select) => {
          const options = Array.from($select[0].options).filter((option) => option.value);
          if (options.length) {
            cy.wrap($select).select(Cypress._.sample(options).value);
          }
        });

        const extraValue = randomInt(10, 30).toFixed(2);
        cy.get("input").clear().type(extraValue).blur();
      });
      cy.waitForAppIdle();
    });
  });
}

describe("Fluxo de compra aleatoria", () => {
  it("adiciona produtos aleatorios ao carrinho e conclui a compra", () => {
    cy.loginCliente();

    addRandomProductsFromHome();

    cy.get("#btn-carrinho").click();
    cy.location("pathname", { timeout: 60000 }).should("include", "/view/pages/carrinho.html");
    cy.waitForAppIdle();
    assertCartHasPositiveItems();

    cy.get("#btn-finalizar").click();
    cy.location("pathname", { timeout: 60000 }).should("include", "/view/pages/finalizar.html");
    cy.waitForAppIdle();

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

    cy.get("#checkout-items-list .checkout-item", { timeout: 60000 })
      .should("have.length.greaterThan", 0)
      .and("not.contain", "Nenhum produto");

    cy.selectRandomOption("#endereco-select");
    cy.waitForAppIdle();
    maybeChoosePromoCoupon();
    maybeChooseExchangeCoupons();
    chooseCardsRandomly();
    cy.waitForAppIdle();

    cy.intercept("POST", "**/api/checkout/finalizar").as("finalizarCompra");
    cy.get("#btn-comprar").click();

    cy.wait("@finalizarCompra", { timeout: 90000 }).then((interception) => {
      expectOkResponse(interception, "finalizar compra");
      expect(interception.response.body).to.have.property("ok", true);
      expect(interception.response.body.status, "status do pedido").to.be.oneOf([
        "APROVADA",
        "REPROVADA"
      ]);
    });

    cy.location("pathname", { timeout: 60000 }).should("include", "/view/pages/perfil.html");
    cy.location("hash").should("eq", "#pedidos");
    cy.waitForAppIdle();
    cy.get("#pedidos-list .pedido-card", { timeout: 60000 })
      .first()
      .should("contain.text", "Total:")
      .and("contain.text", "Quantidade de itens:");
  });
});

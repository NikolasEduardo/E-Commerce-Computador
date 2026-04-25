function requireEnv(name) {
  const value = Cypress.env(name);
  expect(value, `Cypress.env("${name}")`).to.be.a("string").and.not.be.empty;
  return value;
}

Cypress.Commands.add("waitForAppIdle", () => {
  cy.get("body", { timeout: 90000 }).should("not.have.class", "global-loading-active");
  cy.get("#global-loading-overlay", { timeout: 90000 }).should("not.have.class", "is-visible");
  cy.wait(150, { log: false });
});

Cypress.Commands.add("closeCartPopupIfOpen", () => {
  cy.get("body").then(($body) => {
    const popup = $body.find("#cart-popup:not(.hidden)");
    if (!popup.length) {
      return;
    }

    cy.wrap(popup).within(() => {
      cy.contains("button", /fechar/i).click({ force: true });
    });
  });
});

Cypress.Commands.add("loginCliente", () => {
  const email = requireEnv("USER_EMAIL");
  const password = requireEnv("USER_PASSWORD");

  cy.visit("/view/index.html");
  cy.waitForAppIdle();
  cy.get("#email").clear().type(email, { log: false });
  cy.get("#senha").clear().type(password, { log: false });
  cy.get("#login-button").click();
  cy.location("pathname", { timeout: 60000 }).should("include", "/view/pages/home.html");
  cy.waitForAppIdle();
});

Cypress.Commands.add("selectRandomOption", (selector, options = {}) => {
  const includeEmpty = Boolean(options.includeEmpty);

  cy.get(selector).then(($select) => {
    const optionElements = Array.from($select[0].options).filter((option) => {
      if (option.disabled) {
        return false;
      }
      if (!includeEmpty && !option.value) {
        return false;
      }
      return true;
    });

    expect(optionElements, `opcoes disponiveis em ${selector}`).to.have.length.greaterThan(0);
    const chosen = Cypress._.sample(optionElements);
    cy.wrap($select).select(chosen.value);
  });
});

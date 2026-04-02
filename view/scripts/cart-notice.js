import {
  carregarStatusCarrinho,
  estenderCarrinhoTempo,
  cancelarCarrinhoCompra
} from "../../controller/CarrinhoController.js";

const DEFAULT_WARNING_MINUTES = 5;
const DEFAULT_EXTEND_MINUTES = 10;

let warningTimer = null;
let expireTimer = null;
let lastExpiration = null;
let dismissed = false;
let warningMinutes = DEFAULT_WARNING_MINUTES;
let extendMinutes = DEFAULT_EXTEND_MINUTES;

function emitCartUpdated() {
  window.dispatchEvent(new CustomEvent("cart-updated"));
}

function clearTimers() {
  if (warningTimer) clearTimeout(warningTimer);
  if (expireTimer) clearTimeout(expireTimer);
  warningTimer = null;
  expireTimer = null;
}

function ensurePopup() {
  let overlay = document.getElementById("cart-popup");
  if (overlay) {
    return overlay;
  }

  overlay = document.createElement("div");
  overlay.id = "cart-popup";
  overlay.className = "cart-popup hidden";
  overlay.innerHTML = `
    <div class="cart-popup-content">
      <h3 id="cart-popup-title"></h3>
      <p id="cart-popup-message"></p>
      <div class="cart-popup-actions" id="cart-popup-actions"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

export function showCartPopup({ title, message, actions }) {
  const overlay = ensurePopup();
  const titleEl = document.getElementById("cart-popup-title");
  const messageEl = document.getElementById("cart-popup-message");
  const actionsEl = document.getElementById("cart-popup-actions");

  titleEl.textContent = title || "Aviso";
  messageEl.textContent = message || "";
  actionsEl.innerHTML = "";

  (actions || []).forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    btn.addEventListener("click", action.onClick);
    actionsEl.appendChild(btn);
  });

  overlay.classList.remove("hidden");
}

export function hideCartPopup() {
  const overlay = document.getElementById("cart-popup");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

function scheduleWarning(expiration) {
  clearTimers();
  if (!expiration) {
    return;
  }

  const expTime = new Date(expiration).getTime();
  if (!expTime) {
    return;
  }

  const warningMs = warningMinutes * 60 * 1000;
  const msUntilWarning = expTime - warningMs - Date.now();
  if (msUntilWarning <= 0 && !dismissed) {
    showExpiracaoPopup(expiration);
  } else if (msUntilWarning > 0) {
    warningTimer = setTimeout(() => {
      if (!dismissed) {
        showExpiracaoPopup(expiration);
      }
    }, msUntilWarning);
  }

  expireTimer = setTimeout(() => {
    cancelarCarrinhoCompra()
      .catch(() => {})
      .finally(() => {
        dismissed = false;
        emitCartUpdated();
        refreshCartNotice();
      });
  }, Math.max(expTime - Date.now(), 0));
}

function showExpiracaoPopup(expiration) {
  showCartPopup({
    title: "Carrinho perto de expirar",
    message: "Seu carrinho esta prestes a expirar. O que deseja fazer?",
    actions: [
      {
        label: `Esperar +${extendMinutes}min`,
        onClick: async () => {
          hideCartPopup();
          dismissed = false;
          try {
            await estenderCarrinhoTempo();
          } finally {
            emitCartUpdated();
            refreshCartNotice();
          }
        }
      },
      {
        label: "Cancelar compra",
        onClick: async () => {
          hideCartPopup();
          dismissed = false;
          try {
            await cancelarCarrinhoCompra();
          } finally {
            emitCartUpdated();
            refreshCartNotice();
          }
        }
      },
      {
        label: "Fechar",
        onClick: () => {
          hideCartPopup();
          dismissed = true;
        }
      }
    ]
  });
}

export async function refreshCartNotice() {
  try {
    const status = await carregarStatusCarrinho();
    const expiration = status?.dataExpiracaoCarrinho || null;
    warningMinutes = Number(status?.warningMinutes || DEFAULT_WARNING_MINUTES);
    extendMinutes = Number(status?.extendMinutes || DEFAULT_EXTEND_MINUTES);
    if (expiration !== lastExpiration) {
      dismissed = false;
    }
    lastExpiration = expiration;
    scheduleWarning(expiration);
  } catch (error) {
    clearTimers();
  }
}

export function initCartNotice() {
  refreshCartNotice();
}

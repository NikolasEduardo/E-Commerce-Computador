const TOAST_CONTAINER_ID = "site-toast-container";
const PENDING_TOASTS_KEY = "ecommerce-site-toasts";
const DEFAULT_DURATION = 4200;

const VARIANT_CONFIG = {
  success: {
    title: "Sucesso",
    icon: "bi-check-circle-fill"
  },
  danger: {
    title: "Erro",
    icon: "bi-exclamation-octagon-fill"
  },
  warning: {
    title: "Aviso",
    icon: "bi-exclamation-triangle-fill"
  },
  info: {
    title: "Informacao",
    icon: "bi-info-circle-fill"
  }
};

let stylesheetLoaded = false;

function ensureStylesheet() {
  if (stylesheetLoaded || document.querySelector('link[data-site-toast="true"]')) {
    stylesheetLoaded = true;
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("../../styles/toast.css", import.meta.url).href;
  link.dataset.siteToast = "true";
  document.head.appendChild(link);
  stylesheetLoaded = true;
}

function ensureContainer() {
  ensureStylesheet();
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (container) {
    return container;
  }

  container = document.createElement("div");
  container.id = TOAST_CONTAINER_ID;
  container.className = "site-toast-container";
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-atomic", "false");
  document.body.appendChild(container);
  return container;
}

export function inferToastVariant(message = "") {
  const normalized = `${message}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (/(sucesso|concluid|salv|registrad|readicionad|enviad|reenviad|inserid|adicionad|removid|atualizad|cadastrad|finalizad)/.test(normalized)) {
    return "success";
  }

  if (/(preencha|informe|selecione|aguarde|limite|invalido|nao ha|nao e possivel|nao permitido|favor|cupom|prest(es|e) a expirar)/.test(normalized)) {
    return "warning";
  }

  if (/(erro|falha|nao foi|nao autorizado|negado|bloqueado|nao autenticado|desativad|indisponivel)/.test(normalized)) {
    return "danger";
  }

  return "info";
}

export function showToast(options = {}) {
  const message = `${options.message || ""}`.trim();
  if (!message) {
    return null;
  }

  const variant = options.variant || inferToastVariant(message);
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.info;
  const duration = Number(options.duration || DEFAULT_DURATION);
  const container = ensureContainer();

  const toast = document.createElement("article");
  toast.className = `site-toast site-toast-${variant}`;
  toast.setAttribute("role", variant === "danger" ? "alert" : "status");

  const icon = document.createElement("i");
  icon.className = `bi ${options.icon || config.icon}`;
  icon.setAttribute("aria-hidden", "true");

  const body = document.createElement("div");
  body.className = "site-toast-body";

  const title = document.createElement("strong");
  title.textContent = options.title || config.title;

  const text = document.createElement("span");
  text.textContent = message;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "site-toast-close";
  close.setAttribute("aria-label", "Fechar aviso");
  close.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';

  body.append(title, text);
  toast.append(icon, body, close);
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));

  let timeoutId = null;
  const dismiss = () => {
    window.clearTimeout(timeoutId);
    toast.classList.remove("is-visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    window.setTimeout(() => toast.remove(), 260);
  };

  close.addEventListener("click", dismiss);
  timeoutId = window.setTimeout(dismiss, Math.max(duration, 1200));
  return toast;
}

export function toastSuccess(message, options = {}) {
  return showToast({ ...options, message, variant: "success" });
}

export function toastError(message, options = {}) {
  return showToast({ ...options, message, variant: "danger" });
}

export function toastWarning(message, options = {}) {
  return showToast({ ...options, message, variant: "warning" });
}

export function queueToast(options = {}) {
  const message = `${options.message || ""}`.trim();
  if (!message) {
    return;
  }

  try {
    const current = JSON.parse(sessionStorage.getItem(PENDING_TOASTS_KEY) || "[]");
    current.push({
      ...options,
      message,
      queuedAt: Date.now()
    });
    sessionStorage.setItem(PENDING_TOASTS_KEY, JSON.stringify(current.slice(-5)));
  } catch {
    // Toasts are best-effort UI feedback; storage failures should not block flows.
  }
}

export function flushQueuedToasts() {
  let queued = [];
  try {
    queued = JSON.parse(sessionStorage.getItem(PENDING_TOASTS_KEY) || "[]");
    sessionStorage.removeItem(PENDING_TOASTS_KEY);
  } catch {
    queued = [];
  }

  queued
    .filter((toast) => Date.now() - Number(toast.queuedAt || 0) < 30000)
    .forEach((toast, index) => {
      window.setTimeout(() => showToast(toast), index * 140);
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", flushQueuedToasts, { once: true });
} else {
  flushQueuedToasts();
}

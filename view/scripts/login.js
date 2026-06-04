import {
  autenticarEVerificarStatus,
  solicitarRedefinicaoSenha
} from "../../controller/AuthController.js";
import {
  SYSTEM_MESSAGES,
  formatSystemMessage,
  getErrorMessage
} from "../../model/SystemMessages.js";
import { showToast } from "./toast.js";

const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const loginButton = document.getElementById("login-button");
const messageBox = document.getElementById("login-message");
const forgotPasswordButton = document.getElementById("forgot-password-button");
const forgotPasswordModal = document.getElementById("forgot-password-modal");
const forgotPasswordClose = document.getElementById("forgot-password-close");
const forgotPasswordCancel = document.getElementById("forgot-password-cancel");
const forgotPasswordSubmit = document.getElementById("forgot-password-submit");
const forgotPasswordEmail = document.getElementById("forgot-password-email");
const forgotPasswordRequest = document.getElementById("forgot-password-request");
const forgotPasswordConfirm = document.getElementById("forgot-password-confirm");
const forgotPasswordMessage = document.getElementById("forgot-password-message");
const forgotPasswordConfirmMessage = document.getElementById("forgot-password-confirm-message");
const forgotPasswordConfirmAlert = document.getElementById("forgot-password-confirm-alert");
const forgotPasswordYes = document.getElementById("forgot-password-yes");
const forgotPasswordNo = document.getElementById("forgot-password-no");

const RESET_CACHE_PREFIX = "ecommerce-password-reset:";
const MAX_RESET_ATTEMPTS = 10;
let currentResetEmail = "";
let cooldownTimer = null;

function setButtonContent(button, label) {
  const icon = button.dataset.icon;
  button.replaceChildren();
  if (icon) {
    const iconEl = document.createElement("i");
    iconEl.className = `bi ${icon}`;
    iconEl.setAttribute("aria-hidden", "true");
    button.append(iconEl);
  }
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  button.append(labelEl);
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  setButtonContent(loginButton, isLoading ? SYSTEM_MESSAGES.general.accessing : "ACESSAR");
}

function showMessage(text) {
  messageBox.textContent = "";
  messageBox.classList.remove("is-visible");
  if (text) {
    showToast({ message: text });
  }
}

function normalizeEmail(email) {
  return `${email || ""}`.trim().toLowerCase();
}

function getResetCacheKey(email) {
  return `${RESET_CACHE_PREFIX}${encodeURIComponent(normalizeEmail(email))}`;
}

function getResetCache(email) {
  try {
    const raw = localStorage.getItem(getResetCacheKey(email));
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      attempts: Number(parsed.attempts || 0),
      lastSentAt: Number(parsed.lastSentAt || 0)
    };
  } catch {
    return { attempts: 0, lastSentAt: 0 };
  }
}

function setResetCache(email, data) {
  localStorage.setItem(
    getResetCacheKey(email),
    JSON.stringify({
      attempts: Number(data?.attempts || 0),
      lastSentAt: Number(data?.lastSentAt || 0)
    })
  );
}

function getCooldownMs(attempts) {
  if (attempts <= 0) return 0;
  if (attempts === 1) return 30 * 1000;
  if (attempts <= 3) return 60 * 1000;
  return 3 * 60 * 1000;
}

function getRemainingCooldownMs(email) {
  const cache = getResetCache(email);
  if (cache.attempts <= 0) {
    return 0;
  }

  const elapsed = Date.now() - cache.lastSentAt;
  return Math.max(0, getCooldownMs(cache.attempts) - elapsed);
}

function formatWait(ms) {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

function setForgotMessage(target, text) {
  target.textContent = "";
  target.classList.remove("is-visible");
  if (text) {
    showToast({ message: text });
  }
}

function clearCooldownTimer() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
}

function updateResendButton() {
  clearCooldownTimer();
  if (!currentResetEmail) {
    return;
  }

  const cache = getResetCache(currentResetEmail);
  if (cache.attempts >= MAX_RESET_ATTEMPTS) {
    forgotPasswordNo.disabled = true;
    setButtonContent(forgotPasswordNo, "LIMITE ATINGIDO");
    setForgotMessage(forgotPasswordConfirmAlert, SYSTEM_MESSAGES.auth.password.resetLimitReached);
    return;
  }

  const remaining = getRemainingCooldownMs(currentResetEmail);
  if (remaining > 0) {
    forgotPasswordNo.disabled = true;
    setButtonContent(forgotPasswordNo, `REENVIAR EM ${formatWait(remaining)}`);
    cooldownTimer = setInterval(updateResendButton, 1000);
    return;
  }

  forgotPasswordNo.disabled = false;
  setButtonContent(forgotPasswordNo, "NAO, REENVIAR");
}

function showForgotRequestStage(message = "") {
  forgotPasswordRequest.classList.remove("hidden");
  forgotPasswordConfirm.classList.add("hidden");
  setForgotMessage(forgotPasswordMessage, message);
  clearCooldownTimer();
}

function showForgotConfirmStage(email, message) {
  currentResetEmail = normalizeEmail(email);
  forgotPasswordRequest.classList.add("hidden");
  forgotPasswordConfirm.classList.remove("hidden");
  forgotPasswordConfirmMessage.textContent = `${SYSTEM_MESSAGES.auth.password.resetQuestion} (${currentResetEmail})`;
  setForgotMessage(forgotPasswordConfirmAlert, message);
  updateResendButton();
}

function openForgotPasswordModal() {
  currentResetEmail = "";
  forgotPasswordEmail.value = emailInput.value.trim();
  forgotPasswordSubmit.disabled = false;
  setButtonContent(forgotPasswordSubmit, "SOLICITAR ALTERACAO");
  showForgotRequestStage("");
  forgotPasswordModal.classList.remove("hidden");
  forgotPasswordEmail.focus();
}

function closeForgotPasswordModal() {
  clearCooldownTimer();
  forgotPasswordModal.classList.add("hidden");
  forgotPasswordSubmit.disabled = false;
  setButtonContent(forgotPasswordSubmit, "SOLICITAR ALTERACAO");
  forgotPasswordNo.disabled = false;
  setButtonContent(forgotPasswordNo, "NAO, REENVIAR");
}

async function sendResetEmail(email, successMessage) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    setForgotMessage(forgotPasswordMessage, SYSTEM_MESSAGES.auth.password.emailRequired);
    return false;
  }

  const cache = getResetCache(normalizedEmail);
  if (cache.attempts >= MAX_RESET_ATTEMPTS) {
    const message = SYSTEM_MESSAGES.auth.password.resetLimitReached;
    setForgotMessage(forgotPasswordMessage, message);
    setForgotMessage(forgotPasswordConfirmAlert, message);
    return false;
  }

  const remaining = getRemainingCooldownMs(normalizedEmail);
  if (remaining > 0) {
    const message = formatSystemMessage(SYSTEM_MESSAGES.auth.password.resetCooldown, {
      time: formatWait(remaining)
    });
    setForgotMessage(forgotPasswordMessage, message);
    setForgotMessage(forgotPasswordConfirmAlert, message);
    updateResendButton();
    return false;
  }

  await solicitarRedefinicaoSenha(normalizedEmail);
  setResetCache(normalizedEmail, {
    attempts: cache.attempts + 1,
    lastSentAt: Date.now()
  });
  showForgotConfirmStage(normalizedEmail, successMessage);
  return true;
}

async function handleLogin() {
  showMessage("");

  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email || !senha) {
    showMessage(SYSTEM_MESSAGES.auth.errors.missingCredentials);
    return;
  }

  setLoading(true);
  try {
    const status = await autenticarEVerificarStatus(email, senha);

    if (status === "ATIVO") {
      window.location.href = "pages/home.html";
      return;
    }

    if (status === "ADMIN") {
      window.location.href = "admpages/homeadm.html";
      return;
    }

    if (status === "INATIVO") {
      showMessage(SYSTEM_MESSAGES.auth.errors.inactiveUser);
      return;
    }

    showMessage(formatSystemMessage(SYSTEM_MESSAGES.auth.errors.unknownStatus, { status }));
  } catch (error) {
    showMessage(getErrorMessage(error, SYSTEM_MESSAGES.auth.errors.loginFailed));
  } finally {
    setLoading(false);
  }
}

loginButton.addEventListener("click", handleLogin);
senhaInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleLogin();
  }
});

forgotPasswordButton.addEventListener("click", openForgotPasswordModal);
forgotPasswordClose.addEventListener("click", closeForgotPasswordModal);
forgotPasswordCancel.addEventListener("click", closeForgotPasswordModal);

forgotPasswordSubmit.addEventListener("click", async () => {
  forgotPasswordSubmit.disabled = true;
  setButtonContent(forgotPasswordSubmit, SYSTEM_MESSAGES.general.loading);
  setForgotMessage(forgotPasswordMessage, "");

  try {
    await sendResetEmail(forgotPasswordEmail.value, SYSTEM_MESSAGES.auth.password.resetSent);
  } catch (error) {
    setForgotMessage(forgotPasswordMessage, getErrorMessage(error, SYSTEM_MESSAGES.auth.password.resetFailed));
  } finally {
    forgotPasswordSubmit.disabled = false;
    setButtonContent(forgotPasswordSubmit, "SOLICITAR ALTERACAO");
  }
});

forgotPasswordEmail.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    forgotPasswordSubmit.click();
  }
});

forgotPasswordNo.addEventListener("click", async () => {
  if (!currentResetEmail) {
    return;
  }

  forgotPasswordNo.disabled = true;
  setButtonContent(forgotPasswordNo, SYSTEM_MESSAGES.general.loading);
  setForgotMessage(forgotPasswordConfirmAlert, "");

  try {
    await sendResetEmail(currentResetEmail, SYSTEM_MESSAGES.auth.password.resetResent);
  } catch (error) {
    setForgotMessage(
      forgotPasswordConfirmAlert,
      getErrorMessage(error, SYSTEM_MESSAGES.auth.password.resetFailed)
    );
  } finally {
    updateResendButton();
  }
});

forgotPasswordYes.addEventListener("click", () => {
  window.location.href = "index.html";
});

forgotPasswordModal.addEventListener("click", (event) => {
  if (event.target === forgotPasswordModal) {
    closeForgotPasswordModal();
  }
});

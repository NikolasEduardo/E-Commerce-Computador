import { autenticarEVerificarStatus } from "../../controller/AuthController.js";
import {
  SYSTEM_MESSAGES,
  formatSystemMessage,
  getErrorMessage
} from "../../model/SystemMessages.js";

const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const loginButton = document.getElementById("login-button");
const messageBox = document.getElementById("login-message");

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading ? SYSTEM_MESSAGES.general.accessing : "ACESSAR";
}

function showMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.toggle("is-visible", Boolean(text));
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

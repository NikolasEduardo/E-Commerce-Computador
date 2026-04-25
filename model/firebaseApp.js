import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  initGlobalLoadingOverlay,
  loadingOverlayConfig
} from "./loadingOverlay.js";

const backendHost =
  typeof window !== "undefined" && window.location && window.location.hostname
    ? window.location.hostname
    : "localhost";
const backendProtocol =
  typeof window !== "undefined" && window.location && window.location.protocol
    ? window.location.protocol
    : "http:";
const backendPort =
  typeof window !== "undefined" && window.location && window.location.port
    ? window.location.port
    : "";
const backendOrigin =
  typeof window !== "undefined" && window.location && window.location.origin
    ? window.location.origin
    : `${backendProtocol}//${backendHost}:3000`;

const backendConfig = {
  baseUrl:
    !backendPort || backendPort === "3000"
      ? backendOrigin
      : `${backendProtocol}//${backendHost}:3000`
};

initGlobalLoadingOverlay();

async function loadPublicConfig() {
  const response = await fetch(`${backendConfig.baseUrl}/api/public-config`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || "Nao foi possivel carregar a configuracao publica.");
  }

  const firebase = payload?.firebase || {};
  if (!firebase.apiKey || !firebase.projectId) {
    throw new Error(
      "Configuracao publica do Firebase incompleta. Verifique o arquivo server/.env."
    );
  }

  return {
    firebase,
    dataconnect: payload?.dataconnect || {
      projectId: firebase.projectId,
      location: "",
      serviceId: "",
      emulator: {
        enabled: false,
        host: "localhost:50001"
      }
    }
  };
}

const { firebase: firebaseConfig, dataconnect: dataconnectConfig } = await loadPublicConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  app,
  auth,
  firebaseConfig,
  dataconnectConfig,
  backendConfig,
  loadingOverlayConfig
};

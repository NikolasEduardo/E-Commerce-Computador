const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const workspaceRoot = path.resolve(__dirname, "..", "..");
const serverDir = path.join(workspaceRoot, "server");

loadEnvFile(path.join(serverDir, ".env"));

const projectId = process.env.FIREBASE_PROJECT_ID || "";
const location = process.env.DATACONNECT_LOCATION || "";
const serviceId = process.env.DATACONNECT_SERVICE_ID || "";
const serviceAccountPath =
  normalizeEnvPath(process.env.GOOGLE_APPLICATION_CREDENTIALS) ||
  path.join(serverDir, "serviceAccount.json");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function normalizeEnvPath(value) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function assertDataConnectEnv() {
  const missing = [];
  if (!projectId) missing.push("FIREBASE_PROJECT_ID");
  if (!location) missing.push("DATACONNECT_LOCATION");
  if (!serviceId) missing.push("DATACONNECT_SERVICE_ID");
  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    missing.push("GOOGLE_APPLICATION_CREDENTIALS ou server/serviceAccount.json");
  }

  if (missing.length) {
    throw new Error(`Configuracao do Data Connect incompleta: ${missing.join(", ")}.`);
  }
}

function readServiceAccount() {
  assertDataConnectEnv();
  const raw = fs.readFileSync(serviceAccountPath, "utf8");
  return JSON.parse(raw);
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken() {
  const sa = readServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(claimSet)
  )}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key, "base64");
  const jwt = `${unsigned}.${signature
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error_description || payload?.error || "Falha ao obter access token.";
    throw new Error(message);
  }

  return payload.access_token;
}

async function executeGraphql(accessToken, query, variables = {}) {
  assertDataConnectEnv();
  const endpoint = `https://firebasedataconnect.googleapis.com/v1beta/projects/${projectId}/locations/${location}/services/${serviceId}:executeGraphql`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ query, variables })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || "Erro ao consultar Data Connect.";
    throw new Error(message);
  }

  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message || "Erro ao consultar Data Connect.");
  }

  return payload?.data || {};
}

module.exports = {
  workspaceRoot,
  getAccessToken,
  executeGraphql
};

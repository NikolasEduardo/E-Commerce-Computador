import { backendConfig } from "../firebaseApp.js";
import { SYSTEM_MESSAGES } from "../SystemMessages.js";

const baseUrl = backendConfig.baseUrl;

export async function obterCloudinaryConfig(idToken) {
  const response = await fetch(`${baseUrl}/api/cloudinary/config`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || SYSTEM_MESSAGES.admin.errors.cloudinaryLoadFailed;
    throw new Error(message);
  }
  return data;
}

export async function obterAssinaturaCloudinary(idToken, params) {
  const response = await fetch(`${baseUrl}/api/cloudinary/signature`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ params })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || SYSTEM_MESSAGES.admin.errors.cloudinarySignFailed;
    throw new Error(message);
  }
  return data;
}

export async function enviarImagemCloudinary(file, assinatura, params = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", assinatura.apiKey);
  formData.append("timestamp", assinatura.timestamp);
  formData.append("signature", assinatura.signature);

  if (assinatura.uploadPreset) {
    formData.append("upload_preset", assinatura.uploadPreset);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  const endpoint = `https://api.cloudinary.com/v1_1/${assinatura.cloudName}/image/upload`;
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.message || SYSTEM_MESSAGES.produto.errors.uploadFailed;
    throw new Error(message);
  }
  return data;
}

import { backendConfig } from "../firebaseApp.js";
import { getAuthenticatedIdToken } from "../../controller/AdminSessionController.js";

const baseUrl = backendConfig.baseUrl;

export async function adminRequest(path, options = {}) {
  const idToken = await getAuthenticatedIdToken();
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${idToken}`
  };

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  });
}

import { auth } from "../model/firebaseApp.js";
import { SYSTEM_MESSAGES } from "../model/SystemMessages.js";
import {
  obterCloudinaryConfig,
  obterAssinaturaCloudinary,
  enviarImagemCloudinary
} from "../model/admin/CloudinaryRepository.js";

export async function prepararUploadCloudinary(params = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error(SYSTEM_MESSAGES.general.unauthenticated);
  }
  const idToken = await user.getIdToken(true);
  const assinatura = await obterAssinaturaCloudinary(idToken, params);
  return assinatura;
}

export async function uploadImagemCloudinary(file, params = {}) {
  if (!file) {
    throw new Error(SYSTEM_MESSAGES.admin.errors.invalidFile);
  }
  const assinatura = await prepararUploadCloudinary(params);
  return enviarImagemCloudinary(file, assinatura, params);
}

export async function carregarConfigCloudinary() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error(SYSTEM_MESSAGES.general.unauthenticated);
  }
  const idToken = await user.getIdToken(true);
  return obterCloudinaryConfig(idToken);
}

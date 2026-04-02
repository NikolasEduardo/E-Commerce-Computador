import { auth } from "../model/firebaseApp.js";
import {
  obterCloudinaryConfig,
  obterAssinaturaCloudinary,
  enviarImagemCloudinary
} from "../model/admin/CloudinaryRepository.js";

export async function prepararUploadCloudinary(params = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  const assinatura = await obterAssinaturaCloudinary(idToken, params);
  return assinatura;
}

export async function uploadImagemCloudinary(file, params = {}) {
  if (!file) {
    throw new Error("Arquivo invalido.");
  }
  const assinatura = await prepararUploadCloudinary(params);
  return enviarImagemCloudinary(file, assinatura, params);
}

export async function carregarConfigCloudinary() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return obterCloudinaryConfig(idToken);
}

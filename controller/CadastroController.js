import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../model/firebaseApp.js";
import { beginGlobalLoading, endGlobalLoading } from "../model/loadingOverlay.js";
import { SYSTEM_MESSAGES, systemError } from "../model/SystemMessages.js";
import {
  carregarMetadata,
  validarUnicidade,
  registrarCadastro
} from "../model/cadastro/CadastroRepository.js";

export function obterMetadataCadastro() {
  return carregarMetadata();
}

export function validarEmailECpf(email, cpf) {
  return validarUnicidade(email, cpf);
}

export async function registrarNovoUsuario(payload) {
  beginGlobalLoading();
  try {
    const { email, senha } = payload;
    const credential = await createUserWithEmailAndPassword(auth, email, senha);
    const idToken = await credential.user.getIdToken(true);

    const cadastroPayload = {
      usuario: payload.usuario,
      telefone: payload.telefone,
      endereco: payload.endereco
    };

    try {
      await registrarCadastro(idToken, cadastroPayload);
      return true;
    } catch (error) {
      try {
        await credential.user.delete();
      } catch {
        // ignore rollback errors
      }
      throw error;
    }
  } catch (error) {
    throw systemError(error, SYSTEM_MESSAGES.cadastro.errors.registerFailed);
  } finally {
    endGlobalLoading();
  }
}

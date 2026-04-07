import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../model/firebaseApp.js";
import { obterCupons } from "../model/usuario/CupomRepository.js";

export function carregarCupons(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, "Usuario nao autenticado.");
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const cupons = await obterCupons(idToken);
      callback(cupons, null);
    } catch (error) {
      callback(null, error?.message || "Erro ao carregar cupons.");
    }
  });
}

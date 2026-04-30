import { CartaoCredito } from "../cliente/CartaoCredito.js";

export class PagamentoCartao {
    constructor(pagamento, cartaoCredito, valorParcela){
        this.pagamento = pagamento
        this.cartaoCredito = cartaoCredito
        this.valorParcela = Number(valorParcela || 0)
    }

    static fromApi(raw = {}, pagamento = null) {
        return new PagamentoCartao(
            pagamento,
            CartaoCredito.fromApi(raw?.cartaoCredito || {}),
            Number(raw?.valorParcela || 0)
        )
    }

    getCartao() {
        return this.cartaoCredito
    }

    getValorParcela() {
        return Number(this.valorParcela || 0)
    }
}

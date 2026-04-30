import { Cupom } from "../cupom/Cupom.js";
import { PagamentoCartao } from "./PagamentoCartao.js";
import { PagamentoCupomTroca } from "./PagamentoCupomTroca.js";

export class Pagamento {
    constructor(
        id,
        pedido,
        valorTotalPago,
        cupomPromocional,
        dataPagamento,
        pagamentoCartaos = [],
        pagamentoCupomTrocas = []
    ) {
        this.id = id
        this.pedido = pedido
        this.valorTotalPago = Number(valorTotalPago || 0)
        this.cupomPromocional = cupomPromocional
        this.dataPagamento = dataPagamento
        this.pagamentoCartaos_on_pagamento = pagamentoCartaos
        this.pagamentoCupomTrocas_on_pagamento = pagamentoCupomTrocas
    }

    static fromApi(raw = {}, pedido = null) {
        const pagamento = new Pagamento(
            raw?.id || "",
            pedido,
            Number(raw?.valorTotalPago || 0),
            raw?.cupomPromocional ? Cupom.fromApi(raw.cupomPromocional) : null,
            raw?.dataPagamento || "",
            [],
            []
        )

        pagamento.pagamentoCartaos_on_pagamento = Array.isArray(raw?.pagamentoCartaos_on_pagamento)
            ? raw.pagamentoCartaos_on_pagamento.map((item) => PagamentoCartao.fromApi(item, pagamento))
            : []
        pagamento.pagamentoCupomTrocas_on_pagamento = Array.isArray(raw?.pagamentoCupomTrocas_on_pagamento)
            ? raw.pagamentoCupomTrocas_on_pagamento.map((item) => PagamentoCupomTroca.fromApi(item, pagamento))
            : []

        return pagamento
    }

    getCupomPromocional() {
        return this.cupomPromocional || null
    }

    getCartoes() {
        return this.pagamentoCartaos_on_pagamento || []
    }

    getCuponsTroca() {
        return this.pagamentoCupomTrocas_on_pagamento || []
    }
}

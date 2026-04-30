import { Cupom } from "../cupom/Cupom.js";

export class PagamentoCupomTroca {
    constructor(pagamento, cupomTroca) {
        this.pagamento = pagamento
        this.cupomTroca = cupomTroca
    }

    static fromApi(raw = {}, pagamento = null) {
        return new PagamentoCupomTroca(
            pagamento,
            Cupom.fromApi(raw?.cupomTroca || {})
        )
    }

    getCupomTroca() {
        return this.cupomTroca
    }
}

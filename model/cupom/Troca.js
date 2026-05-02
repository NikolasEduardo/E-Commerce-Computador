import { Cupom } from "./Cupom.js";
import { Produto } from "../produto/Produto.js";
import { StatusItemPedido } from "../pedido/StatusItemPedido.js";

export class Troca {
    constructor(
        id,
        pedido,
        item,
        classificacaoTecnica,
        cupomGerado,
        descricao
    ) {
        this.id = id
        this.pedido = pedido
        this.item = item
        this.classificacaoTecnica = classificacaoTecnica
        this.cupomGerado = cupomGerado
        this.descricao = descricao
    }

    static fromApi(raw = {}) {
        if (raw instanceof Troca) {
            return raw
        }

        const item = raw.item
            ? {
                ...raw.item,
                produto: Produto.fromApi(raw.item.produto),
                status: raw.item.status instanceof StatusItemPedido
                    ? raw.item.status
                    : StatusItemPedido.fromApi(raw.item.status)
            }
            : null

        return new Troca(
            raw.id || "",
            raw.pedido || null,
            item,
            raw.classificacaoTecnica || "",
            raw.cupomGerado ? Cupom.fromApi(raw.cupomGerado) : null,
            raw.descricao || null
        )
    }

    getProduto() {
        return this.item?.produto || null
    }

    getProdutoNome() {
        return this.getProduto()?.nome || "Produto"
    }

    getProdutoModelo() {
        return this.getProduto()?.modelo || ""
    }

    getCupomCodigo() {
        return this.cupomGerado?.codigo || ""
    }

    getClassificacaoTecnica() {
        return this.classificacaoTecnica || "Aguardando avaliacao tecnica"
    }
}

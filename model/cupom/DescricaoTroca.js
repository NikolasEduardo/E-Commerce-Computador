import { Troca } from "./Troca.js";

export class DescricaoTroca {
    constructor(
        id,
        cliente,
        motivo,
        descricaoUsuario,
        data,
        status,
        trocas = []
    ) {
        this.id = id
        this.cliente = cliente
        this.motivo = motivo
        this.descricaoUsuario = descricaoUsuario
        this.data = data
        this.status = status
        this.trocas_on_descricao = trocas
        this.trocas = trocas
    }

    static fromApi(raw = {}) {
        if (raw instanceof DescricaoTroca) {
            return raw
        }

        const trocas = Array.isArray(raw.trocas_on_descricao)
            ? raw.trocas_on_descricao.map((troca) => Troca.fromApi(troca))
            : []

        return new DescricaoTroca(
            raw.id || "",
            raw.cliente || null,
            raw.motivo || "",
            raw.descricaoUsuario || "",
            raw.data || "",
            raw.status || "",
            trocas
        )
    }

    getTrocas() {
        return this.trocas_on_descricao || []
    }

    getQuantidadeItens() {
        return this.getTrocas().length
    }

    getStatusNome() {
        return this.status || ""
    }
}

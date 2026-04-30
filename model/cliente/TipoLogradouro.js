export class TipoLogradouro {
    constructor(id, nome, sigla){
        this.id = id
        this.nome = nome
        this.sigla = sigla
    }

    static fromApi(raw = {}) {
        if (raw instanceof TipoLogradouro) {
            return raw
        }
        if (typeof raw === "string") {
            return new TipoLogradouro("", raw, "")
        }
        return new TipoLogradouro(raw?.id || "", raw?.nome || "", raw?.sigla || "")
    }
}

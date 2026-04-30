export class TipoTelefone {
    constructor(id, nome){
        this.id = id
        this.nome = nome
    }

    static fromApi(raw = {}) {
        if (raw instanceof TipoTelefone) {
            return raw
        }
        if (typeof raw === "string") {
            return new TipoTelefone("", raw)
        }
        return new TipoTelefone(raw?.id || "", raw?.nome || "")
    }
}

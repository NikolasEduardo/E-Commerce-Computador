export class TipoResidencia {
    constructor(id, nome){
        this.id = id
        this.nome = nome
    }

    static fromApi(raw = {}) {
        if (raw instanceof TipoResidencia) {
            return raw
        }
        if (typeof raw === "string") {
            return new TipoResidencia("", raw)
        }
        return new TipoResidencia(raw?.id || "", raw?.nome || "")
    }
}

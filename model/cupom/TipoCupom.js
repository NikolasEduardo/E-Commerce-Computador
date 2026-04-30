export class TipoCupom {
    constructor(id, nome){
        this.id = id
        this.nome = nome
    }

    static fromApi(raw = {}) {
        if (raw instanceof TipoCupom) {
            return raw
        }
        if (typeof raw === "string") {
            return new TipoCupom("", raw)
        }
        return new TipoCupom(raw?.id || "", raw?.nome || "")
    }
}

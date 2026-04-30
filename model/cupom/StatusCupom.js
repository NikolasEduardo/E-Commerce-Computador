export class StatusCupom {
    constructor(id, nome){
        this.id = id
        this.nome = nome
    }

    static fromApi(raw = {}) {
        if (raw instanceof StatusCupom) {
            return raw
        }
        if (typeof raw === "string") {
            return new StatusCupom("", raw)
        }
        return new StatusCupom(raw?.id || "", raw?.nome || "")
    }
}

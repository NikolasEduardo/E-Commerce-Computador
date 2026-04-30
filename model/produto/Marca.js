export class Marca {
    constructor(id, nome){
        this.id = id
        this.nome = nome
    }

    static fromApi(raw = {}) {
        if (raw instanceof Marca) {
            return raw
        }
        if (typeof raw === "string") {
            return new Marca("", raw)
        }
        if (!raw) {
            return new Marca("", "")
        }
        return new Marca(raw.id || "", raw.nome || "")
    }
}

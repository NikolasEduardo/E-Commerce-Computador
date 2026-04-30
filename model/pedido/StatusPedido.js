export class StatusPedido {
    constructor(id, nome){
        this.id = id
        this.nome = nome
    }

    static fromApi(raw = {}) {
        if (!raw) {
            return new StatusPedido("", "")
        }
        return new StatusPedido(raw.id || "", raw.nome || "")
    }
}

export class StatusUsuario {
    constructor(id, nome){
        this.id = id
        this.nome = nome
    }

    static fromApi(raw = {}) {
        if (!raw) {
            return new StatusUsuario("", "")
        }
        return new StatusUsuario(raw.id || "", raw.nome || "")
    }
}

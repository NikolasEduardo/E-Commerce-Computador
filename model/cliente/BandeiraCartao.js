export class BandeiraCartao {
    constructor(nome, id){
        this.nome = nome
        this.id = id
    }

    static fromApi(raw = {}) {
        if (raw instanceof BandeiraCartao) {
            return raw
        }
        if (typeof raw === "string") {
            return new BandeiraCartao(raw, "")
        }
        return new BandeiraCartao(raw?.nome || "", raw?.id || "")
    }
}

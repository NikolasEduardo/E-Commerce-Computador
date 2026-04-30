export class GrupoPrecificacao {
    constructor(nome, id, margemLucro) {
        this.nome = nome
        this.id = id
        this.margemLucro = margemLucro
    }

    static fromApi(raw = {}) {
        if (!raw) {
            return new GrupoPrecificacao("", "", 0)
        }
        return new GrupoPrecificacao(
            raw.nome || "",
            raw.id || "",
            Number(raw.margemLucro || 0)
        )
    }
}

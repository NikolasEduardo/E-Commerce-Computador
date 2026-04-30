export class Categoria {
    constructor(nome, id, vendaMinimaInativacao) {
        this.nome = nome
        this.id = id
        this.vendaMinimaInativacao = vendaMinimaInativacao
    }

    static fromApi(raw = {}) {
        if (raw instanceof Categoria) {
            return raw
        }
        if (typeof raw === "string") {
            return new Categoria(raw, "", null)
        }
        if (!raw) {
            return new Categoria("", "", null)
        }
        return new Categoria(
            raw.nome || "",
            raw.id || "",
            raw.vendaMinimaInativacao ?? null
        )
    }
}

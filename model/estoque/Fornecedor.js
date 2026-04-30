export class Fornecedor {
    constructor(nome, id, emailContato, telefoneContato) {
        this.nome = nome
        this.id = id
        this.emailContato = emailContato
        this.telefoneContato = telefoneContato
    }

    static fromApi(raw = {}) {
        if (!raw) {
            return new Fornecedor("", "", "", "")
        }

        return new Fornecedor(
            raw.nome || "",
            raw.id || "",
            raw.emailContato || "",
            raw.telefoneContato || ""
        )
    }

    getNomeExibicao() {
        return this.nome || "SEM NOME"
    }
}

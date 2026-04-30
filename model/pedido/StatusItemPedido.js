function normalizeText(value) {
    return `${value || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim()
}

export class StatusItemPedido {
    constructor(id, nome) {
        this.id = id
        this.nome = nome
    }

    static fromApi(raw = {}) {
        if (raw instanceof StatusItemPedido) {
            return raw
        }
        if (typeof raw === "string") {
            return new StatusItemPedido("", raw)
        }
        if (!raw) {
            return new StatusItemPedido("", "")
        }
        return new StatusItemPedido(raw.id || "", raw.nome || raw.status || "")
    }

    getNome() {
        return this.nome || ""
    }

    is(nome) {
        return normalizeText(this.nome) === normalizeText(nome)
    }
}

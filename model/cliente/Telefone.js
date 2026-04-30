import { TipoTelefone } from "./TipoTelefone.js";

export class Telefone {
    constructor(usuario, id, tipo, ddd, numero, tipoId = ""){
        this.usuario = usuario
        this.id = id
        this.tipo = tipo
        this.ddd = ddd
        this.numero = numero
        this.tipoId = tipoId || tipo?.id || ""
    }

    static fromApi(raw = {}) {
        if (!raw) {
            return null
        }
        if (raw instanceof Telefone) {
            return raw
        }

        const tipo = raw.tipo instanceof TipoTelefone
            ? raw.tipo
            : TipoTelefone.fromApi(raw.tipo || { id: raw.tipoId || "" })

        return new Telefone(
            raw.usuario || null,
            raw.id || "",
            tipo,
            raw.ddd || "",
            raw.numero || "",
            raw.tipoId || tipo?.id || ""
        )
    }

    getTipoNome() {
        return this.tipo?.nome || ""
    }

    getNumeroCompleto() {
        if (!this.ddd && !this.numero) {
            return ""
        }
        return `${this.ddd || ""}${this.numero || ""}`
    }
}

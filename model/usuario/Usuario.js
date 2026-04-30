import { StatusUsuario } from "./StatusUsuario.js";

function normalizeText(value) {
    return `${value || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim()
}

function normalizeDigits(value) {
    return `${value || ""}`.replace(/\D/g, "")
}

export class Usuario {
    constructor(id, authId, codigoUser, nome, genero, dataNascimento, cpf, email, ranking, status){
        this.id = id
        this.authId = authId
        this.codigoUser = codigoUser
        this.nome = nome
        this.genero = genero
        this.dataNascimento = dataNascimento
        this.cpf = cpf
        this.email = email
        this.ranking = ranking
        this.status = status
    }

    static fromApi(raw = {}) {
        return new Usuario(
            raw.id || "",
            raw.authId || "",
            raw.codigoUser || "",
            raw.nome || "",
            raw.genero || "",
            raw.dataNascimento || "",
            raw.cpf || "",
            raw.email || "",
            Number(raw.ranking || 0),
            raw.status instanceof StatusUsuario ? raw.status : StatusUsuario.fromApi(raw.status)
        )
    }

    getStatusNome() {
        return this.status?.nome || ""
    }

    matchesSearch(search) {
        const searchText = `${search || ""}`.trim()
        if (!searchText) {
            return true
        }

        const searchNormalized = normalizeText(searchText)
        const searchDigits = normalizeDigits(searchText)
        const nome = normalizeText(this.nome)
        const email = normalizeText(this.email)
        const cpf = normalizeDigits(this.cpf)

        if (searchText.includes("@")) {
            return email.includes(searchNormalized)
        }

        if (/^\d/.test(searchText)) {
            return cpf.includes(searchDigits)
        }

        return nome.includes(searchNormalized) || email.includes(searchNormalized)
    }

    matchesStatus(statuses = []) {
        if (!statuses.length) {
            return true
        }
        return statuses.includes(normalizeText(this.getStatusNome()))
    }

    matchesGenero(generos = []) {
        if (!generos.length) {
            return true
        }
        return generos.includes(normalizeText(this.genero))
    }

    compareWith(other, field, sortOrder = "ASC") {
        const multiplier = sortOrder === "DESC" ? -1 : 1

        if (field === "ranking") {
            return (Number(this.ranking || 0) - Number(other?.ranking || 0)) * multiplier
        }

        if (field === "dataNascimento") {
            const thisTime = new Date(this.dataNascimento || 0).getTime()
            const otherTime = new Date(other?.dataNascimento || 0).getTime()
            const a = Number.isNaN(thisTime) ? 0 : thisTime
            const b = Number.isNaN(otherTime) ? 0 : otherTime
            return (a - b) * multiplier
        }

        const a = normalizeText(this.nome)
        const b = normalizeText(other?.nome)
        return a.localeCompare(b) * multiplier
    }

    getPrimeiroNome() {
        return `${this.nome || ""}`.trim().split(/\s+/)[0] || "SEM NOME"
    }
}

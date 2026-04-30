import { StatusCupom } from "./StatusCupom.js";
import { TipoCupom } from "./TipoCupom.js";

function normalizeText(value) {
    return `${value || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim()
}

export class Cupom {
    constructor(codigo, id, tipo, valor, validade, status) {
        this.codigo = codigo
        this.id = id
        this.tipo = tipo
        this.valor = Number(valor || 0)
        this.validade = validade
        this.status = status
    }

    static fromApi(raw = {}) {
        if (raw instanceof Cupom) {
            return raw
        }

        const tipo = raw.tipo instanceof TipoCupom ? raw.tipo : TipoCupom.fromApi(raw.tipo)
        const status = raw.status instanceof StatusCupom ? raw.status : StatusCupom.fromApi(raw.status)

        return new Cupom(
            raw.codigo || "",
            raw.id || "",
            tipo,
            Number(raw.valor || 0),
            raw.validade || "",
            status
        )
    }

    getTipoNome() {
        return this.tipo?.nome || ""
    }

    getStatusNome() {
        return this.status?.nome || ""
    }

    isFreteGratis() {
        return normalizeText(this.getTipoNome()) === "FRETE GRATIS"
    }

    isDesconto() {
        return normalizeText(this.getTipoNome()) === "DESCONTO"
    }

    isTrocaOuSobra() {
        const tipo = normalizeText(this.getTipoNome())
        return tipo === "TROCA" || tipo === "SOBRA"
    }

    estaUsado() {
        return normalizeText(this.getStatusNome()) === "USADO"
    }

    estaExpirado(referenceDate = new Date()) {
        const validade = this.validade ? new Date(this.validade) : null
        if (!validade || Number.isNaN(validade.getTime())) {
            return true
        }
        return validade.getTime() < referenceDate.getTime()
    }

    getStatusExibicao(referenceDate = new Date()) {
        if (this.estaUsado()) {
            return "USADO"
        }
        if (this.estaExpirado(referenceDate)) {
            return "EXPIRADO"
        }
        return "ATIVO"
    }

    getTipoTitulo() {
        if (this.isFreteGratis()) {
            return "FRETE GRÁTIS"
        }
        if (this.isTrocaOuSobra()) {
            return "TROCA/SOBRA"
        }
        return this.getTipoNome() || "CUPOM"
    }

    getDescricaoValor() {
        if (this.isFreteGratis()) {
            return `Valor minimo para frete gratis: R$ ${Number(this.valor || 0).toFixed(2).replace(".", ",")}`
        }
        return `Valor: R$ ${Number(this.valor || 0).toFixed(2).replace(".", ",")}`
    }

    getTempoRestante(referenceDate = new Date()) {
        const validade = this.validade ? new Date(this.validade) : null
        if (!validade || Number.isNaN(validade.getTime())) {
            return "Expiracao invalida"
        }

        const diff = validade.getTime() - referenceDate.getTime()
        if (diff <= 0) {
            return "Expirado"
        }

        const minuto = 60 * 1000
        const hora = 60 * minuto
        const dia = 24 * hora

        const dias = Math.floor(diff / dia)
        const horas = Math.floor((diff % dia) / hora)
        const minutos = Math.floor((diff % hora) / minuto)

        if (dias > 0) {
            return horas > 0
                ? `${dias} dia(s) e ${horas} hora(s)`
                : `${dias} dia(s)`
        }

        if (horas > 0) {
            return minutos > 0
                ? `${horas} hora(s) e ${minutos} minuto(s)`
                : `${horas} hora(s)`
        }

        return `${Math.max(minutos, 1)} minuto(s)`
    }
}

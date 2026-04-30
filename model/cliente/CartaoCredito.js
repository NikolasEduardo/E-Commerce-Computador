import { BandeiraCartao } from "./BandeiraCartao.js";

export class CartaoCredito {
    constructor(
        usuario,
        id,
        bandeira,
        numero,
        nomeImpresso,
        codigoSeguranca,
        preferencial,
        ativo,
        dataValidade = "",
        bandeiraId = ""
    ){
        this.usuario = usuario
        this.id = id
        this.bandeira = bandeira
        this.numero = numero
        this.nomeImpresso = nomeImpresso
        this.codigoSeguranca = codigoSeguranca
        this.preferencial = preferencial
        this.ativo = ativo
        this.dataValidade = dataValidade
        this.bandeiraId = bandeiraId || bandeira?.id || ""
    }

    static fromApi(raw = {}) {
        if (raw instanceof CartaoCredito) {
            return raw
        }

        const bandeira = raw.bandeira instanceof BandeiraCartao
            ? raw.bandeira
            : BandeiraCartao.fromApi(raw.bandeira || { id: raw.bandeiraId || "" })

        return new CartaoCredito(
            raw.usuario || null,
            raw.id || "",
            bandeira,
            raw.numero || "",
            raw.nomeImpresso || "",
            raw.codigoSeguranca || "",
            Boolean(raw.preferencial),
            raw.ativo !== false,
            raw.dataValidade || "",
            raw.bandeiraId || bandeira?.id || ""
        )
    }

    getBandeiraNome() {
        return this.bandeira?.nome || ""
    }

    getFinalNumero() {
        return `${this.numero || ""}`.replace(/\D/g, "").slice(-4) || "----"
    }

    getNumeroMascarado() {
        return `**** **** **** ${this.getFinalNumero()}`
    }

    isPreferencial() {
        return Boolean(this.preferencial)
    }

    getLabel() {
        const bandeira = this.getBandeiraNome() || "CARTAO"
        return `${bandeira} - final ${this.getFinalNumero()}`
    }

    getNomeTitularCurto() {
        return `${this.nomeImpresso || ""}`.trim().split(/\s+/)[0] || ""
    }

    getValidadeFormatada() {
        if (!this.dataValidade) {
            return ""
        }
        const parts = `${this.dataValidade}`.split("-")
        if (parts.length < 2) {
            return `${this.dataValidade}`
        }
        return `${parts[1]}/${parts[0].slice(-2)}`
    }
}

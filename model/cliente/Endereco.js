import { TipoLogradouro } from "./TipoLogradouro.js";
import { TipoResidencia } from "./TipoResidencia.js";

export class Endereco {
    constructor(
        usuario,
        id,
        tipo,
        tipoResidencia,
        tipoLogradouro,
        logradouro,
        numero,
        bairro,
        cep,
        cidade,
        estado,
        pais,
        observacoes,
        tipoResidenciaId = "",
        tipoLogradouroId = ""
    ){
        this.usuario = usuario
        this.id = id
        this.tipo = tipo
        this.tipoResidencia = tipoResidencia
        this.tipoLogradouro = tipoLogradouro
        this.logradouro = logradouro
        this.numero = numero
        this.bairro = bairro
        this.cep = cep
        this.cidade = cidade
        this.estado = estado
        this.pais = pais
        this.observacoes = observacoes
        this.tipoResidenciaId = tipoResidenciaId || tipoResidencia?.id || ""
        this.tipoLogradouroId = tipoLogradouroId || tipoLogradouro?.id || ""
    }

    static fromApi(raw = {}) {
        if (raw instanceof Endereco) {
            return raw
        }

        const tipoResidencia = raw.tipoResidencia instanceof TipoResidencia
            ? raw.tipoResidencia
            : TipoResidencia.fromApi(raw.tipoResidencia || { id: raw.tipoResidenciaId || "" })
        const tipoLogradouro = raw.tipoLogradouro instanceof TipoLogradouro
            ? raw.tipoLogradouro
            : TipoLogradouro.fromApi(raw.tipoLogradouro || { id: raw.tipoLogradouroId || "" })

        return new Endereco(
            raw.usuario || null,
            raw.id || "",
            raw.tipo || "",
            tipoResidencia,
            tipoLogradouro,
            raw.logradouro || "",
            raw.numero || "",
            raw.bairro || "",
            raw.cep || "",
            raw.cidade || "",
            raw.estado || "",
            raw.pais || "",
            raw.observacoes || "",
            raw.tipoResidenciaId || tipoResidencia?.id || "",
            raw.tipoLogradouroId || tipoLogradouro?.id || ""
        )
    }

    isPrincipal() {
        return this.tipo === "Principal"
    }

    getTipoExibicao() {
        return this.isPrincipal() ? "Residencial" : "Endereco"
    }

    getResumoSelect() {
        return `${this.getTipoExibicao()}: ${this.logradouro}, ${this.numero} - ${this.bairro}`
    }

    getCidadeEstadoCep() {
        return `${this.cidade}/${this.estado} - CEP ${this.cep}`
    }

    getLinhaBairroCidade() {
        return `${this.bairro || ""} - ${this.cidade || ""}/${this.estado || ""}`
    }

    getLinhaCepPais() {
        return `CEP: ${this.cep || ""} | ${this.pais || ""}`
    }
}

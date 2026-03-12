export class Endereco {
    constructor(cliente, id, tipo, tipoResidencia, tipoLogradouro, logradouro, numero, bairro, cep, cidade, estado, pais, observacoes){
        this.cliente = cliente
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
    }
}
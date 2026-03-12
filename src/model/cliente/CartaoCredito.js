export class CartaoCredito {
    constructor(cliente, id, bandeira, numero, nomeImpresso, codigoSeguranca, preferencial){
        this.cliente = cliente
        this.id = id
        this.bandeira = bandeira
        this.numero = numero
        this.nomeImpresso = nomeImpresso
        this.codigoSeguranca = codigoSeguranca
        this.preferencial = preferencial
    }
}
export class Pagamento {
    constructor(id, pedido, valorTotalPago, cupomPromocional, dataPagamento) {
        this.id = id
        this.pedido = pedido
        this.valorTotalPago = valorTotalPago
        this.cupomPromocional = cupomPromocional
        this.dataPagamento = dataPagamento
    }  
}
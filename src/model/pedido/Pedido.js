export class Pedido {
    constructor(cliente, id, enderecoEntrega, valorFrete, status, valorTotal) {
        this.cliente = cliente
        this.id = id
        this.enderecoEntrega = enderecoEntrega
        this.valorFrete = valorFrete
        this.status = status
        this.valorTotal = valorTotal
    }
}

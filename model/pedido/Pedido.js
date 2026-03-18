export class Pedido {
    constructor(usuario, id, enderecoEntrega, valorFrete, status, valorTotal, dataCriacao, dataExpiracaoCarrinho) {
        this.usuario = usuario
        this.id = id
        this.enderecoEntrega = enderecoEntrega
        this.valorFrete = valorFrete
        this.status = status
        this.valorTotal = valorTotal
        this.dataCriacao = dataCriacao
        this.dataExpiracaoCarrinho = dataExpiracaoCarrinho
    }
}

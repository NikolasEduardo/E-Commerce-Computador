export class Troca {
    constructor(pedido, id, produto, motivo, descricaoCliente, classificacaoTecnica, cupomGerado, data, status){
        this.pedido = pedido
        this.id = id
        this.produto = produto
        this.motivo = motivo
        this.descricaoCliente = descricaoCliente
        this.classificacaoTecnica = classificacaoTecnica
        this.cupomGerado = cupomGerado
        this.data = data
        this.status = status
    }
}
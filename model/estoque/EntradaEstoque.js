export class EntradaEstoque {
    constructor(produto, id, quantidade, valorCusto, fornecedor, dataEntrada) {
        this.produto = produto
        this.id = id
        this.quantidade = quantidade
        this.valorCusto = valorCusto
        this.fornecedor = fornecedor
        this.dataEntrada = dataEntrada
    }
}

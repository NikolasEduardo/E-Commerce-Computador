import { Produto } from "../produto/Produto.js";
import { Fornecedor } from "./Fornecedor.js";

export class EntradaEstoque {
    constructor(produto, id, quantidade, valorCusto, fornecedor, dataEntrada) {
        this.produto = produto
        this.id = id
        this.quantidade = quantidade
        this.valorCusto = valorCusto
        this.fornecedor = fornecedor
        this.dataEntrada = dataEntrada
    }

    static fromApi(raw = {}) {
        return new EntradaEstoque(
            raw.produto instanceof Produto ? raw.produto : Produto.fromApi(raw.produto),
            raw.id || "",
            Number(raw.quantidade || 0),
            Number(raw.valorCusto || 0),
            raw.fornecedor instanceof Fornecedor ? raw.fornecedor : Fornecedor.fromApi(raw.fornecedor),
            raw.dataEntrada || ""
        )
    }
}

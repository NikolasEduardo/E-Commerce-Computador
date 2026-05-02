import { Produto } from "../produto/Produto.js";
import { StatusItemPedido } from "./StatusItemPedido.js";
import { Troca } from "../cupom/Troca.js";

function normalizeText(value) {
    return `${value || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim()
}

export class ItemPedido {
    constructor(
        pedido,
        produto,
        quantidade,
        statusItemPedido,
        precoAtual = null,
        precoUnitario = null,
        precoTotal = null,
        trocas = []
    ) {
        this.pedido = pedido
        this.produto = produto instanceof Produto ? produto : Produto.fromApi(produto)
        this.quantidade = Number(quantidade || 0)
        this.statusItemPedido = statusItemPedido instanceof StatusItemPedido
            ? statusItemPedido
            : StatusItemPedido.fromApi(statusItemPedido)
        this.precoAtual = precoAtual
        this.precoUnitario = Number(precoUnitario ?? precoAtual ?? this.produto?.getPreco?.() ?? this.produto?.preco ?? 0)
        this.precoTotal = Number(precoTotal ?? this.precoUnitario * this.quantidade)
        this.trocas_on_item = trocas
        this.trocas = trocas
        this.produtoId = this.produto?.id || ""
        this.codigoProduto = this.produto?.codigoProduto || ""
        this.nome = this.produto?.nome || ""
        this.modelo = this.produto?.modelo || ""
        this.marca = this.produto?.getMarcaNome?.() || ""
        this.categorias = this.produto?.getCategoriasNomes?.() || []
        this.imagem = this.produto?.getImagemPrincipalUrl?.() || ""
    }

    static fromApi(raw = {}) {
        const produto = raw.produto instanceof Produto ? raw.produto : Produto.fromApi(raw.produto)
        return new ItemPedido(
            raw.pedido || null,
            produto,
            Number(raw.quantidade || 0),
            raw.statusItemPedido || raw.status || null,
            raw.precoAtual ?? null,
            raw.precoUnitario ?? raw.precoAtual ?? produto?.getPreco?.() ?? 0,
            raw.precoTotal ?? null,
            Array.isArray(raw.trocas_on_item)
                ? raw.trocas_on_item.map((troca) => Troca.fromApi(troca))
                : []
        )
    }

    static fromCarrinhoApi(raw = {}) {
        const produto = Produto.fromApi({
            id: raw.produtoId || raw.id || "",
            codigoProduto: raw.codigoProduto || "",
            nome: raw.nome || "",
            modelo: raw.modelo || "",
            marca: raw.marca || "",
            categorias: raw.categorias || [],
            imagem: raw.imagem || "",
            preco: raw.precoUnitario ?? 0
        })

        return new ItemPedido(
            null,
            produto,
            Number(raw.quantidade || 0),
            raw.statusItemPedido || raw.status || "CARRINHO",
            raw.precoAtual ?? raw.precoUnitario ?? null,
            raw.precoUnitario ?? null,
            raw.precoTotal ?? null,
            []
        )
    }

    getStatusNome() {
        return this.statusItemPedido?.getNome?.() || this.statusItemPedido?.nome || ""
    }

    getImagemUrl() {
        return this.imagem || this.produto?.getImagemPrincipalUrl?.() || ""
    }

    getPrecoAtual() {
        return Number(this.precoAtual ?? this.precoUnitario ?? 0)
    }

    getPrecoUnitario() {
        return Number(this.precoUnitario || 0)
    }

    getPrecoTotal() {
        return Number(this.precoTotal || 0)
    }

    getCategoriasTexto() {
        return (this.categorias || []).join(", ")
    }

    isQuantidadeZero() {
        return Number(this.quantidade || 0) === 0
    }

    getTrocas() {
        return this.trocas_on_item || []
    }

    getQuantidadeEmTroca() {
        return this.getTrocas().length
    }

    getQuantidadeRestante() {
        return Math.max(0, Number(this.quantidade || 0) - this.getQuantidadeEmTroca())
    }

    temTroca() {
        return this.getQuantidadeEmTroca() > 0
    }

    isEmTroca() {
        return normalizeText(this.getStatusNome()) === "EM TROCA"
    }

    isQuantidadeEmTroca() {
        return normalizeText(this.getStatusNome()) === "QUANTIDADE EM TROCA"
    }
}

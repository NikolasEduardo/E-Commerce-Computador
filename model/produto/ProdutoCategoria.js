import { Categoria } from "./Categoria.js";

export class ProdutoCategoria {
    constructor(produto, categoria, produtoId = "", categoriaId = "") {
        this.produto = produto
        this.categoria = categoria
        this.produtoId = produtoId || produto?.id || ""
        this.categoriaId = categoriaId || categoria?.id || ""
    }

    static fromApi(raw = {}, fallbackProdutoId = "") {
        if (raw instanceof ProdutoCategoria) {
            return raw
        }

        const categoria = Categoria.fromApi(raw?.categoria || raw)
        const produto = raw?.produto || (fallbackProdutoId ? { id: fallbackProdutoId } : null)
        const produtoId = raw?.produtoId || produto?.id || fallbackProdutoId || ""
        const categoriaId = raw?.categoriaId || categoria?.id || ""

        return new ProdutoCategoria(produto, categoria, produtoId, categoriaId)
    }

    getCategoria() {
        return this.categoria
    }

    getCategoriaNome() {
        return this.categoria?.nome || ""
    }
}

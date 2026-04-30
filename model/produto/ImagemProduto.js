export class ImagemProduto {
    constructor(id, produto, urlImagem, capa) {
        this.id = id
        this.produto = produto
        this.urlImagem = urlImagem
        this.url = urlImagem
        this.capa = capa
    }

    static fromApi(raw = {}, produto = null) {
        if (raw instanceof ImagemProduto) {
            return raw
        }
        if (typeof raw === "string") {
            return new ImagemProduto("", produto, raw, true)
        }
        return new ImagemProduto(
            raw?.id || "",
            produto,
            raw?.url || raw?.urlImagem || "",
            Boolean(raw?.capa)
        )
    }
}

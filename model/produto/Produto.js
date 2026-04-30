import { Categoria } from "./Categoria.js";
import { GrupoPrecificacao } from "./GrupoPrecificacao.js";
import { ImagemProduto } from "./ImagemProduto.js";
import { Marca } from "./Marca.js";
import { ProdutoCategoria } from "./ProdutoCategoria.js";

function normalizeText(value) {
    return `${value || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim()
}

export class Produto {
    constructor(
        nome,
        marca,
        id,
        modelo,
        descricaoTecnica,
        especificacoesTecnicas,
        garantia,
        codigoBarras,
        codigoProduto,
        grupoPrecificacao,
        status,
        motivoInativacao,
        categoriaInativacao,
        justificativaAtivacao,
        categoriaAtivacao,
        estoqueFisico,
        estoqueReservado,
        quantidadeVendida,
        categorias = [],
        produtoCategorias = [],
        imagemProdutos = [],
        preco = 0
    ) {
        this.nome = nome
        this.marca = marca
        this.id = id
        this.modelo = modelo
        this.descricaoTecnica = descricaoTecnica
        this.especificacoesTecnicas = especificacoesTecnicas
        this.garantia = garantia
        this.codigoBarras = codigoBarras
        this.codigoProduto = codigoProduto
        this.grupoPrecificacao = grupoPrecificacao
        this.status = status
        this.motivoInativacao = motivoInativacao
        this.categoriaInativacao = categoriaInativacao
        this.justificativaAtivacao = justificativaAtivacao
        this.categoriaAtivacao = categoriaAtivacao
        this.estoqueFisico = estoqueFisico
        this.estoqueReservado = estoqueReservado
        this.quantidadeVendida = quantidadeVendida
        this.categorias = categorias
        this.produtoCategorias_on_produto = produtoCategorias.length
            ? produtoCategorias
            : categorias.map((categoria) =>
                ProdutoCategoria.fromApi({ produtoId: id, categoria }, id)
            )
        this.imagemProdutos_on_produto = imagemProdutos
        this.preco = Number(preco || 0)
        this.imagens = this.imagemProdutos_on_produto
        this.imagem = this.getImagemPrincipalUrl()
    }

    static fromApi(raw = {}) {
        if (raw instanceof Produto) {
            return raw
        }

        const produtoId = raw.id || raw.produtoId || ""
        const produtoCategoriasFonte = Array.isArray(raw.produtoCategorias_on_produto)
            ? raw.produtoCategorias_on_produto
            : Array.isArray(raw.categorias)
                ? raw.categorias.map((item) => ({ produtoId, categoria: item }))
                : []

        const produtoCategorias = produtoCategoriasFonte
            .map((item) => ProdutoCategoria.fromApi(item, produtoId))
            .filter((item) => item?.categoriaId || item?.getCategoriaNome?.())

        const categorias = produtoCategorias
            .map((item) => item.getCategoria?.() || Categoria.fromApi(item?.categoria))
            .filter((item) => item?.id || item?.nome)

        const imagensFonte = Array.isArray(raw.imagemProdutos_on_produto)
            ? raw.imagemProdutos_on_produto
            : Array.isArray(raw.imagens)
                ? raw.imagens
                : raw.imagem
                    ? [{ url: raw.imagem, capa: true }]
                    : []

        const imagens = imagensFonte
            .map((imagem) => ImagemProduto.fromApi(imagem))
            .filter((imagem) => imagem?.url || imagem?.urlImagem)

        const marca = raw.marca instanceof Marca ? raw.marca : Marca.fromApi(raw.marca)
        const grupoPrecificacao =
            raw.grupoPrecificacao instanceof GrupoPrecificacao
                ? raw.grupoPrecificacao
                : GrupoPrecificacao.fromApi(raw.grupoPrecificacao)

        return new Produto(
            raw.nome || "",
            marca,
            produtoId,
            raw.modelo || "",
            raw.descricaoTecnica || "",
            raw.especificacoesTecnicas || "",
            raw.garantia || "",
            raw.codigoBarras || "",
            raw.codigoProduto || "",
            grupoPrecificacao,
            raw.status || "",
            raw.motivoInativacao || "",
            raw.categoriaInativacao || "",
            raw.justificativaAtivacao || "",
            raw.categoriaAtivacao || "",
            Number(raw.estoqueFisico || 0),
            Number(raw.estoqueReservado || 0),
            Number(raw.quantidadeVendida || 0),
            categorias,
            produtoCategorias,
            imagens,
            Number(raw.preco ?? raw.precoUnitario ?? 0)
        )
    }

    getMarcaNome() {
        return this.marca?.nome || ""
    }

    getCategoriasNomes() {
        return this.getCategorias().map((categoria) => categoria?.nome).filter(Boolean)
    }

    getCategoriasTexto() {
        return this.getCategoriasNomes().join(", ")
    }

    getCategorias() {
        return this.categorias || []
    }

    getCategoriasRelacoes() {
        return this.produtoCategorias_on_produto || []
    }

    getNomeComModelo() {
        const nome = this.nome || "PRODUTO"
        const modelo = this.modelo ? ` - ${this.modelo}` : ""
        return `${nome}${modelo}`
    }

    getImagemCapa() {
        return this.imagemProdutos_on_produto.find((imagem) => imagem?.capa) || this.imagemProdutos_on_produto[0] || null
    }

    getImagemPrincipalUrl() {
        const imagem = this.getImagemCapa()
        return imagem?.url || imagem?.urlImagem || ""
    }

    getImagensOrdenadas() {
        return [...(this.imagemProdutos_on_produto || [])].sort((a, b) => {
            if (a?.capa && !b?.capa) return -1
            if (!a?.capa && b?.capa) return 1
            return 0
        })
    }

    getPreco() {
        return Number(this.preco || 0)
    }

    getStatusNome() {
        return `${this.status || ""}`
    }

    isAtivo() {
        return normalizeText(this.getStatusNome()) === "ATIVO"
    }

    isInativo() {
        return normalizeText(this.getStatusNome()) === "INATIVO"
    }

    matchesSearch(search) {
        const searchText = normalizeText(search)
        if (!searchText) {
            return true
        }

        return normalizeText(this.nome).includes(searchText) || normalizeText(this.modelo).includes(searchText)
    }

    matchesStatus(status) {
        if (!status) {
            return true
        }
        return normalizeText(this.status) === normalizeText(status)
    }

    matchesMarcaId(marcaId) {
        if (!marcaId) {
            return true
        }
        return this.marca?.id === marcaId
    }

    matchesCategoriaId(categoriaId) {
        if (!categoriaId) {
            return true
        }
        return this.categorias.some((categoria) => categoria?.id === categoriaId)
    }

    compareWith(other, field, sortOrder = "ASC") {
        const multiplier = sortOrder === "DESC" ? -1 : 1

        if (field === "estoqueFisico") {
            return (Number(this.estoqueFisico || 0) - Number(other?.estoqueFisico || 0)) * multiplier
        }

        if (field === "quantidadeVendida") {
            return (Number(this.quantidadeVendida || 0) - Number(other?.quantidadeVendida || 0)) * multiplier
        }

        return normalizeText(this.nome).localeCompare(normalizeText(other?.nome)) * multiplier
    }
}

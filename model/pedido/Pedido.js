import { ItemPedido } from "./ItemPedido.js";
import { Pagamento } from "./Pagamento.js";
import { StatusPedido } from "./StatusPedido.js";
import { Usuario } from "../usuario/Usuario.js";

function normalizeText(value) {
    return `${value || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim()
}

export class Pedido {
    constructor(
        usuario,
        id,
        enderecoEntrega,
        valorFrete,
        status,
        valorTotal,
        dataCriacao,
        dataExpiracaoCarrinho,
        justificativaReprovacao = "",
        itemPedidos = [],
        pagamentos = []
    ) {
        this.usuario = usuario
        this.id = id
        this.enderecoEntrega = enderecoEntrega
        this.valorFrete = valorFrete
        this.status = status
        this.valorTotal = valorTotal
        this.dataCriacao = dataCriacao
        this.dataExpiracaoCarrinho = dataExpiracaoCarrinho
        this.justificativaReprovacao = justificativaReprovacao
        this.itemPedidos_on_pedido = itemPedidos
        this.pagamentos_on_pedido = pagamentos
        this.itens = itemPedidos
    }

    static fromApi(raw = {}) {
        if (raw instanceof Pedido) {
            return raw
        }
        const usuario = raw.usuario instanceof Usuario ? raw.usuario : Usuario.fromApi(raw.usuario)
        const status = raw.status instanceof StatusPedido ? raw.status : StatusPedido.fromApi(raw.status)
        const itens = Array.isArray(raw.itemPedidos_on_pedido)
            ? raw.itemPedidos_on_pedido.map((item) => ItemPedido.fromApi(item))
            : []
        const pagamentos = Array.isArray(raw.pagamentos_on_pedido)
            ? raw.pagamentos_on_pedido.map((pagamento) => Pagamento.fromApi(pagamento))
            : []

        return new Pedido(
            usuario,
            raw.id || "",
            raw.enderecoEntrega || null,
            Number(raw.valorFrete || 0),
            status,
            Number(raw.valorTotal || 0),
            raw.dataCriacao || "",
            raw.dataExpiracaoCarrinho || null,
            raw.justificativaReprovacao || "",
            itens,
            pagamentos
        )
    }

    static fromCarrinhoApi(raw = {}) {
        const itens = Array.isArray(raw.itens)
            ? raw.itens.map((item) => ItemPedido.fromCarrinhoApi(item))
            : []

        return new Pedido(
            null,
            raw.pedidoId || raw.id || "",
            null,
            0,
            new StatusPedido("", "CARRINHO"),
            Number(raw.valorTotal || 0),
            raw.dataCriacao || "",
            raw.dataExpiracaoCarrinho || null,
            "",
            itens,
            []
        )
    }

    getStatusNome() {
        return this.status?.nome || ""
    }

    getPagamentoPrincipal() {
        return this.pagamentos_on_pedido?.[0] || null
    }

    getCupomPromocional() {
        return this.getPagamentoPrincipal()?.cupomPromocional || null
    }

    temFreteGratis() {
        return normalizeText(this.getCupomPromocional()?.getTipoNome?.() || this.getCupomPromocional()?.tipo?.nome) === "FRETE GRATIS"
    }

    podeReadicionarCarrinho() {
        return normalizeText(this.getStatusNome()) === "REPROVADA"
    }

    getItens() {
        return this.itemPedidos_on_pedido || []
    }

    getItensAtivos() {
        return this.getItens().filter((item) => Number(item?.quantidade || 0) > 0)
    }

    temItensAtivos() {
        return this.getItensAtivos().length > 0
    }

    getQuantidadeTotalItens() {
        return this.getItens().reduce(
            (acc, item) => acc + Number(item?.quantidade || 0),
            0
        )
    }

    matchesSearch(search) {
        const searchText = normalizeText(search)
        if (!searchText) {
            return true
        }
        return normalizeText(this.usuario?.nome).includes(searchText)
    }

    matchesStatus(statuses = []) {
        if (!statuses.length) {
            return true
        }
        return statuses.includes(normalizeText(this.getStatusNome()))
    }

    compareWith(other, field, sortOrder = "ASC") {
        const multiplier = sortOrder === "DESC" ? -1 : 1

        if (field === "valorTotal") {
            return (Number(this.valorTotal || 0) - Number(other?.valorTotal || 0)) * multiplier
        }

        if (field === "valorFrete") {
            return (Number(this.valorFrete || 0) - Number(other?.valorFrete || 0)) * multiplier
        }

        if (field === "cliente") {
            return normalizeText(this.usuario?.nome).localeCompare(normalizeText(other?.usuario?.nome)) * multiplier
        }

        const thisTime = new Date(this.dataCriacao || 0).getTime()
        const otherTime = new Date(other?.dataCriacao || 0).getTime()
        const a = Number.isNaN(thisTime) ? 0 : thisTime
        const b = Number.isNaN(otherTime) ? 0 : otherTime
        return (a - b) * multiplier
    }
}

const fs = require("fs");
const path = require("path");
const { workspaceRoot, getAccessToken, executeGraphql } = require("./dataconnect");

const outputPath = path.resolve(
  workspaceRoot,
  process.argv[2] || process.env.SEED_OUTPUT || path.join("seed", "catalogo.json")
);

function cleanArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function mapSimple(items, fields) {
  return cleanArray(items).map((item) => {
    const mapped = {};
    fields.forEach((field) => {
      mapped[field] = item?.[field] ?? null;
    });
    return mapped;
  });
}

function mapProduto(produto) {
  return {
    codigoProduto: produto.codigoProduto,
    codigoBarras: produto.codigoBarras,
    nome: produto.nome,
    modelo: produto.modelo,
    descricaoTecnica: produto.descricaoTecnica,
    especificacoesTecnicas: produto.especificacoesTecnicas,
    garantia: produto.garantia,
    status: produto.status,
    motivoInativacao: produto.motivoInativacao,
    categoriaInativacao: produto.categoriaInativacao,
    justificativaAtivacao: produto.justificativaAtivacao,
    categoriaAtivacao: produto.categoriaAtivacao,
    estoqueFisico: Number(produto.estoqueFisico || 0),
    estoqueReservado: 0,
    quantidadeVendida: 0,
    marca: produto.marca?.nome || "",
    grupoPrecificacao: produto.grupoPrecificacao
      ? {
          nome: produto.grupoPrecificacao.nome,
          margemLucro: Number(produto.grupoPrecificacao.margemLucro || 0)
        }
      : null,
    categorias: cleanArray(produto.produtoCategorias_on_produto)
      .map((relacao) => relacao?.categoria?.nome)
      .filter(Boolean),
    imagens: cleanArray(produto.imagemProdutos_on_produto)
      .filter((imagem) => imagem?.url)
      .map((imagem) => ({
        url: imagem.url,
        capa: Boolean(imagem.capa)
      })),
    entradasEstoque: cleanArray(produto.entradaEstoques_on_produto).map((entrada) => ({
      dataEntrada: entrada.dataEntrada,
      quantidade: Number(entrada.quantidade || 0),
      valorCusto: Number(entrada.valorCusto || 0),
      fornecedor: entrada.fornecedor
        ? {
            nome: entrada.fornecedor.nome,
            emailContato: entrada.fornecedor.emailContato || "",
            telefoneContato: entrada.fornecedor.telefoneContato || ""
          }
        : null
    }))
  };
}

async function exportCatalog() {
  const accessToken = await getAccessToken();
  const query = `
    query ExportCatalogoSeed {
      statusUsuarios(orderBy: [{ nome: ASC }], limit: 500) { nome }
      tipoResidencias(orderBy: [{ nome: ASC }], limit: 500) { nome }
      tipoLogradouros(orderBy: [{ nome: ASC }], limit: 500) { nome sigla }
      tipoTelefones(orderBy: [{ nome: ASC }], limit: 500) { nome }
      statusPedidos(orderBy: [{ nome: ASC }], limit: 500) { nome }
      statusItemPedidos(orderBy: [{ nome: ASC }], limit: 500) { nome }
      tipoCupoms(orderBy: [{ nome: ASC }], limit: 500) { nome }
      statusCupoms(orderBy: [{ nome: ASC }], limit: 500) { nome }
      bandeiraCartaos(orderBy: [{ nome: ASC }], limit: 500) { nome }
      grupoPrecificacaos(orderBy: [{ nome: ASC }], limit: 500) { nome margemLucro }
      marcas(orderBy: [{ nome: ASC }], limit: 1000) { nome }
      categorias(orderBy: [{ nome: ASC }], limit: 1000) { nome vendaMinimaInativacao }
      fornecedors(orderBy: [{ nome: ASC }], limit: 1000) {
        nome
        emailContato
        telefoneContato
      }
      produtos(orderBy: [{ nome: ASC }], limit: 1000) {
        codigoProduto
        codigoBarras
        nome
        modelo
        descricaoTecnica
        especificacoesTecnicas
        garantia
        status
        motivoInativacao
        categoriaInativacao
        justificativaAtivacao
        categoriaAtivacao
        estoqueFisico
        estoqueReservado
        quantidadeVendida
        marca { nome }
        grupoPrecificacao { nome margemLucro }
        produtoCategorias_on_produto {
          categoria { nome }
        }
        imagemProdutos_on_produto(orderBy: [{ capa: DESC }], limit: 50) {
          url
          capa
        }
        entradaEstoques_on_produto(orderBy: [{ dataEntrada: ASC }], limit: 200) {
          dataEntrada
          quantidade
          valorCusto
          fornecedor {
            nome
            emailContato
            telefoneContato
          }
        }
      }
    }
  `;

  const data = await executeGraphql(accessToken, query, {});
  const catalog = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: {
      type: "firebase-dataconnect-catalog"
    },
    data: {
      statusUsuarios: mapSimple(data.statusUsuarios, ["nome"]),
      tipoResidencias: mapSimple(data.tipoResidencias, ["nome"]),
      tipoLogradouros: mapSimple(data.tipoLogradouros, ["nome", "sigla"]),
      tipoTelefones: mapSimple(data.tipoTelefones, ["nome"]),
      statusPedidos: mapSimple(data.statusPedidos, ["nome"]),
      statusItemPedidos: mapSimple(data.statusItemPedidos, ["nome"]),
      tipoCupoms: mapSimple(data.tipoCupoms, ["nome"]),
      statusCupoms: mapSimple(data.statusCupoms, ["nome"]),
      bandeiraCartaos: mapSimple(data.bandeiraCartaos, ["nome"]),
      grupoPrecificacaos: mapSimple(data.grupoPrecificacaos, ["nome", "margemLucro"]),
      marcas: mapSimple(data.marcas, ["nome"]),
      categorias: mapSimple(data.categorias, ["nome", "vendaMinimaInativacao"]),
      fornecedores: mapSimple(data.fornecedors, ["nome", "emailContato", "telefoneContato"]),
      produtos: cleanArray(data.produtos).map(mapProduto)
    }
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`Catalogo exportado para ${outputPath}`);
  console.log(`Produtos exportados: ${catalog.data.produtos.length}`);
}

exportCatalog().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

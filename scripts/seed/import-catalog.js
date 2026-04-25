const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const { workspaceRoot, getAccessToken, executeGraphql } = require("./dataconnect");

const inputPath = path.resolve(
  workspaceRoot,
  process.argv[2] || process.env.SEED_INPUT || path.join("seed", "catalogo.json")
);
const cloudinaryFolder = process.env.CLOUDINARY_SEED_FOLDER || "ecommerce-seed";
const uploadedImageCache = new Map();

const simpleTables = [
  {
    key: "statusUsuarios",
    plural: "statusUsuarios",
    mutation: "statusUsuario_insert",
    fields: ["nome"]
  },
  {
    key: "tipoResidencias",
    plural: "tipoResidencias",
    mutation: "tipoResidencia_insert",
    fields: ["nome"]
  },
  {
    key: "tipoTelefones",
    plural: "tipoTelefones",
    mutation: "tipoTelefone_insert",
    fields: ["nome"]
  },
  {
    key: "statusPedidos",
    plural: "statusPedidos",
    mutation: "statusPedido_insert",
    fields: ["nome"]
  },
  {
    key: "statusItemPedidos",
    plural: "statusItemPedidos",
    mutation: "statusItemPedido_insert",
    fields: ["nome"]
  },
  {
    key: "tipoCupoms",
    plural: "tipoCupoms",
    mutation: "tipoCupom_insert",
    fields: ["nome"]
  },
  {
    key: "statusCupoms",
    plural: "statusCupoms",
    mutation: "statusCupom_insert",
    fields: ["nome"]
  },
  {
    key: "bandeiraCartaos",
    plural: "bandeiraCartaos",
    mutation: "bandeiraCartao_insert",
    fields: ["nome"]
  }
];

function readCatalog() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de seed nao encontrado: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.data || parsed;
}

function cleanArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeDate(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function sanitizePublicId(value) {
  return String(value || "produto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function configureCloudinary() {
  const missing = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!process.env.CLOUDINARY_API_KEY) missing.push("CLOUDINARY_API_KEY");
  if (!process.env.CLOUDINARY_API_SECRET) missing.push("CLOUDINARY_API_SECRET");

  if (missing.length) {
    throw new Error(`Configuracao do Cloudinary incompleta: ${missing.join(", ")}.`);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

async function getIdByName(accessToken, plural, nome) {
  if (!nome) {
    return null;
  }

  const query = `
    query RegistroPorNome($nome: String!) {
      ${plural}(where: { nome: { eq: $nome } }, limit: 1) { id }
    }
  `;
  const data = await executeGraphql(accessToken, query, { nome });
  return data?.[plural]?.[0]?.id || null;
}

async function insertSimpleByName(accessToken, mutationName, nome) {
  const mutation = `
    mutation InserirRegistro($nome: String!) {
      ${mutationName}(data: { nome: $nome })
    }
  `;
  await executeGraphql(accessToken, mutation, { nome });
}

async function ensureSimpleByName(accessToken, table, item) {
  const nome = String(item?.nome || "").trim();
  if (!nome) {
    return null;
  }

  const existing = await getIdByName(accessToken, table.plural, nome);
  if (existing) {
    return existing;
  }

  await insertSimpleByName(accessToken, table.mutation, nome);
  return getIdByName(accessToken, table.plural, nome);
}

async function ensureTipoLogradouro(accessToken, item) {
  const nome = String(item?.nome || "").trim();
  const sigla = String(item?.sigla || "").trim();
  if (!nome || !sigla) {
    return null;
  }

  const existing = await getIdByName(accessToken, "tipoLogradouros", nome);
  if (existing) {
    return existing;
  }

  const mutation = `
    mutation InserirTipoLogradouro($nome: String!, $sigla: String!) {
      tipoLogradouro_insert(data: { nome: $nome, sigla: $sigla })
    }
  `;
  await executeGraphql(accessToken, mutation, { nome, sigla });
  return getIdByName(accessToken, "tipoLogradouros", nome);
}

async function ensureGrupoPrecificacao(accessToken, item) {
  const nome = String(item?.nome || "").trim();
  const margemLucro = Number(item?.margemLucro || 0);
  if (!nome || !Number.isFinite(margemLucro) || margemLucro <= 0) {
    return null;
  }

  const existing = await getIdByName(accessToken, "grupoPrecificacaos", nome);
  if (existing) {
    const mutation = `
      mutation AtualizarGrupoPrecificacao($id: UUID!, $nome: String!, $margemLucro: Float!) {
        grupoPrecificacao_update(id: $id, data: { nome: $nome, margemLucro: $margemLucro })
      }
    `;
    await executeGraphql(accessToken, mutation, { id: existing, nome, margemLucro });
    return existing;
  }

  const mutation = `
    mutation InserirGrupoPrecificacao($nome: String!, $margemLucro: Float!) {
      grupoPrecificacao_insert(data: { nome: $nome, margemLucro: $margemLucro })
    }
  `;
  await executeGraphql(accessToken, mutation, { nome, margemLucro });
  return getIdByName(accessToken, "grupoPrecificacaos", nome);
}

async function ensureCategoria(accessToken, item) {
  const nome = String(item?.nome || item || "").trim();
  const vendaMinimaInativacao =
    item && Object.prototype.hasOwnProperty.call(item, "vendaMinimaInativacao")
      ? Number(item.vendaMinimaInativacao)
      : null;

  if (!nome) {
    return null;
  }

  const payload = {
    nome,
    vendaMinimaInativacao: Number.isFinite(vendaMinimaInativacao)
      ? vendaMinimaInativacao
      : null
  };
  const existing = await getIdByName(accessToken, "categorias", nome);
  if (existing) {
    const mutation = `
      mutation AtualizarCategoria($id: UUID!, $nome: String!, $vendaMinimaInativacao: Float) {
        categoria_update(
          id: $id,
          data: { nome: $nome, vendaMinimaInativacao: $vendaMinimaInativacao }
        )
      }
    `;
    await executeGraphql(accessToken, mutation, { id: existing, ...payload });
    return existing;
  }

  const mutation = `
    mutation InserirCategoria($nome: String!, $vendaMinimaInativacao: Float) {
      categoria_insert(data: {
        nome: $nome,
        vendaMinimaInativacao: $vendaMinimaInativacao
      })
    }
  `;
  await executeGraphql(accessToken, mutation, payload);
  return getIdByName(accessToken, "categorias", nome);
}

async function ensureFornecedor(accessToken, item) {
  const nome = String(item?.nome || "").trim();
  if (!nome) {
    return null;
  }

  const existing = await getIdByName(accessToken, "fornecedors", nome);
  if (existing) {
    return existing;
  }

  const mutation = `
    mutation InserirFornecedor($nome: String!, $emailContato: String, $telefoneContato: String) {
      fornecedor_insert(data: {
        nome: $nome,
        emailContato: $emailContato,
        telefoneContato: $telefoneContato
      })
    }
  `;
  await executeGraphql(accessToken, mutation, {
    nome,
    emailContato: item?.emailContato || "",
    telefoneContato: item?.telefoneContato || ""
  });
  return getIdByName(accessToken, "fornecedors", nome);
}

async function getProdutoByCodigo(accessToken, codigoProduto) {
  const query = `
    query ProdutoPorCodigo($codigoProduto: String!) {
      produtos(where: { codigoProduto: { eq: $codigoProduto } }, limit: 1) { id }
    }
  `;
  const data = await executeGraphql(accessToken, query, { codigoProduto });
  return data?.produtos?.[0] || null;
}

async function upsertProduto(accessToken, produto, marcaId, grupoPrecificacaoId) {
  const existing = await getProdutoByCodigo(accessToken, produto.codigoProduto);
  const data = {
    id: existing?.id || crypto.randomUUID(),
    nome: produto.nome,
    marcaId,
    modelo: produto.modelo,
    descricaoTecnica: produto.descricaoTecnica,
    especificacoesTecnicas: produto.especificacoesTecnicas,
    garantia: produto.garantia,
    codigoBarras: produto.codigoBarras,
    codigoProduto: produto.codigoProduto,
    grupoPrecificacaoId,
    status: produto.status || "ATIVO",
    motivoInativacao: produto.motivoInativacao || null,
    categoriaInativacao: produto.categoriaInativacao || null,
    justificativaAtivacao: produto.justificativaAtivacao || null,
    categoriaAtivacao: produto.categoriaAtivacao || null,
    estoqueFisico: Number(produto.estoqueFisico || 0),
    estoqueReservado: 0,
    quantidadeVendida: Number(produto.quantidadeVendida || 0)
  };

  if (existing?.id) {
    const mutation = `
      mutation AtualizarProdutoSeed(
        $id: UUID!,
        $nome: String!,
        $marcaId: UUID!,
        $modelo: String!,
        $descricaoTecnica: String!,
        $especificacoesTecnicas: String!,
        $garantia: String!,
        $codigoBarras: String!,
        $codigoProduto: String!,
        $grupoPrecificacaoId: UUID!,
        $status: String!,
        $motivoInativacao: String,
        $categoriaInativacao: String,
        $justificativaAtivacao: String,
        $categoriaAtivacao: String,
        $estoqueFisico: Int!,
        $estoqueReservado: Int!,
        $quantidadeVendida: Int!
      ) {
        produto_update(id: $id, data: {
          nome: $nome,
          marcaId: $marcaId,
          modelo: $modelo,
          descricaoTecnica: $descricaoTecnica,
          especificacoesTecnicas: $especificacoesTecnicas,
          garantia: $garantia,
          codigoBarras: $codigoBarras,
          codigoProduto: $codigoProduto,
          grupoPrecificacaoId: $grupoPrecificacaoId,
          status: $status,
          motivoInativacao: $motivoInativacao,
          categoriaInativacao: $categoriaInativacao,
          justificativaAtivacao: $justificativaAtivacao,
          categoriaAtivacao: $categoriaAtivacao,
          estoqueFisico: $estoqueFisico,
          estoqueReservado: $estoqueReservado,
          quantidadeVendida: $quantidadeVendida
        })
      }
    `;
    await executeGraphql(accessToken, mutation, data);
    return data.id;
  }

  const mutation = `
    mutation InserirProdutoSeed(
      $id: UUID!,
      $nome: String!,
      $marcaId: UUID!,
      $modelo: String!,
      $descricaoTecnica: String!,
      $especificacoesTecnicas: String!,
      $garantia: String!,
      $codigoBarras: String!,
      $codigoProduto: String!,
      $grupoPrecificacaoId: UUID!,
      $status: String!,
      $motivoInativacao: String,
      $categoriaInativacao: String,
      $justificativaAtivacao: String,
      $categoriaAtivacao: String,
      $estoqueFisico: Int!,
      $estoqueReservado: Int!,
      $quantidadeVendida: Int!
    ) {
      produto_insert(data: {
        id: $id,
        nome: $nome,
        marcaId: $marcaId,
        modelo: $modelo,
        descricaoTecnica: $descricaoTecnica,
        especificacoesTecnicas: $especificacoesTecnicas,
        garantia: $garantia,
        codigoBarras: $codigoBarras,
        codigoProduto: $codigoProduto,
        grupoPrecificacaoId: $grupoPrecificacaoId,
        status: $status,
        motivoInativacao: $motivoInativacao,
        categoriaInativacao: $categoriaInativacao,
        justificativaAtivacao: $justificativaAtivacao,
        categoriaAtivacao: $categoriaAtivacao,
        estoqueFisico: $estoqueFisico,
        estoqueReservado: $estoqueReservado,
        quantidadeVendida: $quantidadeVendida
      })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
  return data.id;
}

async function deleteProdutoCategorias(accessToken, produtoId) {
  const mutation = `
    mutation RemoverCategoriasProduto($produtoId: UUID!) {
      produtoCategoria_deleteMany(where: { produtoId: { eq: $produtoId } })
    }
  `;
  await executeGraphql(accessToken, mutation, { produtoId });
}

async function insertProdutoCategoria(accessToken, produtoId, categoriaId) {
  const mutation = `
    mutation InserirProdutoCategoria($produtoId: UUID!, $categoriaId: UUID!) {
      produtoCategoria_insert(data: { produtoId: $produtoId, categoriaId: $categoriaId })
    }
  `;
  await executeGraphql(accessToken, mutation, { produtoId, categoriaId });
}

async function deleteImagemProdutos(accessToken, produtoId) {
  const mutation = `
    mutation RemoverImagensProduto($produtoId: UUID!) {
      imagemProduto_deleteMany(where: { produtoId: { eq: $produtoId } })
    }
  `;
  await executeGraphql(accessToken, mutation, { produtoId });
}

async function insertImagemProduto(accessToken, produtoId, url, capa) {
  const mutation = `
    mutation InserirImagemProduto($produtoId: UUID!, $url: String!, $capa: Boolean!) {
      imagemProduto_insert(data: { produtoId: $produtoId, url: $url, capa: $capa })
    }
  `;
  await executeGraphql(accessToken, mutation, { produtoId, url, capa });
}

async function uploadImageToCloudinary(produto, imagem, index) {
  if (!imagem?.url) {
    return null;
  }

  const cacheKey = `${produto.codigoProduto}:${index}:${imagem.url}`;
  if (uploadedImageCache.has(cacheKey)) {
    return uploadedImageCache.get(cacheKey);
  }

  const publicId = `${sanitizePublicId(produto.codigoProduto)}-${String(index + 1).padStart(2, "0")}`;
  const result = await cloudinary.uploader.upload(imagem.url, {
    folder: cloudinaryFolder,
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    resource_type: "image"
  });
  const uploadedUrl = result.secure_url || result.url;
  uploadedImageCache.set(cacheKey, uploadedUrl);
  return uploadedUrl;
}

async function entradaEstoqueExiste(accessToken, entrada) {
  const query = `
    query EntradaEstoqueExiste(
      $produtoId: UUID!,
      $fornecedorId: UUID!,
      $dataEntrada: Date!,
      $quantidade: Int!,
      $valorCusto: Float!
    ) {
      entradaEstoques(
        where: { _and: [
          { produtoId: { eq: $produtoId } },
          { fornecedorId: { eq: $fornecedorId } },
          { dataEntrada: { eq: $dataEntrada } },
          { quantidade: { eq: $quantidade } },
          { valorCusto: { eq: $valorCusto } }
        ] },
        limit: 1
      ) {
        id
      }
    }
  `;
  const data = await executeGraphql(accessToken, query, entrada);
  return Boolean(data?.entradaEstoques?.[0]?.id);
}

async function insertEntradaEstoqueSeNaoExiste(accessToken, entrada) {
  if (await entradaEstoqueExiste(accessToken, entrada)) {
    return false;
  }

  const mutation = `
    mutation InserirEntradaEstoque(
      $fornecedorId: UUID!,
      $produtoId: UUID!,
      $dataEntrada: Date!,
      $quantidade: Int!,
      $valorCusto: Float!
    ) {
      entradaEstoque_insert(data: {
        fornecedorId: $fornecedorId,
        produtoId: $produtoId,
        dataEntrada: $dataEntrada,
        quantidade: $quantidade,
        valorCusto: $valorCusto
      })
    }
  `;
  await executeGraphql(accessToken, mutation, entrada);
  return true;
}

async function importarProduto(accessToken, produto) {
  if (!produto?.codigoProduto || !produto?.nome || !produto?.marca || !produto?.grupoPrecificacao) {
    console.warn(`Produto ignorado por dados incompletos: ${produto?.nome || "sem nome"}`);
    return;
  }

  const marcaId = await ensureSimpleByName(accessToken, {
    plural: "marcas",
    mutation: "marca_insert"
  }, { nome: produto.marca });
  const grupoPrecificacaoId = await ensureGrupoPrecificacao(accessToken, produto.grupoPrecificacao);
  if (!marcaId || !grupoPrecificacaoId) {
    console.warn(`Produto ignorado por marca/grupo ausente: ${produto.nome}`);
    return;
  }

  const produtoId = await upsertProduto(accessToken, produto, marcaId, grupoPrecificacaoId);

  await deleteProdutoCategorias(accessToken, produtoId);
  for (const categoriaNome of cleanArray(produto.categorias)) {
    const categoriaId = await ensureCategoria(accessToken, { nome: categoriaNome });
    if (categoriaId) {
      await insertProdutoCategoria(accessToken, produtoId, categoriaId);
    }
  }

  await deleteImagemProdutos(accessToken, produtoId);
  for (const [index, imagem] of cleanArray(produto.imagens).entries()) {
    const uploadedUrl = await uploadImageToCloudinary(produto, imagem, index);
    if (uploadedUrl) {
      await insertImagemProduto(accessToken, produtoId, uploadedUrl, Boolean(imagem.capa));
    }
  }

  for (const entrada of cleanArray(produto.entradasEstoque)) {
    const fornecedorId = await ensureFornecedor(accessToken, entrada.fornecedor);
    const quantidade = Number(entrada.quantidade || 0);
    const valorCusto = Number(entrada.valorCusto || 0);
    if (!fornecedorId || quantidade <= 0 || valorCusto <= 0) {
      continue;
    }

    await insertEntradaEstoqueSeNaoExiste(accessToken, {
      produtoId,
      fornecedorId,
      dataEntrada: normalizeDate(entrada.dataEntrada),
      quantidade,
      valorCusto
    });
  }
}

async function importCatalog() {
  configureCloudinary();

  const catalog = readCatalog();
  const accessToken = await getAccessToken();

  for (const table of simpleTables) {
    for (const item of cleanArray(catalog[table.key])) {
      await ensureSimpleByName(accessToken, table, item);
    }
    console.log(`Importado: ${table.key}`);
  }

  for (const item of cleanArray(catalog.tipoLogradouros)) {
    await ensureTipoLogradouro(accessToken, item);
  }
  console.log("Importado: tipoLogradouros");

  for (const item of cleanArray(catalog.grupoPrecificacaos)) {
    await ensureGrupoPrecificacao(accessToken, item);
  }
  console.log("Importado: grupoPrecificacaos");

  for (const item of cleanArray(catalog.marcas)) {
    await ensureSimpleByName(accessToken, { plural: "marcas", mutation: "marca_insert" }, item);
  }
  console.log("Importado: marcas");

  for (const item of cleanArray(catalog.categorias)) {
    await ensureCategoria(accessToken, item);
  }
  console.log("Importado: categorias");

  for (const item of cleanArray(catalog.fornecedores)) {
    await ensureFornecedor(accessToken, item);
  }
  console.log("Importado: fornecedores");

  let produtosImportados = 0;
  for (const produto of cleanArray(catalog.produtos)) {
    await importarProduto(accessToken, produto);
    produtosImportados += 1;
    console.log(`Produto importado: ${produto.codigoProduto} - ${produto.nome}`);
  }

  console.log(`Importacao concluida. Produtos processados: ${produtosImportados}`);
}

importCatalog().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

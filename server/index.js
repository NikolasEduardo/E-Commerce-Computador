const http = require("http");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

loadEnvFile(path.join(__dirname, ".env"));

const PORT = process.env.PORT || 3000;
const PUBLIC_ROOT = path.resolve(__dirname, "..");
const STATIC_MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};

const projectId = process.env.FIREBASE_PROJECT_ID || "";
const location = process.env.DATACONNECT_LOCATION || "";
const serviceId = process.env.DATACONNECT_SERVICE_ID || "";
const apiKey = process.env.FIREBASE_API_KEY || "";
const authDomain = process.env.FIREBASE_AUTH_DOMAIN || buildFirebaseAuthDomain(projectId);
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || buildFirebaseStorageBucket(projectId);
const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || "";
const appId = process.env.FIREBASE_APP_ID || "";
const measurementId = process.env.FIREBASE_MEASUREMENT_ID || "";

const serviceAccountPath =
  normalizeEnvPath(process.env.GOOGLE_APPLICATION_CREDENTIALS) ||
  path.join(__dirname, "serviceAccount.json");

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || "";
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || "";
const cloudinaryUploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const cepRegex = /^\d{5}-\d{3}$/;
const TIPO_ENDERECO_PRINCIPAL = "Principal";
const TIPO_ENDERECO_SECUNDARIO = "Secundario";
const CARRINHO_STATUS_ID = "657ec9e6e2e743268c7afe6aeb0db479";
const CARRINHO_EXPIRACAO_MIN = 30; //30 min
const CARRINHO_AVISO_MIN = 5; //5 min
const CARRINHO_ESTENDER_MIN = 10; //10 min
const CARRINHO_MAX_QTD = 99;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function normalizeEnvPath(value) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildFirebaseAuthDomain(currentProjectId) {
  return currentProjectId ? `${currentProjectId}.firebaseapp.com` : "";
}

function buildFirebaseStorageBucket(currentProjectId) {
  return currentProjectId ? `${currentProjectId}.firebasestorage.app` : "";
}

function buildFirebasePublicConfig() {
  const firebase = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId
  };

  return {
    firebase: Object.fromEntries(
      Object.entries(firebase).filter(([, value]) => typeof value === "string" && value)
    ),
    dataconnect: {
      projectId,
      location,
      serviceId,
      emulator: {
        enabled: false,
        host: "localhost:50001"
      }
    }
  };
}

function escapeGqlString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function sendStaticFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, error.code === "ENOENT" ? 404 : 500, {
        error: error.code === "ENOENT" ? "Arquivo nao encontrado." : "Erro ao ler arquivo."
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": STATIC_MIME_TYPES[ext] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(content);
  });
}

function resolveStaticPath(urlPathname) {
  const pathname = decodeURIComponent(urlPathname || "/");
  const normalizedPath = pathname === "/" ? "/view/index.html" : pathname;
  const absolutePath = path.normalize(path.join(PUBLIC_ROOT, normalizedPath));

  if (!absolutePath.startsWith(PUBLIC_ROOT)) {
    return null;
  }

  return absolutePath;
}

function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 404, { error: "Rota nao encontrada." });
    return;
  }

  if (url.pathname === "/") {
    res.writeHead(302, { Location: "/view/index.html" });
    res.end();
    return;
  }

  const filePath = resolveStaticPath(url.pathname);
  if (!filePath) {
    sendJson(res, 403, { error: "Acesso negado." });
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error) {
      sendJson(res, 404, { error: "Arquivo nao encontrado." });
      return;
    }

    if (stats.isDirectory()) {
      sendStaticFile(res, path.join(filePath, "index.html"));
      return;
    }

    sendStaticFile(res, filePath);
  });
}

function ensureCloudinaryConfig() {
  if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    throw new Error("Cloudinary nao configurado.");
  }
}

function buildCloudinarySignature(params) {
  const toSign = Object.keys(params)
    .filter((key) => {
      const value = params[key];
      return (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        key !== "file" &&
        key !== "api_key" &&
        key !== "signature"
      );
    })
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(`${toSign}${cloudinaryApiSecret}`).digest("hex");
}

function readServiceAccount() {
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Service account JSON not found at ${serviceAccountPath}. ` +
        "Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccount.json in server/."
    );
  }
  const raw = fs.readFileSync(serviceAccountPath, "utf8");
  return JSON.parse(raw);
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken() {
  const sa = readServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(claimSet)
  )}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key, "base64");
  const jwt = `${unsigned}.${signature
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error_description || payload?.error || "Falha ao obter access token.";
    throw new Error(message);
  }

  return payload.access_token;
}

async function verifyIdToken(idToken) {
  if (!apiKey) {
    throw new Error("FIREBASE_API_KEY nao configurada.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.users?.[0]?.localId) {
    throw new Error("Token de usuario invalido.");
  }

  return payload.users[0].localId;
}

async function executeGraphql(accessToken, query, variables) {
  const endpoint = `https://firebasedataconnect.googleapis.com/v1beta/projects/${projectId}/locations/${location}/services/${serviceId}:executeGraphql`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || "Erro ao consultar Data Connect.";
    throw new Error(message);
  }

  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message || "Erro ao consultar Data Connect.");
  }

  return payload?.data || {};
}

async function queryUsuarioStatus(authId, accessToken) {
  const query = `
    query UsuarioPorAuthId($authId: String!) {
      usuarios(where: { authId: { eq: $authId } }, limit: 1) {
        authId
        status {
          nome
        }
      }
    }
  `;

  const data = await executeGraphql(accessToken, query, { authId });
  const usuario = data?.usuarios?.[0] || null;
  return usuario?.status?.nome || null;
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getBearerTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice("Bearer ".length).trim();
}

async function requireAuthenticatedContext(req) {
  const idToken = getBearerTokenFromRequest(req);
  if (!idToken) {
    throw createHttpError(
      401,
      "Voce precisa estar autenticado e com permissoes administrativas para acessar este recurso."
    );
  }

  let authId = "";
  try {
    authId = await verifyIdToken(idToken);
  } catch {
    throw createHttpError(
      401,
      "Voce precisa estar autenticado e com permissoes administrativas para acessar este recurso."
    );
  }

  const accessToken = await getAccessToken();
  const status = await queryUsuarioStatus(authId, accessToken);

  return {
    idToken,
    authId,
    accessToken,
    status
  };
}

async function requireAdminContext(req) {
  const context = await requireAuthenticatedContext(req);

  if (context.status !== "ADMIN") {
    throw createHttpError(
      403,
      "Voce nao tem permissoes administrativas para acessar este recurso."
    );
  }

  return context;
}

async function fetchCadastroMetadata(accessToken) {
  const query = `
    query CadastroMetadata {
      tipoTelefones {
        id
        nome
      }
      tipoResidencias {
        id
        nome
      }
      tipoLogradouros {
        id
        nome
        sigla
      }
      bandeiraCartaos {
        id
        nome
      }
    }
  `;

  return executeGraphql(accessToken, query, {});
}

async function checkUsuarioUnico(accessToken, email, cpf) {
  const query = `
    query ValidarUsuario($email: String!, $cpf: String!) {
      emailCheck: usuarios(where: { email: { eq: $email } }, limit: 1) { id }
      cpfCheck: usuarios(where: { cpf: { eq: $cpf } }, limit: 1) { id }
    }
  `;

  const data = await executeGraphql(accessToken, query, { email, cpf });
  return {
    emailExists: (data?.emailCheck || []).length > 0,
    cpfExists: (data?.cpfCheck || []).length > 0
  };
}

async function getStatusUsuarioId(accessToken, nome) {
  const query = `
    query StatusUsuarioPorNome($nome: String!) {
      statusUsuarios(where: { nome: { eq: $nome } }, limit: 1) { id }
    }
  `;

  const data = await executeGraphql(accessToken, query, { nome });
  return data?.statusUsuarios?.[0]?.id || null;
}

async function ensureStatusUsuario(accessToken, nome) {
  const existingId = await getStatusUsuarioId(accessToken, nome);
  if (existingId) {
    return existingId;
  }

  const mutation = `
    mutation InserirStatusUsuario($nome: String!) {
      statusUsuario_insert(data: { nome: $nome })
    }
  `;

  await executeGraphql(accessToken, mutation, { nome });

  return getStatusUsuarioId(accessToken, nome);
}

async function getStatusPedidoId(accessToken, nome) {
  const query = `
    query StatusPedidoPorNome($nome: String!) {
      statusPedidos(where: { nome: { eq: $nome } }, limit: 1) { id }
    }
  `;

  const data = await executeGraphql(accessToken, query, { nome });
  return data?.statusPedidos?.[0]?.id || null;
}

async function getStatusCupomId(accessToken, nome) {
  const query = `
    query StatusCupomPorNome($nome: String!) {
      statusCupoms(where: { nome: { eq: $nome } }, limit: 1) { id }
    }
  `;
  const data = await executeGraphql(accessToken, query, { nome });
  return data?.statusCupoms?.[0]?.id || null;
}

async function getTipoCupomId(accessToken, nome) {
  const query = `
    query TipoCupomPorNome($nome: String!) {
      tipoCupoms(where: { nome: { eq: $nome } }, limit: 1) { id }
    }
  `;
  const data = await executeGraphql(accessToken, query, { nome });
  return data?.tipoCupoms?.[0]?.id || null;
}

async function updatePedidoStatus(accessToken, data) {
  const hasJustificativa = Object.prototype.hasOwnProperty.call(
    data,
    "justificativaReprovacao"
  );

  const mutation = hasJustificativa
    ? `
    mutation AtualizarStatusPedido($id: UUID!, $statusId: UUID!, $justificativaReprovacao: String) {
      pedido_update(id: $id, data: { statusId: $statusId, justificativaReprovacao: $justificativaReprovacao })
    }
  `
    : `
    mutation AtualizarStatusPedido($id: UUID!, $statusId: UUID!) {
      pedido_update(id: $id, data: { statusId: $statusId })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function insertUsuario(accessToken, data) {
  const mutation = `
    mutation InserirUsuario(
      $id: UUID!,
      $authId: String!,
      $statusId: UUID!,
      $codigoUser: String!,
      $nome: String!,
      $genero: String!,
      $dataNascimento: Date!,
      $cpf: String!,
      $email: String!,
      $ranking: Int!
    ) {
      usuario_insert(data: {
        id: $id,
        authId: $authId,
        statusId: $statusId,
        codigoUser: $codigoUser,
        nome: $nome,
        genero: $genero,
        dataNascimento: $dataNascimento,
        cpf: $cpf,
        email: $email,
        ranking: $ranking
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
  return data.id;
}

async function insertTelefone(accessToken, data) {
  const mutation = `
    mutation InserirTelefone($id: UUID!, $usuarioId: UUID!, $tipoId: UUID!, $ddd: String!, $numero: String!) {
      telefone_insert(data: {
        id: $id,
        usuarioId: $usuarioId,
        tipoId: $tipoId,
        ddd: $ddd,
        numero: $numero
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function insertEndereco(accessToken, data) {
  const mutation = `
    mutation InserirEndereco(
      $id: UUID!,
      $tipoLogradouroId: UUID!,
      $tipoResidenciaId: UUID!,
      $usuarioId: UUID!,
      $tipo: String!,
      $logradouro: String!,
      $numero: String!,
      $bairro: String!,
      $cep: String!,
      $cidade: String!,
      $estado: String!,
      $pais: String!,
      $observacoes: String
    ) {
      endereco_insert(data: {
        id: $id,
        tipoLogradouroId: $tipoLogradouroId,
        tipoResidenciaId: $tipoResidenciaId,
        usuarioId: $usuarioId,
        tipo: $tipo,
        logradouro: $logradouro,
        numero: $numero,
        bairro: $bairro,
        cep: $cep,
        cidade: $cidade,
        estado: $estado,
        pais: $pais,
        observacoes: $observacoes
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
  return data.id;
}

async function insertPedido(accessToken, data) {
  const mutation = `
    mutation InserirPedido(
      $id: UUID!,
      $enderecoEntregaId: UUID!,
      $statusId: UUID!,
      $usuarioId: UUID!,
      $valorFrete: Float!,
      $valorTotal: Float!,
      $dataCriacao: Timestamp!,
      $dataExpiracaoCarrinho: Timestamp
    ) {
      pedido_insert(data: {
        id: $id,
        enderecoEntregaId: $enderecoEntregaId,
        statusId: $statusId,
        usuarioId: $usuarioId,
        valorFrete: $valorFrete,
        valorTotal: $valorTotal,
        dataCriacao: $dataCriacao,
        dataExpiracaoCarrinho: $dataExpiracaoCarrinho
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function insertPagamento(accessToken, data) {
  const mutation = `
    mutation InserirPagamento(
      $id: UUID!,
      $pedidoId: UUID!,
      $valorTotalPago: Float!,
      $dataPagamento: Timestamp!,
      $cupomPromocionalId: UUID
    ) {
      pagamento_insert(data: {
        id: $id,
        pedidoId: $pedidoId,
        valorTotalPago: $valorTotalPago,
        dataPagamento: $dataPagamento,
        cupomPromocionalId: $cupomPromocionalId
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function insertPagamentoCartao(accessToken, data) {
  const mutation = `
    mutation InserirPagamentoCartao(
      $pagamentoId: UUID!,
      $cartaoCreditoId: UUID!,
      $valorParcela: Float!
    ) {
      pagamentoCartao_insert(data: {
        pagamentoId: $pagamentoId,
        cartaoCreditoId: $cartaoCreditoId,
        valorParcela: $valorParcela
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function insertPagamentoCupomTroca(accessToken, data) {
  const mutation = `
    mutation InserirPagamentoCupomTroca(
      $pagamentoId: UUID!,
      $cupomTrocaId: UUID!
    ) {
      pagamentoCupomTroca_insert(data: {
        pagamentoId: $pagamentoId,
        cupomTrocaId: $cupomTrocaId
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function updateCupomStatus(accessToken, data) {
  const mutation = `
    mutation AtualizarStatusCupom($id: UUID!, $statusId: UUID!) {
      cupom_update(id: $id, data: { statusId: $statusId })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

async function insertCupom(accessToken, data) {
  const mutation = `
    mutation InserirCupom(
      $id: UUID!,
      $clienteId: UUID!,
      $statusId: UUID!,
      $tipoId: UUID!,
      $codigo: String!,
      $valor: Float!,
      $validade: Timestamp!
    ) {
      cupom_insert(data: {
        id: $id,
        clienteId: $clienteId,
        statusId: $statusId,
        tipoId: $tipoId,
        codigo: $codigo,
        valor: $valor,
        validade: $validade
      })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

async function updateUsuario(accessToken, data) {
  const mutation = `
    mutation AtualizarUsuario($id: UUID!, $nome: String!, $genero: String!, $dataNascimento: Date!) {
      usuario_update(id: $id, data: {
        nome: $nome,
        genero: $genero,
        dataNascimento: $dataNascimento
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function updateTelefone(accessToken, data) {
  const mutation = `
    mutation AtualizarTelefone($id: UUID!, $tipoId: UUID!, $ddd: String!, $numero: String!) {
      telefone_update(id: $id, data: {
        tipoId: $tipoId,
        ddd: $ddd,
        numero: $numero
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function updateEndereco(accessToken, data) {
  const mutation = `
    mutation AtualizarEndereco(
      $id: UUID!,
      $tipoLogradouroId: UUID!,
      $tipoResidenciaId: UUID!,
      $tipo: String!,
      $logradouro: String!,
      $numero: String!,
      $bairro: String!,
      $cep: String!,
      $cidade: String!,
      $estado: String!,
      $pais: String!,
      $observacoes: String
    ) {
      endereco_update(id: $id, data: {
        tipoLogradouroId: $tipoLogradouroId,
        tipoResidenciaId: $tipoResidenciaId,
        tipo: $tipo,
        logradouro: $logradouro,
        numero: $numero,
        bairro: $bairro,
        cep: $cep,
        cidade: $cidade,
        estado: $estado,
        pais: $pais,
        observacoes: $observacoes
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function updateEnderecoTipo(accessToken, data) {
  const mutation = `
    mutation AtualizarTipoEndereco($id: UUID!, $tipo: String!) {
      endereco_update(id: $id, data: { tipo: $tipo })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function updateEnderecosTipoPorUsuario(accessToken, data) {
  const mutation = `
    mutation AtualizarTiposEndereco($usuarioId: UUID!, $tipo: String!) {
      endereco_updateMany(where: { usuarioId: { eq: $usuarioId } }, data: { tipo: $tipo })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function deleteEndereco(accessToken, data) {
  const mutation = `
    mutation ExcluirEndereco($id: UUID!) {
      endereco_delete(id: $id)
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function insertCartaoCredito(accessToken, data) {
  const mutation = `
    mutation InserirCartaoCredito(
      $id: UUID!,
      $usuarioId: UUID!,
      $bandeiraId: UUID!,
      $numero: String!,
      $nomeImpresso: String!,
      $codigoSeguranca: String!,
      $dataValidade: Date!,
      $preferencial: Boolean!,
      $ativo: Boolean!
    ) {
      cartaoCredito_insert(data: {
        id: $id,
        usuarioId: $usuarioId,
        bandeiraId: $bandeiraId,
        numero: $numero,
        nomeImpresso: $nomeImpresso,
        codigoSeguranca: $codigoSeguranca,
        dataValidade: $dataValidade,
        preferencial: $preferencial,
        ativo: $ativo
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function updateCartaoAtivo(accessToken, data) {
  const mutation = `
    mutation AtualizarCartaoAtivo($id: UUID!, $ativo: Boolean!) {
      cartaoCredito_update(id: $id, data: { ativo: $ativo })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function updateCartaoPreferencial(accessToken, data) {
  const mutation = `
    mutation AtualizarCartaoPreferencial($id: UUID!, $preferencial: Boolean!) {
      cartaoCredito_update(id: $id, data: { preferencial: $preferencial })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function updateCartoesPreferencialPorUsuario(accessToken, data) {
  const mutation = `
    mutation AtualizarPreferencialCartoes($usuarioId: UUID!, $preferencial: Boolean!) {
      cartaoCredito_updateMany(where: { usuarioId: { eq: $usuarioId }, ativo: { eq: true } }, data: { preferencial: $preferencial })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function fetchUsuarioDados(accessToken, authId) {
  const query = `
    query UsuarioDados($authId: String!, $tipo: String!) {
      usuarios(where: { authId: { eq: $authId } }, limit: 1) {
        id
        nome
        cpf
        email
        genero
        dataNascimento
        telefones_on_usuario(limit: 1) {
          id
          ddd
          numero
          tipoId
          tipo { id nome }
        }
        enderecos_on_usuario(where: { tipo: { eq: $tipo } }, limit: 1) {
          id
          tipoLogradouroId
          tipoResidenciaId
          logradouro
          numero
          bairro
          cep
          cidade
          estado
          pais
          observacoes
        }
      }
    }
  `;

  const data = await executeGraphql(accessToken, query, { authId, tipo: "Principal" });
  return data?.usuarios?.[0] || null;
}

async function fetchUsuarioEnderecos(accessToken, authId) {
  const query = `
    query UsuarioEnderecos($authId: String!) {
      usuarios(where: { authId: { eq: $authId } }, limit: 1) {
        id
        enderecos_on_usuario {
          id
          tipo
          tipoLogradouroId
          tipoResidenciaId
          logradouro
          numero
          bairro
          cep
          cidade
          estado
          pais
          observacoes
        }
      }
    }
  `;

  const data = await executeGraphql(accessToken, query, { authId });
  return data?.usuarios?.[0] || null;
}

async function fetchUsuarioCartoes(accessToken, authId) {
  const query = `
      query UsuarioCartoes($authId: String!) {
        usuarios(where: { authId: { eq: $authId } }, limit: 1) {
          id
        cartaoCreditos_on_usuario(where: { ativo: { eq: true } }) {
          id
          numero
          nomeImpresso
          dataValidade
          ativo
          preferencial
          bandeiraId
          bandeira { id nome }
        }
      }
    }
  `;

  const data = await executeGraphql(accessToken, query, { authId });
  return data?.usuarios?.[0] || null;
}

async function fetchUsuarioEnderecoPorId(accessToken, usuarioId, enderecoId) {
  const query = `
      query UsuarioEnderecoPorId($usuarioId: UUID!, $enderecoId: UUID!) {
        usuarios(where: { id: { eq: $usuarioId } }, limit: 1) {
          id
          enderecos_on_usuario(where: { id: { eq: $enderecoId } }, limit: 1) {
            id
            cep
            cidade
            estado
          }
        }
      }
    `;
  const data = await executeGraphql(accessToken, query, { usuarioId, enderecoId });
  const usuario = data?.usuarios?.[0] || null;
  return usuario?.enderecos_on_usuario?.[0] || null;
}

async function enderecoJaFoiUsadoEmPedido(accessToken, usuarioId, enderecoId) {
  const query = `
      query EnderecoUsadoEmPedido($usuarioId: UUID!, $enderecoId: UUID!) {
        pedidos(
          where: {
            usuarioId: { eq: $usuarioId }
            enderecoEntregaId: { eq: $enderecoId }
          }
          limit: 1
        ) {
          id
        }
      }
    `;
  const data = await executeGraphql(accessToken, query, { usuarioId, enderecoId });
  return (data?.pedidos || []).length > 0;
}

async function fetchUsuarioCartoesPorIds(accessToken, usuarioId, cartaoIds) {
  const query = `
      query UsuarioCartoesPorIds($usuarioId: UUID!, $ids: [UUID!]) {
        usuarios(where: { id: { eq: $usuarioId } }, limit: 1) {
          id
          cartaoCreditos_on_usuario(where: { id: { in: $ids }, ativo: { eq: true } }) {
            id
            numero
            dataValidade
            ativo
            preferencial
          }
        }
      }
    `;
  const data = await executeGraphql(accessToken, query, { usuarioId, ids: cartaoIds });
  return data?.usuarios?.[0]?.cartaoCreditos_on_usuario || [];
}

async function fetchCuponsPorCliente(accessToken, usuarioId, tipos, statusNome) {
  const queryComStatus = `
        query CuponsCliente($usuarioId: UUID!, $tipos: [String!]!, $status: String!) {
          cupoms(
            where: {
              clienteId: { eq: $usuarioId }
              status: { nome: { eq: $status } }
              tipo: { nome: { in: $tipos } }
            }
          ) {
            id
            codigo
            valor
            validade
            tipo { nome }
            status { nome }
          }
        }
      `;

  const querySemStatus = `
        query CuponsClienteSemStatus($usuarioId: UUID!, $tipos: [String!]!) {
          cupoms(
            where: {
              clienteId: { eq: $usuarioId }
              tipo: { nome: { in: $tipos } }
            }
          ) {
            id
            codigo
            valor
            validade
            tipo { nome }
            status { nome }
          }
        }
      `;

  const dataComStatus = await executeGraphql(accessToken, queryComStatus, {
    usuarioId,
    tipos,
    status: statusNome || "ATIVO"
  });

  let encontrados = dataComStatus?.cupoms || [];

  if (!encontrados.length) {
    const dataSemStatus = await executeGraphql(accessToken, querySemStatus, {
      usuarioId,
      tipos
    });
    encontrados = dataSemStatus?.cupoms || [];
  }

  const normalize = (valor) =>
    `${valor || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const tiposNormalizados = new Set(tipos.map((t) => normalize(t)));

  const unique = new Map();
  encontrados.forEach((cupom) => {
    if (!cupom?.id || unique.has(cupom.id)) {
      return;
    }
    const statusOk = !cupom.status?.nome || normalize(cupom.status?.nome) === "ATIVO";
    const validade = cupom?.validade ? new Date(cupom.validade) : null;
    const naoExpirado =
      validade && !Number.isNaN(validade.getTime()) && validade.getTime() > Date.now();
    const tipoOk = tiposNormalizados.has(normalize(cupom.tipo?.nome));
    if (statusOk && tipoOk && naoExpirado) {
      unique.set(cupom.id, cupom);
    }
  });
  return Array.from(unique.values());
}

async function fetchCuponsPorClienteIds(accessToken, usuarioId, cupomIds) {
  const query = `
      query CuponsClientePorIds($usuarioId: UUID!, $ids: [UUID!]) {
        cupoms(where: { clienteId: { eq: $usuarioId }, id: { in: $ids } }) {
          id
          codigo
          valor
          validade
          tipo { nome }
          status { nome }
        }
      }
    `;
  const data = await executeGraphql(accessToken, query, { usuarioId, ids: cupomIds });
  return data?.cupoms || [];
}

async function fetchTodosCuponsPorCliente(accessToken, usuarioId) {
  const query = `
      query TodosCuponsCliente($usuarioId: UUID!) {
        cupoms(
          where: { clienteId: { eq: $usuarioId } }
          orderBy: [{ validade: ASC }]
        ) {
          id
          codigo
          valor
          validade
          tipo { nome }
          status { nome }
        }
      }
    `;
  const data = await executeGraphql(accessToken, query, { usuarioId });
  return data?.cupoms || [];
}

async function fetchUsuarioCartao(accessToken, authId, cartaoId) {
  const query = `
      query UsuarioCartao($authId: String!, $cartaoId: UUID!) {
        usuarios(where: { authId: { eq: $authId } }, limit: 1) {
        id
        cartaoCreditos_on_usuario(where: { id: { eq: $cartaoId } }, limit: 1) {
          id
          ativo
          preferencial
        }
      }
    }
  `;

  const data = await executeGraphql(accessToken, query, { authId, cartaoId });
  return data?.usuarios?.[0] || null;
}

async function fetchProdutosMetadata(accessToken) {
  const query = `
      query ProdutosMetadata {
        marcas { id nome }
        categorias { id nome }
        grupoPrecificacaos { id nome margemLucro }
    }
  `;
  return executeGraphql(accessToken, query, {});
}

async function fetchPedidoDetalhe(accessToken, pedidoId) {
  const query = `
      query PedidoDetalhe($id: UUID!) {
        pedido(id: $id) {
          id
          dataCriacao
          valorTotal
          valorFrete
          justificativaReprovacao
          status { nome }
          usuario { id nome }
          itemPedidos_on_pedido {
            quantidade
            precoAtual
            produto {
              id
              nome
              modelo
              imagemProdutos_on_produto(where: { capa: { eq: true } }, limit: 1) { url }
            }
          }
          pagamentos_on_pedido(orderBy: [{ dataPagamento: DESC }], limit: 1) {
            dataPagamento
            valorTotalPago
            cupomPromocional { codigo valor tipo { nome } }
            pagamentoCartaos_on_pagamento {
              valorParcela
              cartaoCredito { numero nomeImpresso dataValidade }
            }
            pagamentoCupomTrocas_on_pagamento {
              cupomTroca { codigo valor tipo { nome } }
            }
          }
        }
      }
    `;

  const data = await executeGraphql(accessToken, query, { id: pedidoId });
  return data?.pedido || null;
}

async function fetchPedidoStatus(accessToken, pedidoId) {
  const query = `
      query PedidoStatus($id: UUID!) {
        pedido(id: $id) {
          id
          status { nome }
        }
      }
    `;
  const data = await executeGraphql(accessToken, query, { id: pedidoId });
  return data?.pedido || null;
}

async function fetchPedidosPorUsuario(accessToken, usuarioId) {
  const query = `
      query PedidosPorUsuario($usuarioId: UUID!) {
        pedidos(
          where: {
            usuarioId: { eq: $usuarioId }
            status: { nome: { ne: "CARRINHO" } }
          }
          orderBy: [{ dataCriacao: DESC }]
        ) {
          id
          dataCriacao
          valorTotal
          valorFrete
          justificativaReprovacao
          status { nome }
          itemPedidos_on_pedido {
            quantidade
          }
          pagamentos_on_pedido(orderBy: [{ dataPagamento: DESC }], limit: 1) {
            cupomPromocional { codigo valor tipo { nome } }
          }
        }
      }
    `;
  const data = await executeGraphql(accessToken, query, { usuarioId });
  return data?.pedidos || [];
}

async function fetchFornecedores(accessToken) {
  const query = `
      query Fornecedores {
        fornecedors(orderBy: [{ nome: ASC }]) {
        id
        nome
        emailContato
        telefoneContato
      }
    }
  `;
  const data = await executeGraphql(accessToken, query, {});
  return data?.fornecedors || [];
}

async function insertFornecedor(accessToken, data) {
  const mutation = `
    mutation InserirFornecedor($nome: String!, $emailContato: String!, $telefoneContato: String!) {
      fornecedor_insert(data: {
        nome: $nome,
        emailContato: $emailContato,
        telefoneContato: $telefoneContato
      })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

async function fetchEntradaEstoques(accessToken) {
  const query = `
    query EntradasEstoque {
      entradaEstoques(orderBy: [{ dataEntrada: DESC }]) {
        id
        dataEntrada
        quantidade
        valorCusto
        fornecedor { id nome }
        produto { id nome modelo }
      }
    }
  `;
  const data = await executeGraphql(accessToken, query, {});
  return data?.entradaEstoques || [];
}

async function insertEntradaEstoque(accessToken, data) {
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
  await executeGraphql(accessToken, mutation, data);
}

async function fetchProdutosResumo(accessToken) {
  const query = `
    query ProdutosResumo {
      produtos(orderBy: [{ nome: ASC }], limit: 200) {
        id
        nome
        modelo
        status
      }
    }
  `;
  const data = await executeGraphql(accessToken, query, {});
  return data?.produtos || [];
}

async function fetchProdutosPopulares(accessToken) {
  const query = `
    query ProdutosPopulares {
      produtos(
        where: { _and: [
          { status: { eq: "ATIVO" } },
          { estoqueFisico: { gt: 0 } }
        ] },
        orderBy: [{ quantidadeVendida: DESC }],
        limit: 6
      ) {
        id
        codigoProduto
        nome
        modelo
        estoqueFisico
        quantidadeVendida
        marca { nome }
        grupoPrecificacao { margemLucro }
        produtoCategorias_on_produto {
          categoria { nome }
        }
        imagemProdutos_on_produto(where: { capa: { eq: true } }, limit: 1) {
          url
        }
        entradaEstoques_on_produto(orderBy: [{ valorCusto: DESC }], limit: 1) {
          valorCusto
        }
      }
    }
  `;
  const data = await executeGraphql(accessToken, query, {});
  return data?.produtos || [];
}

async function fetchProdutoEstoque(accessToken, produtoId) {
  const query = `
      query ProdutoEstoque($id: UUID!) {
        produto(id: $id) {
          id
          estoqueFisico
          estoqueReservado
          quantidadeVendida
          status
        }
      }
    `;
  const data = await executeGraphql(accessToken, query, { id: produtoId });
  return data?.produto || null;
}

async function fetchProdutosInventario(accessToken, ids) {
  const query = `
      query ProdutosInventario($ids: [UUID!]) {
        produtos(where: { id: { in: $ids } }) {
          id
          estoqueFisico
          estoqueReservado
          quantidadeVendida
          status
        }
      }
    `;
  const data = await executeGraphql(accessToken, query, { ids });
  return data?.produtos || [];
}

async function updateProdutoEstoque(accessToken, data) {
  const mutation = `
      mutation AtualizarEstoqueProduto($id: UUID!, $estoqueFisico: Int!) {
        produto_update(id: $id, data: { estoqueFisico: $estoqueFisico })
      }
    `;
  await executeGraphql(accessToken, mutation, data);
}

async function updateProdutoReservado(accessToken, data) {
  const mutation = `
      mutation AtualizarReservadoProduto($id: UUID!, $estoqueReservado: Int!) {
        produto_update(id: $id, data: { estoqueReservado: $estoqueReservado })
      }
    `;
  await executeGraphql(accessToken, mutation, data);
}

async function updateProdutoInventario(accessToken, data) {
  const mutation = `
      mutation AtualizarInventarioProduto(
        $id: UUID!,
        $estoqueFisico: Int!,
        $estoqueReservado: Int!,
        $quantidadeVendida: Int!
      ) {
        produto_update(id: $id, data: {
          estoqueFisico: $estoqueFisico,
          estoqueReservado: $estoqueReservado,
          quantidadeVendida: $quantidadeVendida
        })
      }
    `;
  await executeGraphql(accessToken, mutation, data);
}

function calcularNovaExpiracao(minutos) {
  return new Date(Date.now() + minutos * 60 * 1000).toISOString();
}

function calcularExpiracaoExtendida(atual, minutos) {
  const now = new Date();
  const base = atual ? new Date(atual) : now;
  const baseTime = base > now ? base : now;
  return new Date(baseTime.getTime() + minutos * 60 * 1000).toISOString();
}

function normalizeTexto(valor) {
  return `${valor || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function calcularFretePorCep(cep) {
  const digits = `${cep || ""}`.replace(/\D/g, "");
  if (digits.length !== 8) {
    return 0;
  }
  const numero = Number(digits);
  if (numero >= 1000000 && numero <= 19999999) {
    return 100;
  }
  return 150;
}

function validarLuhn(numero) {
  const digits = `${numero || ""}`.replace(/\D/g, "");
  if (!digits) {
    return false;
  }
  let soma = 0;
  let alternar = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alternar) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
    alternar = !alternar;
  }
  return soma % 10 === 0;
}

function cartaoExpirado(dataValidade) {
  if (!dataValidade) {
    return true;
  }
  const parsed = new Date(dataValidade);
  let ano = parsed.getFullYear();
  let mes = parsed.getMonth() + 1;
  if (Number.isNaN(parsed.getTime())) {
    const parts = `${dataValidade}`.split("-").map((p) => Number(p));
    if (parts.length >= 2) {
      [ano, mes] = parts;
    } else {
      return true;
    }
  }
  if (!ano || !mes) {
    return true;
  }
  const expiraEm = new Date(ano, mes, 0, 23, 59, 59, 999);
  return Date.now() > expiraEm.getTime();
}

function obterFinalCartao(numero) {
  const digits = `${numero || ""}`.replace(/\D/g, "");
  return digits.slice(-4).padStart(4, "0");
}

function normalizarCheckoutCartoesInput(body) {
  const cartoes = Array.isArray(body?.cartoes)
    ? body.cartoes
        .map((item) => ({
          cartaoId: item?.cartaoId || item?.id || null,
          valor: Number(item?.valor || 0)
        }))
        .filter((item) => item.cartaoId)
    : [];

  if (cartoes.length) {
    return cartoes;
  }

  const cartaoPrincipalId = body?.cartaoPrincipalId || null;
  const cartaoSecundarioId = body?.cartaoSecundarioId || null;
  const cartaoSecundarioValor = Number(body?.cartaoSecundarioValor || 0);
  const fallback = [];

  if (cartaoPrincipalId) {
    fallback.push({ cartaoId: cartaoPrincipalId, valor: Number.NaN });
  }
  if (cartaoSecundarioId && cartaoSecundarioId !== cartaoPrincipalId) {
    fallback.push({ cartaoId: cartaoSecundarioId, valor: cartaoSecundarioValor });
  }

  return fallback;
}

function distribuirPagamentoCartoes(restanteCartao, cartoesInput, cartoesEncontrados) {
  if (restanteCartao <= 0) {
    return { cartoesPagamento: [] };
  }

  if (!cartoesInput.length || !cartoesInput[0]?.cartaoId) {
    return { erro: "Cartao principal obrigatorio.", cartoesPagamento: [] };
  }

  const cartaoMap = new Map();
  (cartoesEncontrados || []).forEach((cartao) => {
    if (cartao?.id) {
      cartaoMap.set(cartao.id, cartao);
    }
  });

  const principalInput = cartoesInput[0];
  const cartaoPrincipal = cartaoMap.get(principalInput.cartaoId) || null;
  if (!cartaoPrincipal) {
    return { erro: "Cartao principal invalido.", cartoesPagamento: [] };
  }

  const maxExtras = restanteCartao >= 20 ? Math.max(Math.floor(restanteCartao / 10) - 1, 0) : 0;
  const usados = new Set([principalInput.cartaoId]);
  const extrasNormalizados = [];

  for (const item of cartoesInput.slice(1)) {
    if (!item?.cartaoId || usados.has(item.cartaoId)) {
      continue;
    }

    const cartao = cartaoMap.get(item.cartaoId);
    if (!cartao) {
      continue;
    }

    usados.add(item.cartaoId);
    extrasNormalizados.push({
      cartao,
      valor: Number(item.valor || 0)
    });

    if (extrasNormalizados.length >= maxExtras) {
      break;
    }
  }

  const extrasPagamento = [];
  let restanteDistribuir = Number(restanteCartao || 0);

  for (let index = 0; index < extrasNormalizados.length; index += 1) {
    const item = extrasNormalizados[index];
    const slotsDepois = extrasNormalizados.length - index - 1;
    const maxValor = restanteDistribuir - 10 * (slotsDepois + 1);

    if (maxValor < 10) {
      break;
    }

    let valor = Number.isFinite(item.valor) ? item.valor : 0;
    if (valor < 10) {
      valor = 10;
    }
    if (valor > maxValor) {
      valor = maxValor;
    }

    valor = Number(valor.toFixed(2));
    extrasPagamento.push({
      cartao: item.cartao,
      valor,
      principal: false
    });
    restanteDistribuir = Number((restanteDistribuir - valor).toFixed(2));
  }

  const principalValor = Number(Math.max(restanteDistribuir, 0).toFixed(2));
  const cartoesPagamento = [];

  if (principalValor > 0) {
    cartoesPagamento.push({
      cartao: cartaoPrincipal,
      valor: principalValor,
      principal: true
    });
  }

  extrasPagamento.forEach((item) => {
    if (item.valor > 0) {
      cartoesPagamento.push(item);
    }
  });

  return { cartoesPagamento };
}

function gerarCodigoCupom() {
  const numero = Math.floor(10000 + Math.random() * 90000);
  return `CUPOM-${numero}`;
}

function adicionarAno(dataBase) {
  const base = dataBase ? new Date(dataBase) : new Date();
  return new Date(base.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
}

function calcularPrecoProduto(produto) {
  const custo = Number(produto?.entradaEstoques_on_produto?.[0]?.valorCusto || 0);
  const margem = Number(produto?.grupoPrecificacao?.margemLucro || 0);
  if (!custo || !margem) {
    return 0;
  }
  return custo * margem;
}

async function fetchUsuarioIdByAuthId(accessToken, authId) {
  const query = `
    query UsuarioIdPorAuth($authId: String!) {
      usuarios(where: { authId: { eq: $authId } }, limit: 1) { id }
    }
  `;
  const data = await executeGraphql(accessToken, query, { authId });
  return data?.usuarios?.[0]?.id || null;
}

async function fetchUsuarioRanking(accessToken, usuarioId) {
  const query = `
    query UsuarioRanking($id: UUID!) {
      usuario(id: $id) { ranking }
    }
  `;
  const data = await executeGraphql(accessToken, query, { id: usuarioId });
  return Number(data?.usuario?.ranking || 0);
}

async function updateUsuarioRanking(accessToken, data) {
  const mutation = `
    mutation AtualizarUsuarioRanking($id: UUID!, $ranking: Int!) {
      usuario_update(id: $id, data: { ranking: $ranking })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

async function fetchCarrinhoPedido(accessToken, usuarioId) {
  const query = `
    query PedidoCarrinho($usuarioId: UUID!, $statusId: UUID!) {
      pedidos(where: { usuarioId: { eq: $usuarioId }, statusId: { eq: $statusId } }, limit: 1) {
        id
        valorTotal
        dataExpiracaoCarrinho
      }
    }
  `;
  const data = await executeGraphql(accessToken, query, {
    usuarioId,
    statusId: CARRINHO_STATUS_ID
  });
  return data?.pedidos?.[0] || null;
}

async function fetchProdutoPorCodigo(accessToken, codigo) {
  const query = `
    query ProdutoPorCodigo($codigo: String!) {
      produtos(where: { codigoProduto: { eq: $codigo } }, limit: 1) {
        id
        status
        estoqueFisico
        estoqueReservado
      }
    }
  `;
  const data = await executeGraphql(accessToken, query, { codigo });
  return data?.produtos?.[0] || null;
}

async function fetchItemPedido(accessToken, pedidoId, produtoId) {
  const query = `
    query ItemCarrinho($pedidoId: UUID!, $produtoId: UUID!) {
      itemPedidos(where: { pedidoId: { eq: $pedidoId }, produtoId: { eq: $produtoId } }, limit: 1) {
        produtoId
        quantidade
      }
    }
  `;
  const data = await executeGraphql(accessToken, query, { pedidoId, produtoId });
  return data?.itemPedidos?.[0] || null;
}

async function insertItemPedido(accessToken, data) {
  const mutation = `
    mutation InserirItemPedido(
      $pedidoId: UUID!,
      $produtoId: UUID!,
      $quantidade: Int!,
      $precoAtual: Float
    ) {
      itemPedido_insert(data: {
        pedidoId: $pedidoId,
        produtoId: $produtoId,
        quantidade: $quantidade,
        precoAtual: $precoAtual
      })
    }
  `;
  const payload = {
    pedidoId: data.pedidoId,
    produtoId: data.produtoId,
    quantidade: data.quantidade
  };
  if (Object.prototype.hasOwnProperty.call(data, "precoAtual")) {
    payload.precoAtual = data.precoAtual;
  }
  await executeGraphql(accessToken, mutation, payload);
}

async function updateItemPedidoQuantidade(accessToken, data) {
  const mutation = `
    mutation AtualizarItemPedido($pedidoId: UUID!, $produtoId: UUID!, $quantidade: Int!) {
      itemPedido_update(key: { pedidoId: $pedidoId, produtoId: $produtoId }, data: { quantidade: $quantidade })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

async function deleteItemPedido(accessToken, data) {
  const mutation = `
    mutation RemoverItemPedido($pedidoId: UUID!, $produtoId: UUID!) {
      itemPedido_delete(key: { pedidoId: $pedidoId, produtoId: $produtoId })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

async function zerarItensPedido(accessToken, pedidoId) {
  const mutation = `
    mutation ZerarItensPedido($pedidoId: UUID!) {
      itemPedido_updateMany(where: { pedidoId: { eq: $pedidoId } }, data: { quantidade: 0 })
    }
  `;
  await executeGraphql(accessToken, mutation, { pedidoId });
}

async function updatePedidoCarrinho(accessToken, data) {
  const mutation = `
    mutation AtualizarPedidoCarrinho(
      $id: UUID!,
      $valorTotal: Float!,
      $dataExpiracaoCarrinho: Timestamp
    ) {
      pedido_update(id: $id, data: {
        valorTotal: $valorTotal,
        dataExpiracaoCarrinho: $dataExpiracaoCarrinho
      })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

async function fetchCarrinhoDetalhes(accessToken, pedidoId) {
  const query = `
    query CarrinhoDetalhes($pedidoId: UUID!) {
      pedido(id: $pedidoId) {
        id
        valorTotal
        dataExpiracaoCarrinho
        itemPedidos_on_pedido {
          quantidade
          produto {
            id
            codigoProduto
            nome
            modelo
            marca { nome }
            grupoPrecificacao { margemLucro }
            produtoCategorias_on_produto { categoria { nome } }
            imagemProdutos_on_produto(where: { capa: { eq: true } }, limit: 1) { url }
            entradaEstoques_on_produto(orderBy: [{ valorCusto: DESC }], limit: 1) {
              valorCusto
            }
          }
        }
      }
    }
  `;
  const data = await executeGraphql(accessToken, query, { pedidoId });
  return data?.pedido || null;
}

async function fetchItensPedidoReservas(accessToken, pedidoId) {
  const query = `
    query ItensPedidoReservas($pedidoId: UUID!) {
      itemPedidos(where: { pedidoId: { eq: $pedidoId } }) {
        quantidade
        produto {
          id
          estoqueReservado
        }
      }
    }
  `;
  const data = await executeGraphql(accessToken, query, { pedidoId });
  return data?.itemPedidos || [];
}

function montarCarrinhoResposta(pedido) {
  if (!pedido) {
    return { itens: [], valorTotal: 0 };
  }

  const itens = (pedido.itemPedidos_on_pedido || []).map((item) => {
    const produto = item.produto || {};
    const precoUnitario = calcularPrecoProduto(produto);
    const quantidade = Number(item.quantidade || 0);
    return {
      produtoId: produto.id,
      codigoProduto: produto.codigoProduto,
      nome: produto.nome,
      modelo: produto.modelo,
      marca: produto?.marca?.nome || "",
      categorias: (produto?.produtoCategorias_on_produto || [])
        .map((c) => c?.categoria?.nome)
        .filter(Boolean),
      imagem: produto?.imagemProdutos_on_produto?.[0]?.url || "",
      precoUnitario,
      precoTotal: precoUnitario * quantidade,
      quantidade
    };
  });

  const valorTotal = itens.reduce((acc, item) => acc + item.precoTotal, 0);
  return { itens, valorTotal };
}

function carrinhoTemItensAtivos(itens) {
  return (itens || []).some((item) => Number(item?.quantidade || 0) > 0);
}

async function readicionarPedidoReprovadoNoCarrinho(accessToken, usuarioId, pedidoId) {
  const pedido = await fetchPedidoDetalhe(accessToken, pedidoId);
  if (!pedido || pedido?.usuario?.id !== usuarioId) {
    throw new Error("Pedido nao encontrado.");
  }

  const statusPedido = normalizeTexto(pedido?.status?.nome);
  if (statusPedido !== "REPROVADA") {
    throw new Error("Apenas pedidos reprovados podem ser readicionados ao carrinho.");
  }

  let carrinho = await fetchCarrinhoPedido(accessToken, usuarioId);
  if (!carrinho) {
    throw new Error("Carrinho nao encontrado.");
  }

  const expirou = await aplicarExpiracaoCarrinho(accessToken, carrinho);
  if (expirou) {
    carrinho = await fetchCarrinhoPedido(accessToken, usuarioId);
    if (!carrinho) {
      throw new Error("Carrinho nao encontrado.");
    }
  }

  const itensPedido = (pedido?.itemPedidos_on_pedido || []).filter(
    (item) => Number(item?.quantidade || 0) > 0 && item?.produto?.id
  );
  if (!itensPedido.length) {
    throw new Error("Esse pedido nao possui itens para readicionar.");
  }

  const produtosInventario = await fetchProdutosInventario(
    accessToken,
    itensPedido.map((item) => item.produto.id)
  );
  const produtosMap = new Map();
  produtosInventario.forEach((produto) => {
    if (produto?.id) {
      produtosMap.set(produto.id, produto);
    }
  });

  const resultado = {
    adicionados: [],
    parciais: [],
    indisponiveis: [],
    jaExistiam: []
  };

  let houveAlteracao = false;

  for (const itemPedido of itensPedido) {
    const produtoId = itemPedido.produto.id;
    const produto = produtosMap.get(produtoId);
    const nomeProduto = itemPedido?.produto?.nome || "Produto";
    const quantidadePedido = Math.max(0, Number(itemPedido?.quantidade || 0));

    if (!produto || (produto.status && produto.status !== "ATIVO")) {
      resultado.indisponiveis.push({
        produtoId,
        nome: nomeProduto,
        solicitado: quantidadePedido,
        adicionado: 0,
        motivo: "Produto indisponivel."
      });
      continue;
    }

    const itemCarrinho = await fetchItemPedido(accessToken, carrinho.id, produtoId);
    const quantidadeAtual = Number(itemCarrinho?.quantidade || 0);
    const quantidadeDesejada = Math.min(
      Math.max(quantidadeAtual, quantidadePedido),
      CARRINHO_MAX_QTD
    );
    const maxPermitido = Math.max(
      0,
      Number(produto.estoqueFisico || 0) - Number(produto.estoqueReservado || 0) + quantidadeAtual
    );
    const quantidadeFinal = Math.min(quantidadeDesejada, maxPermitido);
    const delta = Math.max(0, quantidadeFinal - quantidadeAtual);

    if (!itemCarrinho && quantidadeFinal > 0) {
      await insertItemPedido(accessToken, {
        pedidoId: carrinho.id,
        produtoId,
        quantidade: quantidadeFinal
      });
    } else if (itemCarrinho && delta !== 0) {
      await updateItemPedidoQuantidade(accessToken, {
        pedidoId: carrinho.id,
        produtoId,
        quantidade: quantidadeFinal
      });
    }

    if (delta !== 0) {
      const reservadoAtual = Number(produto.estoqueReservado || 0);
      const novoReservado = Math.max(0, reservadoAtual + delta);
      await updateProdutoReservado(accessToken, {
        id: produtoId,
        estoqueReservado: novoReservado
      });
      houveAlteracao = true;
    }

    if (delta <= 0 && quantidadeAtual >= quantidadePedido) {
      resultado.jaExistiam.push({
        produtoId,
        nome: nomeProduto,
        solicitado: quantidadePedido,
        adicionado: 0
      });
      continue;
    }

    if (delta <= 0) {
      resultado.indisponiveis.push({
        produtoId,
        nome: nomeProduto,
        solicitado: quantidadePedido,
        adicionado: 0,
        motivo: "Sem estoque disponivel no momento."
      });
      continue;
    }

    if (quantidadeFinal < quantidadePedido) {
      resultado.parciais.push({
        produtoId,
        nome: nomeProduto,
        solicitado: quantidadePedido,
        adicionado: delta
      });
      continue;
    }

    resultado.adicionados.push({
      produtoId,
      nome: nomeProduto,
      solicitado: quantidadePedido,
      adicionado: delta
    });
  }

  const detalhesCarrinho = await fetchCarrinhoDetalhes(accessToken, carrinho.id);
  const { itens, valorTotal } = montarCarrinhoResposta(detalhesCarrinho);
  const temItensAtivos = carrinhoTemItensAtivos(itens);
  const dataExpiracaoCarrinho = temItensAtivos
    ? houveAlteracao
      ? calcularNovaExpiracao(CARRINHO_EXPIRACAO_MIN)
      : carrinho.dataExpiracaoCarrinho
    : null;

  await updatePedidoCarrinho(accessToken, {
    id: carrinho.id,
    valorTotal,
    dataExpiracaoCarrinho
  });

  const partesMensagem = [];
  if (resultado.adicionados.length) {
    partesMensagem.push(`${resultado.adicionados.length} item(ns) retornaram ao carrinho.`);
  }
  if (resultado.parciais.length) {
    partesMensagem.push(`${resultado.parciais.length} item(ns) voltaram parcialmente por causa do estoque.`);
  }
  if (resultado.indisponiveis.length) {
    partesMensagem.push(`${resultado.indisponiveis.length} item(ns) nao puderam voltar ao carrinho.`);
  }
  if (resultado.jaExistiam.length) {
    partesMensagem.push(`${resultado.jaExistiam.length} item(ns) ja estavam no carrinho com a quantidade recuperada.`);
  }
  if (!partesMensagem.length) {
    partesMensagem.push("Nenhum item do pedido conseguiu voltar ao carrinho.");
  }

  return {
    ok: true,
    dataExpiracaoCarrinho,
    adicionados: resultado.adicionados,
    parciais: resultado.parciais,
    indisponiveis: resultado.indisponiveis,
    jaExistiam: resultado.jaExistiam,
    message: partesMensagem.join(" ")
  };
}

async function aplicarExpiracaoCarrinho(accessToken, pedido) {
  if (!pedido?.dataExpiracaoCarrinho) {
    return false;
  }
  const expiraEm = new Date(pedido.dataExpiracaoCarrinho).getTime();
  if (!expiraEm || Date.now() <= expiraEm) {
    return false;
  }

  const itens = await fetchItensPedidoReservas(accessToken, pedido.id);
  for (const item of itens) {
    const quantidade = Number(item.quantidade || 0);
    const produto = item.produto;
    if (quantidade > 0 && produto) {
      const reservadoAtual = Number(produto.estoqueReservado || 0);
      const novoReservado = Math.max(0, reservadoAtual - quantidade);
      await updateProdutoReservado(accessToken, { id: produto.id, estoqueReservado: novoReservado });
    }
  }

  await zerarItensPedido(accessToken, pedido.id);
  await updatePedidoCarrinho(accessToken, {
    id: pedido.id,
    valorTotal: 0,
    dataExpiracaoCarrinho: null
  });

  return true;
}

async function getMarcaId(accessToken, nome) {
  const query = `
    query MarcaPorNome($nome: String!) {
      marcas(where: { nome: { eq: $nome } }, limit: 1) { id }
    }
  `;
  const data = await executeGraphql(accessToken, query, { nome });
  return data?.marcas?.[0]?.id || null;
}

async function ensureMarca(accessToken, nome) {
  const existing = await getMarcaId(accessToken, nome);
  if (existing) {
    return existing;
  }

  const mutation = `
    mutation InserirMarca($nome: String!) {
      marca_insert(data: { nome: $nome })
    }
  `;
  await executeGraphql(accessToken, mutation, { nome });
  return getMarcaId(accessToken, nome);
}

async function getCategoriaId(accessToken, nome) {
  const query = `
    query CategoriaPorNome($nome: String!) {
      categorias(where: { nome: { eq: $nome } }, limit: 1) { id }
    }
  `;
  const data = await executeGraphql(accessToken, query, { nome });
  return data?.categorias?.[0]?.id || null;
}

async function ensureCategoria(accessToken, nome) {
  const existing = await getCategoriaId(accessToken, nome);
  if (existing) {
    return existing;
  }

  const mutation = `
    mutation InserirCategoria($nome: String!) {
      categoria_insert(data: { nome: $nome })
    }
  `;
  await executeGraphql(accessToken, mutation, { nome });
  return getCategoriaId(accessToken, nome);
}

async function insertProduto(accessToken, data) {
  const mutation = `
    mutation InserirProduto(
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
}

async function updateProduto(accessToken, data) {
  const mutation = `
    mutation AtualizarProduto(
      $id: UUID!,
      $nome: String!,
      $marcaId: UUID!,
      $modelo: String!,
      $descricaoTecnica: String!,
      $especificacoesTecnicas: String!,
      $garantia: String!,
      $grupoPrecificacaoId: UUID!
    ) {
      produto_update(id: $id, data: {
        nome: $nome,
        marcaId: $marcaId,
        modelo: $modelo,
        descricaoTecnica: $descricaoTecnica,
        especificacoesTecnicas: $especificacoesTecnicas,
        garantia: $garantia,
        grupoPrecificacaoId: $grupoPrecificacaoId
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function updateProdutoStatus(accessToken, data) {
  const mutation = `
    mutation AtualizarStatusProduto(
      $id: UUID!,
      $status: String!,
      $motivoInativacao: String,
      $categoriaInativacao: String,
      $justificativaAtivacao: String,
      $categoriaAtivacao: String
    ) {
      produto_update(id: $id, data: {
        status: $status,
        motivoInativacao: $motivoInativacao,
        categoriaInativacao: $categoriaInativacao,
        justificativaAtivacao: $justificativaAtivacao,
        categoriaAtivacao: $categoriaAtivacao
      })
    }
  `;

  await executeGraphql(accessToken, mutation, data);
}

async function insertProdutoCategoria(accessToken, data) {
  const mutation = `
    mutation InserirProdutoCategoria($produtoId: UUID!, $categoriaId: UUID!) {
      produtoCategoria_insert(data: { produtoId: $produtoId, categoriaId: $categoriaId })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

async function deleteProdutoCategorias(accessToken, data) {
  const mutation = `
    mutation RemoverCategoriasProduto($produtoId: UUID!) {
      produtoCategoria_deleteMany(where: { produtoId: { eq: $produtoId } })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

async function insertImagemProduto(accessToken, data) {
  const mutation = `
    mutation InserirImagemProduto($produtoId: UUID!, $url: String!, $capa: Boolean!) {
      imagemProduto_insert(data: { produtoId: $produtoId, url: $url, capa: $capa })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

async function deleteImagemProdutos(accessToken, data) {
  const mutation = `
    mutation RemoverImagensProduto($produtoId: UUID!) {
      imagemProduto_deleteMany(where: { produtoId: { eq: $produtoId } })
    }
  `;
  await executeGraphql(accessToken, mutation, data);
}

function gerarNumeroProduto() {
  return Math.floor(10000 + Math.random() * 90000);
}

function gerarCodigoProduto(numero) {
  return `PROD-${numero}`;
}

function gerarCodigoBarras(numero) {
  return Number(numero).toString(2);
}

async function gerarCodigoProdutoUnico(accessToken) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const numero = gerarNumeroProduto();
    const codigoProduto = gerarCodigoProduto(numero);
    const codigoBarras = gerarCodigoBarras(numero);

    const query = `
      query ProdutoPorCodigo($codigoProduto: String!, $codigoBarras: String!) {
        byCodigoProduto: produtos(where: { codigoProduto: { eq: $codigoProduto } }, limit: 1) { id }
        byCodigoBarras: produtos(where: { codigoBarras: { eq: $codigoBarras } }, limit: 1) { id }
      }
    `;

    const data = await executeGraphql(accessToken, query, { codigoProduto, codigoBarras });
    const existsProduto = (data?.byCodigoProduto || []).length > 0;
    const existsBarras = (data?.byCodigoBarras || []).length > 0;
    if (!existsProduto && !existsBarras) {
      return { codigoProduto, codigoBarras };
    }
  }

  const fallback = gerarNumeroProduto();
  return {
    codigoProduto: gerarCodigoProduto(fallback),
    codigoBarras: gerarCodigoBarras(fallback)
  };
}

function buildProdutosQuery({ search, status, marcaId, sortField, sortOrder }) {
  const whereParts = [];

  if (status) {
    whereParts.push(`status: { eq: "${escapeGqlString(status)}" }`);
  }

  if (marcaId) {
    whereParts.push(`marcaId: { eq: "${escapeGqlString(marcaId)}" }`);
  }

  const searchValue = (search || "").trim();
  if (searchValue) {
    const escaped = escapeGqlString(searchValue);
    whereParts.push(`_or: [{ nome: { contains: "${escaped}" } }, { modelo: { contains: "${escaped}" } }]`);
  }

  const whereClause =
    whereParts.length === 0
      ? ""
      : whereParts.length === 1
        ? `where: { ${whereParts[0]} }`
        : `where: { _and: [${whereParts.join(", ")}] }`;

  const orderClause = sortField && sortOrder ? `orderBy: [{ ${sortField}: ${sortOrder} }]` : "";
  const args = [whereClause, orderClause, "limit: 500"].filter(Boolean).join(", ");

  return `
    query ListarProdutos {
      produtos(${args}) {
        id
        nome
        modelo
        status
        estoqueFisico
        estoqueReservado
        quantidadeVendida
        motivoInativacao
        categoriaInativacao
        justificativaAtivacao
        categoriaAtivacao
        marca { id nome }
        produtoCategorias_on_produto {
          categoria { id nome }
        }
        imagemProdutos_on_produto(where: { capa: { eq: true } }, limit: 1) {
          url
          capa
        }
      }
    }
  `;
}

async function fetchProdutoDetalhe(accessToken, produtoId) {
  const query = `
    query ProdutoDetalhe($id: UUID!) {
      produto(id: $id) {
        id
        nome
        modelo
        garantia
        descricaoTecnica
        especificacoesTecnicas
        codigoProduto
        codigoBarras
        status
        motivoInativacao
        categoriaInativacao
        justificativaAtivacao
        categoriaAtivacao
        estoqueFisico
        estoqueReservado
        quantidadeVendida
        marca { id nome }
        grupoPrecificacao { id nome margemLucro }
        produtoCategorias_on_produto {
          categoria { id nome }
        }
        imagemProdutos_on_produto(orderBy: [{ capa: DESC }]) {
          id
          url
          capa
        }
      }
    }
  `;

  const data = await executeGraphql(accessToken, query, { id: produtoId });
  return data?.produto || null;
}

function generateCodigoUser() {
  const now = Date.now().toString();
  return `USER-${now.slice(-6)}`;
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end(JSON.stringify(data));
}

function buildClientesQuery({ search, statusFilters, generoFilters, sortField, sortOrder }) {
  const whereParts = [];

  if (statusFilters.length) {
    const values = statusFilters.map((value) => `"${escapeGqlString(value)}"`).join(", ");
    whereParts.push(`status: { nome: { in: [${values}] } }`);
  }

  if (generoFilters.length) {
    const values = generoFilters.map((value) => `"${escapeGqlString(value)}"`).join(", ");
    whereParts.push(`genero: { in: [${values}] }`);
  }

  const searchValue = (search || "").trim();
  if (searchValue) {
    const escaped = escapeGqlString(searchValue);
    const startsWithDigit = /^\d/.test(searchValue);
    const hasAt = searchValue.includes("@");

    if (startsWithDigit) {
      whereParts.push(`cpf: { contains: "${escaped}" }`);
    } else if (hasAt) {
      whereParts.push(`email: { contains: "${escaped}" }`);
    } else {
      whereParts.push(`_or: [{ nome: { contains: "${escaped}" } }, { email: { contains: "${escaped}" } }]`);
    }
  }

  const whereClause =
    whereParts.length === 0
      ? ""
      : whereParts.length === 1
        ? `where: { ${whereParts[0]} }`
        : `where: { _and: [${whereParts.join(", ")}] }`;

  const orderClause = sortField && sortOrder ? `orderBy: [{ ${sortField}: ${sortOrder} }]` : "";
  const args = [whereClause, orderClause, "limit: 500"].filter(Boolean).join(", ");

  return `
      query ListarClientes {
        usuarios(${args}) {
          id
        nome
        cpf
        email
        genero
        ranking
        dataNascimento
        status { nome }
      }
      }
    `;
}

function buildPedidosQuery({ search, statusFilters, sortField, sortOrder }) {
  const whereParts = [];

  const filtrosStatus = statusFilters.filter((status) => status !== "CARRINHO");
  if (filtrosStatus.length) {
    const values = filtrosStatus.map((value) => `"${escapeGqlString(value)}"`).join(", ");
    whereParts.push(`status: { nome: { in: [${values}] } }`);
  } else {
    whereParts.push(`status: { nome: { ne: "CARRINHO" } }`);
  }

  const searchValue = (search || "").trim();
  if (searchValue) {
    const escaped = escapeGqlString(searchValue);
    whereParts.push(`usuario: { nome: { contains: "${escaped}" } }`);
  }

  const whereClause =
    whereParts.length === 0
      ? ""
      : whereParts.length === 1
        ? `where: { ${whereParts[0]} }`
        : `where: { _and: [${whereParts.join(", ")}] }`;

  let orderClause = "";
  if (sortField && sortOrder) {
    if (sortField === "cliente") {
      orderClause = `orderBy: [{ usuario: { nome: ${sortOrder} } }]`;
    } else {
      orderClause = `orderBy: [{ ${sortField}: ${sortOrder} }]`;
    }
  }

  const args = [whereClause, orderClause, "limit: 500"].filter(Boolean).join(", ");

  return `
      query ListarPedidos {
        pedidos(${args}) {
          id
          dataCriacao
          valorTotal
          valorFrete
          status { nome }
          usuario { nome }
          itemPedidos_on_pedido { quantidade }
          pagamentos_on_pedido(orderBy: [{ dataPagamento: DESC }], limit: 1) {
            cupomPromocional { id valor tipo { nome } }
          }
        }
      }
    `;
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/public-config") {
    sendJson(res, 200, buildFirebasePublicConfig());
    return;
  }

  if (
    url.pathname.startsWith("/api/admin/") ||
    url.pathname === "/api/cloudinary/config" ||
    url.pathname === "/api/cloudinary/signature"
  ) {
    try {
      await requireAdminContext(req);
    } catch (error) {
      sendJson(res, error?.statusCode || 500, {
        error: error?.message || "Erro ao validar acesso administrativo."
      });
      return;
    }
  }

  if (req.method === "GET" && url.pathname === "/api/cadastro/metadata") {
    try {
      const accessToken = await getAccessToken();
      const data = await fetchCadastroMetadata(accessToken);
      sendJson(res, 200, data);
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao buscar metadata." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/usuario/perfil") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const query = `
        query UsuarioPerfil($authId: String!) {
          usuarios(where: { authId: { eq: $authId } }, limit: 1) {
            nome
          }
        }
      `;

      const data = await executeGraphql(accessToken, query, { authId });
      const usuario = data?.usuarios?.[0] || null;
      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      sendJson(res, 200, { nome: usuario.nome });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao buscar perfil." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/usuario/dados") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuario = await fetchUsuarioDados(accessToken, authId);

      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const telefone = usuario?.telefones_on_usuario?.[0] || null;
      const endereco = usuario?.enderecos_on_usuario?.[0] || null;

      sendJson(res, 200, {
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          cpf: usuario.cpf,
          email: usuario.email,
          genero: usuario.genero,
          dataNascimento: usuario.dataNascimento
        },
        telefone: telefone
          ? {
              id: telefone.id,
              tipoId: telefone.tipo?.id || telefone.tipoId || "",
              ddd: telefone.ddd,
              numero: telefone.numero
            }
          : null,
        endereco: endereco
          ? {
              id: endereco.id,
              tipoLogradouroId: endereco.tipoLogradouroId,
              tipoResidenciaId: endereco.tipoResidenciaId,
              logradouro: endereco.logradouro,
              numero: endereco.numero,
              bairro: endereco.bairro,
              cep: endereco.cep,
              cidade: endereco.cidade,
              estado: endereco.estado,
              pais: endereco.pais,
              observacoes: endereco.observacoes
            }
          : null
      });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao buscar dados do usuario." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/usuario/dados") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const usuario = body.usuario || {};
      const telefone = body.telefone || {};
      const endereco = body.endereco || {};

      if (!usuario.nome || !usuario.genero || !usuario.dataNascimento) {
        sendJson(res, 400, { error: "Dados cadastrais incompletos." });
        return;
      }

      if (!telefone.tipoId || !telefone.ddd || !telefone.numero) {
        sendJson(res, 400, { error: "Dados de telefone incompletos." });
        return;
      }

      if (
        !endereco.tipoLogradouroId ||
        !endereco.tipoResidenciaId ||
        !endereco.logradouro ||
        !endereco.numero ||
        !endereco.bairro ||
        !endereco.cep ||
        !endereco.cidade ||
        !endereco.estado ||
        !endereco.pais
      ) {
        sendJson(res, 400, { error: "Dados de endereco incompletos." });
        return;
      }

      if (!cepRegex.test(endereco.cep)) {
        sendJson(res, 400, { error: "CEP invalido. Use o formato 00000-000." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();

      const usuarioExistente = await fetchUsuarioDados(accessToken, authId);
      if (!usuarioExistente) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      await updateUsuario(accessToken, {
        id: usuarioExistente.id,
        nome: usuario.nome,
        genero: usuario.genero,
        dataNascimento: usuario.dataNascimento
      });

      const telefoneExistenteId = usuarioExistente?.telefones_on_usuario?.[0]?.id || null;
      if (telefoneExistenteId) {
        await updateTelefone(accessToken, {
          id: telefoneExistenteId,
          tipoId: telefone.tipoId,
          ddd: telefone.ddd,
          numero: telefone.numero
        });
      } else {
        await insertTelefone(accessToken, {
          id: crypto.randomUUID(),
          usuarioId: usuarioExistente.id,
          tipoId: telefone.tipoId,
          ddd: telefone.ddd,
          numero: telefone.numero
        });
      }

      const enderecoExistenteId = usuarioExistente?.enderecos_on_usuario?.[0]?.id || null;
      const enderecoPayload = {
        tipoLogradouroId: endereco.tipoLogradouroId,
        tipoResidenciaId: endereco.tipoResidenciaId,
        tipo: "Principal",
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        bairro: endereco.bairro,
        cep: endereco.cep,
        cidade: endereco.cidade,
        estado: endereco.estado,
        pais: endereco.pais,
        observacoes: endereco.observacoes ? endereco.observacoes : null
      };

      if (enderecoExistenteId) {
        await updateEndereco(accessToken, {
          id: enderecoExistenteId,
          ...enderecoPayload
        });
      } else {
        await insertEndereco(accessToken, {
          id: crypto.randomUUID(),
          usuarioId: usuarioExistente.id,
          ...enderecoPayload
        });
      }

      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao atualizar dados." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/usuario/enderecos") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuario = await fetchUsuarioEnderecos(accessToken, authId);

      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      sendJson(res, 200, { enderecos: usuario.enderecos_on_usuario || [] });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao buscar enderecos." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/usuario/enderecos") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const endereco = body.endereco || {};
      const principal = Boolean(body.principal);

      if (
        !endereco.tipoLogradouroId ||
        !endereco.tipoResidenciaId ||
        !endereco.logradouro ||
        !endereco.numero ||
        !endereco.bairro ||
        !endereco.cep ||
        !endereco.cidade ||
        !endereco.estado ||
        !endereco.pais
      ) {
        sendJson(res, 400, { error: "Dados de endereco incompletos." });
        return;
      }

      if (!cepRegex.test(endereco.cep)) {
        sendJson(res, 400, { error: "CEP invalido. Use o formato 00000-000." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuario = await fetchUsuarioEnderecos(accessToken, authId);

      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      if (principal) {
        await updateEnderecosTipoPorUsuario(accessToken, {
          usuarioId: usuario.id,
          tipo: TIPO_ENDERECO_SECUNDARIO
        });
      }

      const enderecoId = crypto.randomUUID();
      await insertEndereco(accessToken, {
        id: enderecoId,
        usuarioId: usuario.id,
        tipoLogradouroId: endereco.tipoLogradouroId,
        tipoResidenciaId: endereco.tipoResidenciaId,
        tipo: principal ? TIPO_ENDERECO_PRINCIPAL : TIPO_ENDERECO_SECUNDARIO,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        bairro: endereco.bairro,
        cep: endereco.cep,
        cidade: endereco.cidade,
        estado: endereco.estado,
        pais: endereco.pais,
        observacoes: endereco.observacoes ? endereco.observacoes : null
      });

      sendJson(res, 201, { id: enderecoId });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao criar endereco." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/usuario/enderecos/atualizar") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const enderecoId = body.id;
      const endereco = body.endereco || {};
      const principal = Boolean(body.principal);

      if (!enderecoId) {
        sendJson(res, 400, { error: "Endereco invalido." });
        return;
      }

      if (
        !endereco.tipoLogradouroId ||
        !endereco.tipoResidenciaId ||
        !endereco.logradouro ||
        !endereco.numero ||
        !endereco.bairro ||
        !endereco.cep ||
        !endereco.cidade ||
        !endereco.estado ||
        !endereco.pais
      ) {
        sendJson(res, 400, { error: "Dados de endereco incompletos." });
        return;
      }

      if (!cepRegex.test(endereco.cep)) {
        sendJson(res, 400, { error: "CEP invalido. Use o formato 00000-000." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuario = await fetchUsuarioEnderecos(accessToken, authId);

      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const enderecoExistente = (usuario.enderecos_on_usuario || []).find(
        (item) => item.id === enderecoId
      );

      if (!enderecoExistente) {
        sendJson(res, 404, { error: "Endereco nao encontrado." });
        return;
      }

      if (principal) {
        await updateEnderecosTipoPorUsuario(accessToken, {
          usuarioId: usuario.id,
          tipo: TIPO_ENDERECO_SECUNDARIO
        });
      }

      const tipoAtual = principal
        ? TIPO_ENDERECO_PRINCIPAL
        : enderecoExistente.tipo || TIPO_ENDERECO_SECUNDARIO;

      await updateEndereco(accessToken, {
        id: enderecoId,
        tipoLogradouroId: endereco.tipoLogradouroId,
        tipoResidenciaId: endereco.tipoResidenciaId,
        tipo: tipoAtual,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        bairro: endereco.bairro,
        cep: endereco.cep,
        cidade: endereco.cidade,
        estado: endereco.estado,
        pais: endereco.pais,
        observacoes: endereco.observacoes ? endereco.observacoes : null
      });

      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao atualizar endereco." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/usuario/enderecos/principal") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const enderecoId = body.id;

      if (!enderecoId) {
        sendJson(res, 400, { error: "Endereco invalido." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuario = await fetchUsuarioEnderecos(accessToken, authId);

      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const enderecoExistente = (usuario.enderecos_on_usuario || []).find(
        (item) => item.id === enderecoId
      );

      if (!enderecoExistente) {
        sendJson(res, 404, { error: "Endereco nao encontrado." });
        return;
      }

      await updateEnderecosTipoPorUsuario(accessToken, {
        usuarioId: usuario.id,
        tipo: TIPO_ENDERECO_SECUNDARIO
      });

      await updateEnderecoTipo(accessToken, {
        id: enderecoId,
        tipo: TIPO_ENDERECO_PRINCIPAL
      });

      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao definir endereco residencial." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/usuario/enderecos/excluir") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const enderecoId = body.id;

      if (!enderecoId) {
        sendJson(res, 400, { error: "Endereco invalido." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuario = await fetchUsuarioEnderecos(accessToken, authId);

      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const enderecoExistente = (usuario.enderecos_on_usuario || []).find(
        (item) => item.id === enderecoId
      );

      if (!enderecoExistente) {
        sendJson(res, 404, { error: "Endereco nao encontrado." });
        return;
      }

      if (enderecoExistente.tipo === TIPO_ENDERECO_PRINCIPAL) {
        sendJson(res, 400, { error: "Nao e permitido excluir o endereco residencial." });
        return;
      }

      const enderecoEmUso = await enderecoJaFoiUsadoEmPedido(
        accessToken,
        usuario.id,
        enderecoId
      );
      if (enderecoEmUso) {
        sendJson(res, 400, {
          error: "Nao e permitido excluir um endereco que ja foi utilizado em um pedido."
        });
        return;
      }

      await deleteEndereco(accessToken, { id: enderecoId });
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao excluir endereco." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/usuario/cartoes") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuario = await fetchUsuarioCartoes(accessToken, authId);

      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      sendJson(res, 200, { cartoes: usuario.cartaoCreditos_on_usuario || [] });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao buscar cartoes." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/usuario/cartoes") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const cartao = body.cartao || {};

      if (!cartao.bandeiraId || !cartao.numero || !cartao.nomeImpresso || !cartao.codigoSeguranca || !cartao.dataValidade) {
        sendJson(res, 400, { error: "Dados do cartao incompletos." });
        return;
      }

      if (!/^\d{13,16}$/.test(cartao.numero)) {
        sendJson(res, 400, { error: "Numero do cartao invalido. Use entre 13 e 16 digitos." });
        return;
      }

      if (!/^\d{3,4}$/.test(cartao.codigoSeguranca)) {
        sendJson(res, 400, { error: "CVV invalido. Use 3 ou 4 digitos." });
        return;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(cartao.dataValidade)) {
        sendJson(res, 400, { error: "Data de validade invalida." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuario = await fetchUsuarioCartoes(accessToken, authId);

      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const cartoesAtivos = usuario.cartaoCreditos_on_usuario || [];
      const isPreferencial = cartoesAtivos.length === 0;

      const cartaoId = crypto.randomUUID();
      await insertCartaoCredito(accessToken, {
        id: cartaoId,
        usuarioId: usuario.id,
        bandeiraId: cartao.bandeiraId,
        numero: cartao.numero,
        nomeImpresso: cartao.nomeImpresso,
        codigoSeguranca: cartao.codigoSeguranca,
        dataValidade: cartao.dataValidade,
        preferencial: isPreferencial,
        ativo: true
      });

      sendJson(res, 201, { id: cartaoId });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao cadastrar cartao." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/usuario/cartoes/inativar") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const cartaoId = body.id;

      if (!cartaoId) {
        sendJson(res, 400, { error: "Cartao invalido." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuario = await fetchUsuarioCartao(accessToken, authId, cartaoId);

      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const cartao = (usuario.cartaoCreditos_on_usuario || [])[0];
      if (!cartao) {
        sendJson(res, 404, { error: "Cartao nao encontrado." });
        return;
      }

      await updateCartaoAtivo(accessToken, { id: cartaoId, ativo: false });

      if (cartao.preferencial) {
        const usuarioCartoes = await fetchUsuarioCartoes(accessToken, authId);
        const ativos = (usuarioCartoes?.cartaoCreditos_on_usuario || []).filter(
          (item) => item.id !== cartaoId
        );

        if (ativos.length > 0) {
          await updateCartoesPreferencialPorUsuario(accessToken, {
            usuarioId: usuarioCartoes.id,
            preferencial: false
          });
          await updateCartaoPreferencial(accessToken, {
            id: ativos[0].id,
            preferencial: true
          });
        }
      }

      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao excluir cartao." });
    }
    return;
  }

    if (req.method === "POST" && url.pathname === "/api/usuario/cartoes/preferencial") {
      try {
        const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const cartaoId = body.id;

      if (!cartaoId) {
        sendJson(res, 400, { error: "Cartao invalido." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuario = await fetchUsuarioCartao(accessToken, authId, cartaoId);

      if (!usuario) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const cartao = (usuario.cartaoCreditos_on_usuario || [])[0];
      if (!cartao || cartao.ativo === false) {
        sendJson(res, 404, { error: "Cartao nao encontrado." });
        return;
      }

      await updateCartoesPreferencialPorUsuario(accessToken, {
        usuarioId: usuario.id,
        preferencial: false
      });

      await updateCartaoPreferencial(accessToken, {
        id: cartaoId,
        preferencial: true
      });

      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao definir cartao preferencial." });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/usuario/cupons") {
      try {
        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length)
          : "";

        if (!idToken) {
          sendJson(res, 400, { error: "idToken ausente." });
          return;
        }

        const authId = await verifyIdToken(idToken);
        const accessToken = await getAccessToken();
        const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
        if (!usuarioId) {
          sendJson(res, 404, { error: "Usuario nao encontrado." });
          return;
        }

        const promoTipos = ["DESCONTO", "FRETE GRATIS", "FRETE GRÁTIS"];
        const trocaTipos = ["TROCA", "SOBRA"];

        const [promocionais, troca, todos] = await Promise.all([
          fetchCuponsPorCliente(accessToken, usuarioId, promoTipos, "ATIVO"),
          fetchCuponsPorCliente(accessToken, usuarioId, trocaTipos, "ATIVO"),
          fetchTodosCuponsPorCliente(accessToken, usuarioId)
        ]);

        sendJson(res, 200, { promocionais, troca, todos });
      } catch (error) {
        sendJson(res, 500, { error: error?.message || "Erro ao buscar cupons." });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/usuario/pedidos") {
      try {
        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length)
          : "";

        if (!idToken) {
          sendJson(res, 400, { error: "idToken ausente." });
          return;
        }

        const authId = await verifyIdToken(idToken);
        const accessToken = await getAccessToken();
        const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
        if (!usuarioId) {
          sendJson(res, 404, { error: "Usuario nao encontrado." });
          return;
        }

        const pedidos = await fetchPedidosPorUsuario(accessToken, usuarioId);
        sendJson(res, 200, { pedidos });
      } catch (error) {
        sendJson(res, 500, { error: error?.message || "Erro ao buscar pedidos." });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/usuario/pedidos/detalhe") {
      try {
        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length)
          : "";
        const pedidoId = url.searchParams.get("id");

        if (!idToken) {
          sendJson(res, 400, { error: "idToken ausente." });
          return;
        }

        if (!pedidoId) {
          sendJson(res, 400, { error: "Pedido invalido." });
          return;
        }

        const authId = await verifyIdToken(idToken);
        const accessToken = await getAccessToken();
        const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
        if (!usuarioId) {
          sendJson(res, 404, { error: "Usuario nao encontrado." });
          return;
        }

        const pedido = await fetchPedidoDetalhe(accessToken, pedidoId);
        if (!pedido || pedido?.status?.nome === "CARRINHO" || pedido?.usuario?.id !== usuarioId) {
          sendJson(res, 404, { error: "Pedido nao encontrado." });
          return;
        }

        sendJson(res, 200, { pedido });
      } catch (error) {
        sendJson(res, 500, { error: error?.message || "Erro ao carregar pedido." });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/usuario/pedidos/readicionar-carrinho") {
      try {
        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length)
          : "";
        if (!idToken) {
          sendJson(res, 400, { error: "idToken ausente." });
          return;
        }

        const rawBody = await readBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const pedidoId = body.id || body.pedidoId;

        if (!pedidoId) {
          sendJson(res, 400, { error: "Pedido invalido." });
          return;
        }

        const authId = await verifyIdToken(idToken);
        const accessToken = await getAccessToken();
        const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
        if (!usuarioId) {
          sendJson(res, 404, { error: "Usuario nao encontrado." });
          return;
        }

        const resultado = await readicionarPedidoReprovadoNoCarrinho(
          accessToken,
          usuarioId,
          pedidoId
        );
        sendJson(res, 200, resultado);
      } catch (error) {
        const message = error?.message || "Erro ao readicionar pedido ao carrinho.";
        const statusCode =
          message === "Pedido nao encontrado." ||
          message === "Apenas pedidos reprovados podem ser readicionados ao carrinho." ||
          message === "Carrinho nao encontrado." ||
          message === "Esse pedido nao possui itens para readicionar."
            ? 400
            : 500;
        sendJson(res, statusCode, { error: message });
      }
      return;
    }

  if (req.method === "GET" && url.pathname === "/api/cloudinary/config") {
    try {
        const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      await verifyIdToken(idToken);
      ensureCloudinaryConfig();
      sendJson(res, 200, {
        cloudName: cloudinaryCloudName,
        apiKey: cloudinaryApiKey,
        uploadPreset: cloudinaryUploadPreset || null
      });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar Cloudinary." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/cloudinary/signature") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      await verifyIdToken(idToken);
      ensureCloudinaryConfig();

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const timestamp = body.timestamp || Math.floor(Date.now() / 1000);
      const params = typeof body.params === "object" && body.params ? { ...body.params } : {};
      if (!params.timestamp) {
        params.timestamp = timestamp;
      }
      if (cloudinaryUploadPreset && !params.upload_preset) {
        params.upload_preset = cloudinaryUploadPreset;
      }

      const signature = buildCloudinarySignature(params);

      sendJson(res, 200, {
        signature,
        timestamp: params.timestamp,
        apiKey: cloudinaryApiKey,
        cloudName: cloudinaryCloudName,
        uploadPreset: cloudinaryUploadPreset || null
      });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao assinar upload." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/produtos/metadata") {
    try {
      const accessToken = await getAccessToken();
      const data = await fetchProdutosMetadata(accessToken);
      sendJson(res, 200, data);
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar metadata." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/produtos") {
    try {
      const search = url.searchParams.get("q") || "";
      const status = (url.searchParams.get("status") || "").trim().toUpperCase();
      const marcaId = url.searchParams.get("marcaId") || "";
      const categoriaId = url.searchParams.get("categoriaId") || "";
      const sortField = url.searchParams.get("sortField") || "";
      const sortOrder = (url.searchParams.get("sortOrder") || "").toUpperCase();

      const allowedStatus = new Set(["ATIVO", "INATIVO"]);
      const allowedSortFields = new Set(["nome", "estoqueFisico", "quantidadeVendida"]);
      const allowedSortOrders = new Set(["ASC", "DESC"]);

      const accessToken = await getAccessToken();
      const query = buildProdutosQuery({
        search,
        status: allowedStatus.has(status) ? status : "",
        marcaId,
        sortField: allowedSortFields.has(sortField) ? sortField : "",
        sortOrder: allowedSortOrders.has(sortOrder) ? sortOrder : ""
      });

      const data = await executeGraphql(accessToken, query, {});
      let produtos = data?.produtos || [];

      if (categoriaId) {
        produtos = produtos.filter((produto) =>
          (produto?.produtoCategorias_on_produto || []).some(
            (item) => item?.categoria?.id === categoriaId
          )
        );
      }

      sendJson(res, 200, { produtos });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao listar produtos." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/produto") {
    try {
      const produtoId = url.searchParams.get("id") || "";
      if (!produtoId) {
        sendJson(res, 400, { error: "Produto invalido." });
        return;
      }

      const accessToken = await getAccessToken();
      const produto = await fetchProdutoDetalhe(accessToken, produtoId);

      if (!produto) {
        sendJson(res, 404, { error: "Produto nao encontrado." });
        return;
      }

      sendJson(res, 200, { produto });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar produto." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/produtos/criar") {
    try {
      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const produto = body.produto || {};
      const imagens = Array.isArray(body.imagens) ? body.imagens : [];
      const categoriasInput = Array.isArray(body.categorias) ? body.categorias : [];

      if (
        !produto.nome ||
        !produto.modelo ||
        !produto.garantia ||
        !produto.descricaoTecnica ||
        !produto.especificacoesTecnicas ||
        !produto.grupoPrecificacaoId
      ) {
        sendJson(res, 400, { error: "Dados do produto incompletos." });
        return;
      }

      if (!imagens.length) {
        sendJson(res, 400, { error: "Adicione pelo menos uma imagem." });
        return;
      }

      const capaCount = imagens.filter((img) => img?.capa).length;
      if (capaCount !== 1) {
        sendJson(res, 400, { error: "Defina exatamente uma imagem como capa." });
        return;
      }

      const accessToken = await getAccessToken();

      const marcaNome = (produto.marcaNome || "").trim();
      const marcaId = marcaNome
        ? await ensureMarca(accessToken, marcaNome)
        : produto.marcaId;

      if (!marcaId) {
        sendJson(res, 400, { error: "Marca invalida." });
        return;
      }

      const categoriasIds = [];
      for (const categoria of categoriasInput) {
        const nome = (categoria?.nome || "").trim();
        const id = categoria?.id;
        if (id) {
          categoriasIds.push(id);
          continue;
        }
        if (nome) {
          const catId = await ensureCategoria(accessToken, nome);
          if (catId) {
            categoriasIds.push(catId);
          }
        }
      }

      if (!categoriasIds.length) {
        sendJson(res, 400, { error: "Informe pelo menos uma categoria." });
        return;
      }

      const codigos = await gerarCodigoProdutoUnico(accessToken);
      const produtoId = crypto.randomUUID();

      await insertProduto(accessToken, {
        id: produtoId,
        nome: produto.nome,
        marcaId,
        modelo: produto.modelo,
        descricaoTecnica: produto.descricaoTecnica,
        especificacoesTecnicas: produto.especificacoesTecnicas,
        garantia: produto.garantia,
        codigoBarras: codigos.codigoBarras,
        codigoProduto: codigos.codigoProduto,
        grupoPrecificacaoId: produto.grupoPrecificacaoId,
        status: "ATIVO",
        motivoInativacao: null,
        categoriaInativacao: null,
        justificativaAtivacao: null,
        categoriaAtivacao: null,
        estoqueFisico: 0,
        estoqueReservado: 0,
        quantidadeVendida: 0
      });

      for (const categoriaId of categoriasIds) {
        await insertProdutoCategoria(accessToken, {
          produtoId,
          categoriaId
        });
      }

      for (const imagem of imagens) {
        if (imagem?.url) {
          await insertImagemProduto(accessToken, {
            produtoId,
            url: imagem.url,
            capa: Boolean(imagem.capa)
          });
        }
      }

      sendJson(res, 201, { id: produtoId });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao criar produto." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/produtos/editar") {
    try {
      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const produto = body.produto || {};
      const produtoId = produto.id;
      const imagens = Array.isArray(body.imagens) ? body.imagens : [];
      const categoriasInput = Array.isArray(body.categorias) ? body.categorias : [];

      if (!produtoId) {
        sendJson(res, 400, { error: "Produto invalido." });
        return;
      }

      if (
        !produto.nome ||
        !produto.modelo ||
        !produto.garantia ||
        !produto.descricaoTecnica ||
        !produto.especificacoesTecnicas ||
        !produto.grupoPrecificacaoId
      ) {
        sendJson(res, 400, { error: "Dados do produto incompletos." });
        return;
      }

      if (!imagens.length) {
        sendJson(res, 400, { error: "Adicione pelo menos uma imagem." });
        return;
      }

      const capaCount = imagens.filter((img) => img?.capa).length;
      if (capaCount !== 1) {
        sendJson(res, 400, { error: "Defina exatamente uma imagem como capa." });
        return;
      }

      const accessToken = await getAccessToken();

      const marcaNome = (produto.marcaNome || "").trim();
      const marcaId = marcaNome
        ? await ensureMarca(accessToken, marcaNome)
        : produto.marcaId;

      if (!marcaId) {
        sendJson(res, 400, { error: "Marca invalida." });
        return;
      }

      const categoriasIds = [];
      for (const categoria of categoriasInput) {
        const nome = (categoria?.nome || "").trim();
        const id = categoria?.id;
        if (id) {
          categoriasIds.push(id);
          continue;
        }
        if (nome) {
          const catId = await ensureCategoria(accessToken, nome);
          if (catId) {
            categoriasIds.push(catId);
          }
        }
      }

      if (!categoriasIds.length) {
        sendJson(res, 400, { error: "Informe pelo menos uma categoria." });
        return;
      }

      await updateProduto(accessToken, {
        id: produtoId,
        nome: produto.nome,
        marcaId,
        modelo: produto.modelo,
        descricaoTecnica: produto.descricaoTecnica,
        especificacoesTecnicas: produto.especificacoesTecnicas,
        garantia: produto.garantia,
        grupoPrecificacaoId: produto.grupoPrecificacaoId
      });

      await deleteProdutoCategorias(accessToken, { produtoId });
      for (const categoriaId of categoriasIds) {
        await insertProdutoCategoria(accessToken, {
          produtoId,
          categoriaId
        });
      }

      await deleteImagemProdutos(accessToken, { produtoId });
      for (const imagem of imagens) {
        if (imagem?.url) {
          await insertImagemProduto(accessToken, {
            produtoId,
            url: imagem.url,
            capa: Boolean(imagem.capa)
          });
        }
      }

      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao editar produto." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/produtos/status") {
    try {
      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const produtoId = body.id;
      const status = (body.status || "").toUpperCase();
      const titulo = (body.titulo || "").trim();
      const descricao = (body.descricao || "").trim();

      if (!produtoId || (status !== "ATIVO" && status !== "INATIVO")) {
        sendJson(res, 400, { error: "Dados invalidos." });
        return;
      }

      if (!titulo || !descricao) {
        sendJson(res, 400, { error: "Informe titulo e descricao da justificativa." });
        return;
      }

      const accessToken = await getAccessToken();
      const data = {
        id: produtoId,
        status,
        motivoInativacao: null,
        categoriaInativacao: null,
        justificativaAtivacao: null,
        categoriaAtivacao: null
      };

      if (status === "INATIVO") {
        data.motivoInativacao = descricao;
        data.categoriaInativacao = titulo;
      } else {
        data.justificativaAtivacao = descricao;
        data.categoriaAtivacao = titulo;
      }

      await updateProdutoStatus(accessToken, data);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao atualizar status." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/estoque/fornecedores") {
    try {
      const accessToken = await getAccessToken();
      const fornecedores = await fetchFornecedores(accessToken);
      sendJson(res, 200, { fornecedores });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar fornecedores." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/estoque/fornecedores") {
    try {
      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const nome = (body.nome || "").trim();
      const emailContato = (body.emailContato || "").trim();
      const telefoneContato = (body.telefoneContato || "").trim();

      if (!nome || !emailContato || !telefoneContato) {
        sendJson(res, 400, { error: "Dados do fornecedor incompletos." });
        return;
      }

      const accessToken = await getAccessToken();
      await insertFornecedor(accessToken, { nome, emailContato, telefoneContato });
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao cadastrar fornecedor." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/estoque/entradas") {
    try {
      const accessToken = await getAccessToken();
      const entradas = await fetchEntradaEstoques(accessToken);
      sendJson(res, 200, { entradas });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar entradas." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/estoque/entradas") {
    try {
      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const produtoId = body.produtoId;
      const fornecedorId = body.fornecedorId;
      const quantidade = Number(body.quantidade);
      const valorCusto = Number(body.valorCusto);

      if (!produtoId || !fornecedorId || !Number.isFinite(quantidade) || quantidade <= 0) {
        sendJson(res, 400, { error: "Dados da entrada invalidos." });
        return;
      }

      if (!Number.isFinite(valorCusto) || valorCusto <= 0) {
        sendJson(res, 400, { error: "Valor de custo invalido." });
        return;
      }

      const accessToken = await getAccessToken();
      const produto = await fetchProdutoEstoque(accessToken, produtoId);
      if (!produto) {
        sendJson(res, 404, { error: "Produto nao encontrado." });
        return;
      }

      const dataEntrada = new Date().toISOString().split("T")[0];
      const quantidadeFinal = Math.round(quantidade);

      await insertEntradaEstoque(accessToken, {
        fornecedorId,
        produtoId,
        dataEntrada,
        quantidade: quantidadeFinal,
        valorCusto
      });

      const novoEstoque = (produto.estoqueFisico || 0) + quantidadeFinal;
      await updateProdutoEstoque(accessToken, { id: produtoId, estoqueFisico: novoEstoque });

      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao registrar entrada." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/estoque/produtos") {
    try {
      const accessToken = await getAccessToken();
      const produtos = await fetchProdutosResumo(accessToken);
      sendJson(res, 200, { produtos });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar produtos." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/pedidos") {
    try {
      const search = url.searchParams.get("q") || "";
      const statusRaw = url.searchParams.get("status") || "";
      const sortFieldRaw = url.searchParams.get("sortField") || "";
      const sortOrderRaw = url.searchParams.get("sortOrder") || "";

      const allowedStatus = new Set([
        "APROVADA",
        "REPROVADA",
        "EM PROCESSAMENTO",
        "EM TRANSPORTE",
        "ENTREGUE",
        "EM TROCA",
        "TROCADO"
      ]);
      const allowedSortFields = new Set(["dataCriacao", "valorTotal", "valorFrete", "cliente"]);
      const allowedSortOrders = new Set(["ASC", "DESC"]);

      const statusFilters = statusRaw
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter((item) => allowedStatus.has(item));

      const sortField = allowedSortFields.has(sortFieldRaw) ? sortFieldRaw : "";
      const sortOrder = allowedSortOrders.has(sortOrderRaw.toUpperCase())
        ? sortOrderRaw.toUpperCase()
        : "";

      const accessToken = await getAccessToken();
      const query = buildPedidosQuery({
        search,
        statusFilters,
        sortField,
        sortOrder
      });

      const data = await executeGraphql(accessToken, query, {});
      sendJson(res, 200, { pedidos: data?.pedidos || [] });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao listar pedidos." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/pedidos/detalhe") {
    try {
      const pedidoId = url.searchParams.get("id");
      if (!pedidoId) {
        sendJson(res, 400, { error: "Pedido invalido." });
        return;
      }
      const accessToken = await getAccessToken();
      const pedido = await fetchPedidoDetalhe(accessToken, pedidoId);
      if (!pedido) {
        sendJson(res, 404, { error: "Pedido nao encontrado." });
        return;
      }
      if (pedido?.status?.nome === "CARRINHO") {
        sendJson(res, 400, { error: "Pedido invalido." });
        return;
      }
      sendJson(res, 200, { pedido });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar pedido." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/pedidos/status") {
    try {
      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const pedidoId = body.pedidoId;
      const statusNome = (body.status || "").toUpperCase();

      if (!pedidoId || (statusNome !== "EM TRANSPORTE" && statusNome !== "ENTREGUE")) {
        sendJson(res, 400, { error: "Dados invalidos." });
        return;
      }

      const accessToken = await getAccessToken();
      const pedidoAtual = await fetchPedidoStatus(accessToken, pedidoId);
      if (!pedidoAtual) {
        sendJson(res, 404, { error: "Pedido nao encontrado." });
        return;
      }

      const statusAtual = (pedidoAtual?.status?.nome || "").toUpperCase();
      if (
        (statusNome === "EM TRANSPORTE" && statusAtual !== "APROVADA") ||
        (statusNome === "ENTREGUE" && statusAtual !== "EM TRANSPORTE")
      ) {
        sendJson(res, 400, { error: "Transicao de status invalida." });
        return;
      }

      const statusId = await getStatusPedidoId(accessToken, statusNome);
      if (!statusId) {
        sendJson(res, 400, { error: "StatusPedido nao encontrado." });
        return;
      }

      await updatePedidoStatus(accessToken, { id: pedidoId, statusId });
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao atualizar status." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/home/produtos-populares") {
    try {
      const accessToken = await getAccessToken();
      const produtos = await fetchProdutosPopulares(accessToken);
      const formatted = produtos.map((produto) => {
        const maxEntrada = produto?.entradaEstoques_on_produto?.[0];
        const custo = Number(maxEntrada?.valorCusto || 0);
        const margem = Number(produto?.grupoPrecificacao?.margemLucro || 0);
        const preco = custo && margem ? custo * margem : 0;
        return {
          id: produto.id,
          codigoProduto: produto.codigoProduto,
          nome: produto.nome,
          modelo: produto.modelo,
          marca: produto?.marca?.nome || "",
          categorias: (produto?.produtoCategorias_on_produto || [])
            .map((item) => item?.categoria?.nome)
            .filter(Boolean),
          imagem: produto?.imagemProdutos_on_produto?.[0]?.url || "",
          preco
        };
      });
      sendJson(res, 200, { produtos: formatted });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar produtos." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/home/produto") {
    try {
      const codigo = (url.searchParams.get("codigo") || "").trim();
      if (!codigo) {
        sendJson(res, 400, { error: "Codigo do produto nao informado." });
        return;
      }

      const accessToken = await getAccessToken();
      const query = `
        query ProdutoPublico($codigo: String!) {
          produtos(
            where: {
              _and: [
                { codigoProduto: { eq: $codigo } },
                { status: { eq: "ATIVO" } }
              ]
            },
            limit: 1
          ) {
            id
            codigoProduto
            nome
            modelo
            descricaoTecnica
            especificacoesTecnicas
            marca { nome }
            grupoPrecificacao { margemLucro }
            produtoCategorias_on_produto {
              categoria { nome }
            }
            imagemProdutos_on_produto(orderBy: [{ capa: DESC }]) {
              url
              capa
            }
            entradaEstoques_on_produto(orderBy: [{ valorCusto: DESC }], limit: 1) {
              valorCusto
            }
          }
        }
      `;

      const data = await executeGraphql(accessToken, query, { codigo });
      const produto = data?.produtos?.[0];
      if (!produto) {
        sendJson(res, 404, { error: "Produto nao encontrado." });
        return;
      }

      const maxEntrada = produto?.entradaEstoques_on_produto?.[0];
      const custo = Number(maxEntrada?.valorCusto || 0);
      const margem = Number(produto?.grupoPrecificacao?.margemLucro || 0);
      const preco = custo && margem ? custo * margem : 0;
      const imagens = (produto?.imagemProdutos_on_produto || []).map((img) => ({
        url: img.url,
        capa: Boolean(img.capa)
      }));

      sendJson(res, 200, {
        produto: {
          codigoProduto: produto.codigoProduto,
          nome: produto.nome,
          modelo: produto.modelo,
          marca: produto?.marca?.nome || "",
          categorias: (produto?.produtoCategorias_on_produto || [])
            .map((item) => item?.categoria?.nome)
            .filter(Boolean),
          descricaoTecnica: produto.descricaoTecnica || "",
          especificacoesTecnicas: produto.especificacoesTecnicas || "",
          imagens,
          preco
        }
      });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar produto." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/carrinho/status") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (!idToken) {
        sendJson(res, 401, { error: "Usuario nao autenticado." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
      if (!usuarioId) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const pedido = await fetchCarrinhoPedido(accessToken, usuarioId);
      if (!pedido) {
        sendJson(res, 404, { error: "Carrinho nao encontrado." });
        return;
      }

      const expirou = await aplicarExpiracaoCarrinho(accessToken, pedido);
      const pedidoAtual = expirou
        ? await fetchCarrinhoPedido(accessToken, usuarioId)
        : pedido;

        const detalhes = await fetchCarrinhoDetalhes(accessToken, pedidoAtual.id);
        const { itens, valorTotal } = montarCarrinhoResposta(detalhes);
        const temItensAtivos = carrinhoTemItensAtivos(itens);
        let dataExpiracaoCarrinho = pedidoAtual?.dataExpiracaoCarrinho || null;

        if (!temItensAtivos && dataExpiracaoCarrinho) {
          await updatePedidoCarrinho(accessToken, {
            id: pedidoAtual.id,
            valorTotal,
            dataExpiracaoCarrinho: null
          });
          dataExpiracaoCarrinho = null;
        }

        sendJson(res, 200, {
          dataExpiracaoCarrinho,
          warningMinutes: CARRINHO_AVISO_MIN,
          extendMinutes: CARRINHO_ESTENDER_MIN
        });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar status." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/carrinho") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (!idToken) {
        sendJson(res, 401, { error: "Usuario nao autenticado." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
      if (!usuarioId) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const pedido = await fetchCarrinhoPedido(accessToken, usuarioId);
      if (!pedido) {
        sendJson(res, 404, { error: "Carrinho nao encontrado." });
        return;
      }

      const expirou = await aplicarExpiracaoCarrinho(accessToken, pedido);
      const pedidoAtual = expirou
        ? await fetchCarrinhoPedido(accessToken, usuarioId)
        : pedido;

        const detalhes = await fetchCarrinhoDetalhes(accessToken, pedidoAtual.id);
        const { itens, valorTotal } = montarCarrinhoResposta(detalhes);
        const temItensAtivos = carrinhoTemItensAtivos(itens);
        const dataExpiracaoCarrinho = temItensAtivos ? pedidoAtual.dataExpiracaoCarrinho : null;

        await updatePedidoCarrinho(accessToken, {
          id: pedidoAtual.id,
          valorTotal,
          dataExpiracaoCarrinho
        });

      sendJson(res, 200, {
        pedidoId: pedidoAtual.id,
          dataExpiracaoCarrinho,
          valorTotal,
          itens
        });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao carregar carrinho." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/carrinho/adicionar") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (!idToken) {
        sendJson(res, 401, { error: "Usuario nao autenticado." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const codigoProduto = (body.codigoProduto || "").trim();
      const produtoId = body.produtoId || "";

      if (!codigoProduto && !produtoId) {
        sendJson(res, 400, { error: "Produto nao informado." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
      if (!usuarioId) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      let pedido = await fetchCarrinhoPedido(accessToken, usuarioId);
      if (!pedido) {
        sendJson(res, 404, { error: "Carrinho nao encontrado." });
        return;
      }

      const expirou = await aplicarExpiracaoCarrinho(accessToken, pedido);
      if (expirou) {
        pedido = await fetchCarrinhoPedido(accessToken, usuarioId);
      }

      const produto = produtoId
        ? await fetchProdutoEstoque(accessToken, produtoId)
        : await fetchProdutoPorCodigo(accessToken, codigoProduto);

      if (!produto) {
        sendJson(res, 404, { error: "Produto nao encontrado." });
        return;
      }

      if (produto.status && produto.status !== "ATIVO") {
        sendJson(res, 400, { error: "Produto inativo." });
        return;
      }

      const item = await fetchItemPedido(accessToken, pedido.id, produto.id);
      const quantidadeAtual = Number(item?.quantidade || 0);
      let quantidadeDesejada = Math.min(quantidadeAtual + 1, CARRINHO_MAX_QTD);
      const maxPermitido = Math.max(
        0,
        Number(produto.estoqueFisico || 0) - Number(produto.estoqueReservado || 0) + quantidadeAtual
      );

      let aviso = "";
      if (quantidadeDesejada > maxPermitido) {
        quantidadeDesejada = quantidadeAtual > 0 ? quantidadeAtual : 0;
        aviso = "Esse produto esta com pedidos demais, favor aguardar para aumentar a quantidade.";
      }

      const delta = quantidadeDesejada - quantidadeAtual;
      if (!item) {
        await insertItemPedido(accessToken, {
          pedidoId: pedido.id,
          produtoId: produto.id,
          quantidade: quantidadeDesejada
        });
      } else if (delta !== 0) {
        await updateItemPedidoQuantidade(accessToken, {
          pedidoId: pedido.id,
          produtoId: produto.id,
          quantidade: quantidadeDesejada
        });
      }

      if (delta !== 0) {
        const reservadoAtual = Number(produto.estoqueReservado || 0);
        const novoReservado = Math.max(0, reservadoAtual + delta);
        await updateProdutoReservado(accessToken, { id: produto.id, estoqueReservado: novoReservado });
      }

        const novaExpiracao = calcularNovaExpiracao(CARRINHO_EXPIRACAO_MIN);
        const detalhes = await fetchCarrinhoDetalhes(accessToken, pedido.id);
        const { itens, valorTotal } = montarCarrinhoResposta(detalhes);
        const temItensAtivos = carrinhoTemItensAtivos(itens);
        const dataExpiracaoCarrinho = temItensAtivos ? novaExpiracao : null;
        await updatePedidoCarrinho(accessToken, {
          id: pedido.id,
          valorTotal,
          dataExpiracaoCarrinho
        });

      sendJson(res, 200, {
        ok: true,
        quantidade: quantidadeDesejada,
        warning: aviso || null,
          dataExpiracaoCarrinho
        });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao adicionar produto." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/carrinho/quantidade") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (!idToken) {
        sendJson(res, 401, { error: "Usuario nao autenticado." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const codigoProduto = (body.codigoProduto || "").trim();
      const produtoId = body.produtoId || "";
      const quantidadeReq = Number(body.quantidade);

      if (!Number.isFinite(quantidadeReq)) {
        sendJson(res, 400, { error: "Quantidade invalida." });
        return;
      }

      if (!codigoProduto && !produtoId) {
        sendJson(res, 400, { error: "Produto nao informado." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
      if (!usuarioId) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      let pedido = await fetchCarrinhoPedido(accessToken, usuarioId);
      if (!pedido) {
        sendJson(res, 404, { error: "Carrinho nao encontrado." });
        return;
      }

      const expirou = await aplicarExpiracaoCarrinho(accessToken, pedido);
      if (expirou) {
        pedido = await fetchCarrinhoPedido(accessToken, usuarioId);
      }

      const produto = produtoId
        ? await fetchProdutoEstoque(accessToken, produtoId)
        : await fetchProdutoPorCodigo(accessToken, codigoProduto);

      if (!produto) {
        sendJson(res, 404, { error: "Produto nao encontrado." });
        return;
      }

      const item = await fetchItemPedido(accessToken, pedido.id, produto.id);
      const quantidadeAtual = Number(item?.quantidade || 0);
      let quantidadeDesejada = Math.min(Math.max(Math.round(quantidadeReq), 0), CARRINHO_MAX_QTD);

      const maxPermitido = Math.max(
        0,
        Number(produto.estoqueFisico || 0) - Number(produto.estoqueReservado || 0) + quantidadeAtual
      );

      let aviso = "";
      if (quantidadeDesejada > maxPermitido) {
        quantidadeDesejada = quantidadeAtual;
        aviso = "Esse produto esta com pedidos demais, favor aguardar para aumentar a quantidade.";
      }

      const delta = quantidadeDesejada - quantidadeAtual;
      if (!item) {
        await insertItemPedido(accessToken, {
          pedidoId: pedido.id,
          produtoId: produto.id,
          quantidade: quantidadeDesejada
        });
      } else if (delta !== 0) {
        await updateItemPedidoQuantidade(accessToken, {
          pedidoId: pedido.id,
          produtoId: produto.id,
          quantidade: quantidadeDesejada
        });
      }

      if (delta !== 0) {
        const reservadoAtual = Number(produto.estoqueReservado || 0);
        const novoReservado = Math.max(0, reservadoAtual + delta);
        await updateProdutoReservado(accessToken, { id: produto.id, estoqueReservado: novoReservado });
      }

        const novaExpiracao = calcularNovaExpiracao(CARRINHO_EXPIRACAO_MIN);
        const detalhes = await fetchCarrinhoDetalhes(accessToken, pedido.id);
        const { itens, valorTotal } = montarCarrinhoResposta(detalhes);
        const temItensAtivos = carrinhoTemItensAtivos(itens);
        const dataExpiracaoCarrinho = temItensAtivos ? novaExpiracao : null;
        await updatePedidoCarrinho(accessToken, {
          id: pedido.id,
          valorTotal,
          dataExpiracaoCarrinho
        });

      sendJson(res, 200, {
        ok: true,
        quantidade: quantidadeDesejada,
        warning: aviso || null,
          dataExpiracaoCarrinho
        });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao atualizar quantidade." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/carrinho/remover") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (!idToken) {
        sendJson(res, 401, { error: "Usuario nao autenticado." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const codigoProduto = (body.codigoProduto || "").trim();
      const produtoId = body.produtoId || "";

      if (!codigoProduto && !produtoId) {
        sendJson(res, 400, { error: "Produto nao informado." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
      if (!usuarioId) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      let pedido = await fetchCarrinhoPedido(accessToken, usuarioId);
      if (!pedido) {
        sendJson(res, 404, { error: "Carrinho nao encontrado." });
        return;
      }

      const expirou = await aplicarExpiracaoCarrinho(accessToken, pedido);
      if (expirou) {
        pedido = await fetchCarrinhoPedido(accessToken, usuarioId);
      }

      const produto = produtoId
        ? await fetchProdutoEstoque(accessToken, produtoId)
        : await fetchProdutoPorCodigo(accessToken, codigoProduto);

      if (!produto) {
        sendJson(res, 404, { error: "Produto nao encontrado." });
        return;
      }

      const item = await fetchItemPedido(accessToken, pedido.id, produto.id);
      if (item) {
        const quantidadeAtual = Number(item.quantidade || 0);
        if (quantidadeAtual > 0) {
          const reservadoAtual = Number(produto.estoqueReservado || 0);
          const novoReservado = Math.max(0, reservadoAtual - quantidadeAtual);
          await updateProdutoReservado(accessToken, { id: produto.id, estoqueReservado: novoReservado });
        }
        await deleteItemPedido(accessToken, { pedidoId: pedido.id, produtoId: produto.id });
      }

        const novaExpiracao = calcularNovaExpiracao(CARRINHO_EXPIRACAO_MIN);
        const detalhes = await fetchCarrinhoDetalhes(accessToken, pedido.id);
        const { itens, valorTotal } = montarCarrinhoResposta(detalhes);
        const temItensAtivos = carrinhoTemItensAtivos(itens);
        const dataExpiracaoCarrinho = temItensAtivos ? novaExpiracao : null;
        await updatePedidoCarrinho(accessToken, {
          id: pedido.id,
          valorTotal,
          dataExpiracaoCarrinho
        });

        sendJson(res, 200, { ok: true, dataExpiracaoCarrinho });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao remover item." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/carrinho/estender") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (!idToken) {
        sendJson(res, 401, { error: "Usuario nao autenticado." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
      if (!usuarioId) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const pedido = await fetchCarrinhoPedido(accessToken, usuarioId);
      if (!pedido) {
        sendJson(res, 404, { error: "Carrinho nao encontrado." });
        return;
      }

      const expirou = await aplicarExpiracaoCarrinho(accessToken, pedido);
      if (expirou) {
        sendJson(res, 200, { dataExpiracaoCarrinho: null });
        return;
      }

        const detalhes = await fetchCarrinhoDetalhes(accessToken, pedido.id);
        const { itens, valorTotal } = montarCarrinhoResposta(detalhes);
        const temItensAtivos = carrinhoTemItensAtivos(itens);
        if (!temItensAtivos) {
          await updatePedidoCarrinho(accessToken, {
            id: pedido.id,
            valorTotal,
            dataExpiracaoCarrinho: null
          });
          sendJson(res, 200, { dataExpiracaoCarrinho: null });
          return;
        }

        const novaExpiracao = calcularExpiracaoExtendida(
          pedido.dataExpiracaoCarrinho,
          CARRINHO_ESTENDER_MIN
        );
        await updatePedidoCarrinho(accessToken, {
          id: pedido.id,
          valorTotal,
          dataExpiracaoCarrinho: novaExpiracao
        });

        sendJson(res, 200, { dataExpiracaoCarrinho: novaExpiracao });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao estender carrinho." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/carrinho/cancelar") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (!idToken) {
        sendJson(res, 401, { error: "Usuario nao autenticado." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
      if (!usuarioId) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      const pedido = await fetchCarrinhoPedido(accessToken, usuarioId);
      if (!pedido) {
        sendJson(res, 404, { error: "Carrinho nao encontrado." });
        return;
      }

      const itens = await fetchItensPedidoReservas(accessToken, pedido.id);
      for (const item of itens) {
        const quantidade = Number(item.quantidade || 0);
        const produto = item.produto;
        if (quantidade > 0 && produto) {
          const reservadoAtual = Number(produto.estoqueReservado || 0);
          const novoReservado = Math.max(0, reservadoAtual - quantidade);
          await updateProdutoReservado(accessToken, { id: produto.id, estoqueReservado: novoReservado });
        }
      }

      await zerarItensPedido(accessToken, pedido.id);
      await updatePedidoCarrinho(accessToken, {
        id: pedido.id,
        valorTotal: 0,
        dataExpiracaoCarrinho: null
      });

      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao cancelar carrinho." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/checkout/finalizar") {
    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (!idToken) {
        sendJson(res, 401, { error: "Usuario nao autenticado." });
        return;
      }

      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const enderecoId = body.enderecoId;
      const cupomPromocionalId = body.cupomPromocionalId || null;
      const cupomTrocaIds = Array.isArray(body.cupomTrocaIds)
        ? body.cupomTrocaIds.filter(Boolean)
        : [];
      const cartoesInput = normalizarCheckoutCartoesInput(body);

      if (!enderecoId) {
        sendJson(res, 400, { error: "Endereco invalido." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const usuarioId = await fetchUsuarioIdByAuthId(accessToken, authId);
      if (!usuarioId) {
        sendJson(res, 404, { error: "Usuario nao encontrado." });
        return;
      }

      let pedidoCarrinho = await fetchCarrinhoPedido(accessToken, usuarioId);
      if (!pedidoCarrinho) {
        sendJson(res, 404, { error: "Carrinho nao encontrado." });
        return;
      }

      const expirou = await aplicarExpiracaoCarrinho(accessToken, pedidoCarrinho);
      if (expirou) {
        pedidoCarrinho = await fetchCarrinhoPedido(accessToken, usuarioId);
      }

      const detalhes = await fetchCarrinhoDetalhes(accessToken, pedidoCarrinho.id);
      const { itens } = montarCarrinhoResposta(detalhes);
      const itensAtivos = itens.filter((item) => Number(item.quantidade || 0) > 0);
      if (!itensAtivos.length) {
        sendJson(res, 400, { error: "Carrinho vazio." });
        return;
      }

      const endereco = await fetchUsuarioEnderecoPorId(accessToken, usuarioId, enderecoId);
      if (!endereco) {
        sendJson(res, 400, { error: "Endereco nao encontrado." });
        return;
      }

      const totalProdutos = itensAtivos.reduce((acc, item) => acc + Number(item.precoTotal || 0), 0);
      const frete = calcularFretePorCep(endereco.cep);
      const totalBruto = totalProdutos + frete;

      let promoValor = 0;
      let promoAplicada = 0;
      let cupomPromocionalAplicado = null;
      if (cupomPromocionalId) {
        const cuponsPromo = await fetchCuponsPorClienteIds(accessToken, usuarioId, [cupomPromocionalId]);
        if (!cuponsPromo.length) {
          sendJson(res, 400, { error: "Cupom promocional invalido." });
          return;
        }
        const cupom = cuponsPromo[0];
        const tipo = normalizeTexto(cupom.tipo?.nome);
        const status = normalizeTexto(cupom.status?.nome);
        if (status && status !== "ATIVO") {
          sendJson(res, 400, { error: "Cupom promocional inativo." });
          return;
        }
        if (tipo !== "DESCONTO" && tipo !== "FRETE GRATIS" && tipo !== "FRETE GRÁTIS") {
          sendJson(res, 400, { error: "Cupom promocional invalido." });
          return;
        }
        if (tipo === "DESCONTO") {
          promoValor = Number(cupom.valor || 0);
        } else if (totalProdutos >= Number(cupom.valor || 0)) {
          promoValor = frete;
        }
        promoAplicada = Math.min(promoValor, totalBruto);
        if (promoAplicada > 0) {
          cupomPromocionalAplicado = cupom;
        }
      }

      const totalAposPromo = Math.max(totalBruto - promoAplicada, 0);

      let cuponsTrocaValidos = [];
      if (cupomTrocaIds.length) {
        const cupons = await fetchCuponsPorClienteIds(accessToken, usuarioId, cupomTrocaIds);
        if (cupons.length !== cupomTrocaIds.length) {
          sendJson(res, 400, { error: "Cupom de troca invalido." });
          return;
        }
        cuponsTrocaValidos = cupons.filter((cupom) => {
          const tipo = normalizeTexto(cupom.tipo?.nome);
          const status = normalizeTexto(cupom.status?.nome);
          const tipoOk = tipo === "TROCA" || tipo === "SOBRA";
          const statusOk = !status || status === "ATIVO";
          return tipoOk && statusOk;
        });
        if (cuponsTrocaValidos.length !== cupons.length) {
          sendJson(res, 400, { error: "Cupom de troca invalido." });
          return;
        }
      }

      const trocaTotal = cuponsTrocaValidos.reduce(
        (acc, cupom) => acc + Number(cupom.valor || 0),
        0
      );
      const trocaAplicada = Math.min(trocaTotal, totalAposPromo);
      const trocaSobra = Math.max(trocaTotal - trocaAplicada, 0);
      const restanteCartao = Math.max(totalAposPromo - trocaAplicada, 0);

      let cartoesPagamento = [];

      if (restanteCartao > 0) {
        const cartaoIds = [...new Set(cartoesInput.map((item) => item.cartaoId).filter(Boolean))];
        if (!cartaoIds.length) {
          sendJson(res, 400, { error: "Cartao principal obrigatorio." });
          return;
        }
        const cartoesEncontrados = await fetchUsuarioCartoesPorIds(
          accessToken,
          usuarioId,
          cartaoIds
        );
        const distribuicao = distribuirPagamentoCartoes(
          restanteCartao,
          cartoesInput,
          cartoesEncontrados
        );
        if (distribuicao.erro) {
          sendJson(res, 400, { error: distribuicao.erro });
          return;
        }
        cartoesPagamento = distribuicao.cartoesPagamento;
      }

      const statusProcessoId = await getStatusPedidoId(accessToken, "EM PROCESSAMENTO");
      if (!statusProcessoId) {
        sendJson(res, 400, { error: "Status EM PROCESSAMENTO nao encontrado." });
        return;
      }

      const novoPedidoId = crypto.randomUUID();
      const dataCriacao = new Date().toISOString();
      await insertPedido(accessToken, {
        id: novoPedidoId,
        enderecoEntregaId: endereco.id,
        statusId: statusProcessoId,
        usuarioId,
        valorFrete: frete,
        valorTotal: totalBruto,
        dataCriacao,
        dataExpiracaoCarrinho: null
      });

      for (const item of itensAtivos) {
        await insertItemPedido(accessToken, {
          pedidoId: novoPedidoId,
          produtoId: item.produtoId,
          quantidade: Number(item.quantidade || 0),
          precoAtual: Number(item.precoUnitario || 0)
        });
      }

      for (const item of itensAtivos) {
        await deleteItemPedido(accessToken, {
          pedidoId: pedidoCarrinho.id,
          produtoId: item.produtoId
        });
      }

      const carrinhoAtualizado = await fetchCarrinhoDetalhes(accessToken, pedidoCarrinho.id);
      const { itens: itensRestantes, valorTotal: valorRestante } =
        montarCarrinhoResposta(carrinhoAtualizado);
      const temItensAtivos = carrinhoTemItensAtivos(itensRestantes);
      await updatePedidoCarrinho(accessToken, {
        id: pedidoCarrinho.id,
        valorTotal: valorRestante,
        dataExpiracaoCarrinho: temItensAtivos ? pedidoCarrinho.dataExpiracaoCarrinho : null
      });

      const pagamentoId = crypto.randomUUID();
      const valorTotalPago = totalAposPromo;
      await insertPagamento(accessToken, {
        id: pagamentoId,
        pedidoId: novoPedidoId,
        valorTotalPago,
        dataPagamento: new Date().toISOString(),
        cupomPromocionalId: cupomPromocionalAplicado ? cupomPromocionalAplicado.id : null
      });

      for (const pagamentoCartao of cartoesPagamento) {
        if (!pagamentoCartao?.cartao?.id || Number(pagamentoCartao.valor || 0) <= 0) {
          continue;
        }
        await insertPagamentoCartao(accessToken, {
          pagamentoId,
          cartaoCreditoId: pagamentoCartao.cartao.id,
          valorParcela: Number(pagamentoCartao.valor || 0)
        });
      }

      for (const cupom of cuponsTrocaValidos) {
        await insertPagamentoCupomTroca(accessToken, {
          pagamentoId,
          cupomTrocaId: cupom.id
        });
      }

      let statusFinal = "APROVADA";
      let justificativaReprovacao = null;
      if (cartoesPagamento.length) {
        for (const pagamentoCartao of cartoesPagamento) {
          const cartao = pagamentoCartao.cartao;
          if (!validarLuhn(cartao.numero)) {
            statusFinal = "REPROVADA";
            justificativaReprovacao =
              "Seu cart\u00E3o com final " +
              obterFinalCartao(cartao.numero) +
              " n\u00E3o \u00E9 v\u00E1lido";
            break;
          }
          if (cartaoExpirado(cartao.dataValidade)) {
            statusFinal = "REPROVADA";
            justificativaReprovacao =
              "Seu cart\u00E3o com final " +
              obterFinalCartao(cartao.numero) +
              " est\u00E1 vencido";
            break;
          }
        }
      }

      const statusFinalId = await getStatusPedidoId(accessToken, statusFinal);
      if (!statusFinalId) {
        sendJson(res, 400, { error: `Status ${statusFinal} nao encontrado.` });
        return;
      }
      const statusPayload =
        statusFinal === "REPROVADA"
          ? { id: novoPedidoId, statusId: statusFinalId, justificativaReprovacao }
          : { id: novoPedidoId, statusId: statusFinalId };
      await updatePedidoStatus(accessToken, statusPayload);

      const produtosInventario = await fetchProdutosInventario(
        accessToken,
        itensAtivos.map((item) => item.produtoId)
      );
      const inventarioMap = new Map();
      produtosInventario.forEach((produto) => {
        if (produto?.id) {
          inventarioMap.set(produto.id, produto);
        }
      });

      for (const item of itensAtivos) {
        const produto = inventarioMap.get(item.produtoId);
        if (!produto) {
          continue;
        }
        const quantidade = Number(item.quantidade || 0);
        const reservadoAtual = Number(produto.estoqueReservado || 0);
        const estoqueAtual = Number(produto.estoqueFisico || 0);
        const vendidoAtual = Number(produto.quantidadeVendida || 0);
        if (statusFinal === "APROVADA") {
          await updateProdutoInventario(accessToken, {
            id: produto.id,
            estoqueFisico: Math.max(0, estoqueAtual - quantidade),
            estoqueReservado: Math.max(0, reservadoAtual - quantidade),
            quantidadeVendida: Math.max(0, vendidoAtual + quantidade)
          });
        } else if (statusFinal === "REPROVADA") {
          await updateProdutoReservado(accessToken, {
            id: produto.id,
            estoqueReservado: Math.max(0, reservadoAtual - quantidade)
          });
        }
      }

      if (statusFinal === "APROVADA") {
        const gastoCartao = cartoesPagamento.reduce(
          (acc, item) => acc + Number(item?.valor || 0),
          0
        );
        const incrementoRanking = Math.floor(gastoCartao / 100);
        if (incrementoRanking > 0) {
          const rankingAtual = await fetchUsuarioRanking(accessToken, usuarioId);
          await updateUsuarioRanking(accessToken, {
            id: usuarioId,
            ranking: Math.max(0, rankingAtual + incrementoRanking)
          });
        }

        const statusUsadoId = await getStatusCupomId(accessToken, "USADO");
        const statusAtivoId = await getStatusCupomId(accessToken, "ATIVO");
        const tipoSobraId = await getTipoCupomId(accessToken, "SOBRA");

        if (statusUsadoId) {
          const usados = [];
          if (cupomPromocionalAplicado) {
            usados.push(cupomPromocionalAplicado.id);
          }
          cuponsTrocaValidos.forEach((cupom) => usados.push(cupom.id));

          for (const cupomId of usados) {
            await updateCupomStatus(accessToken, { id: cupomId, statusId: statusUsadoId });
          }
        }

        if (trocaSobra > 0 && statusAtivoId && tipoSobraId) {
          const novoCupomId = crypto.randomUUID();
          await insertCupom(accessToken, {
            id: novoCupomId,
            clienteId: usuarioId,
            statusId: statusAtivoId,
            tipoId: tipoSobraId,
            codigo: gerarCodigoCupom(),
            valor: trocaSobra,
            validade: adicionarAno(new Date())
          });
        }
      }

      sendJson(res, 200, {
        ok: true,
        pedidoId: novoPedidoId,
        status: statusFinal
      });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao finalizar compra." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/clientes") {
    try {
      const search = url.searchParams.get("q") || "";
      const statusRaw = url.searchParams.get("status") || "";
      const generoRaw = url.searchParams.get("genero") || "";
      const sortFieldRaw = url.searchParams.get("sortField") || "";
      const sortOrderRaw = url.searchParams.get("sortOrder") || "";

      const allowedStatus = new Set(["ATIVO", "INATIVO", "ADMIN"]);
      const allowedGeneros = new Set(["MASCULINO", "FEMININO", "OUTRO"]);
      const allowedSortFields = new Set(["nome", "ranking", "dataNascimento"]);
      const allowedSortOrders = new Set(["ASC", "DESC"]);

      const statusFilters = statusRaw
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter((item) => allowedStatus.has(item));

      const generoFilters = generoRaw
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter((item) => allowedGeneros.has(item));

      const sortField = allowedSortFields.has(sortFieldRaw) ? sortFieldRaw : "";
      const sortOrder = allowedSortOrders.has(sortOrderRaw.toUpperCase())
        ? sortOrderRaw.toUpperCase()
        : "";

      const accessToken = await getAccessToken();
      const query = buildClientesQuery({
        search,
        statusFilters,
        generoFilters,
        sortField,
        sortOrder
      });

      const data = await executeGraphql(accessToken, query, {});
      const clientes = (data?.usuarios || []).filter(
        (cliente) => cliente?.status?.nome !== "ADMIN"
      );
      sendJson(res, 200, { clientes });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao listar clientes." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/clientes/status") {
    try {
      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const usuarioId = body.usuarioId;
      const statusNome = (body.status || "").toUpperCase();

      if (!usuarioId || (statusNome !== "ATIVO" && statusNome !== "INATIVO")) {
        sendJson(res, 400, { error: "Dados invalidos." });
        return;
      }

      const accessToken = await getAccessToken();
      const statusId = await ensureStatusUsuario(accessToken, statusNome);
      if (!statusId) {
        sendJson(res, 500, { error: "StatusUsuario nao encontrado." });
        return;
      }

      const mutation = `
        mutation AtualizarStatusUsuario($id: UUID!, $statusId: UUID!) {
          usuario_update(key: { id: $id }, data: { statusId: $statusId })
        }
      `;

      await executeGraphql(accessToken, mutation, { id: usuarioId, statusId });
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao atualizar status." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/cadastro/validar") {
    try {
      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const email = (body.email || "").trim();
      const cpf = (body.cpf || "").trim();

      if (!email || !cpf) {
        sendJson(res, 400, { error: "Email e CPF sao obrigatorios." });
        return;
      }

      if (!cpfRegex.test(cpf)) {
        sendJson(res, 400, { error: "CPF invalido. Use o formato xxx.xxx.xxx-xx." });
        return;
      }

      const accessToken = await getAccessToken();
      const result = await checkUsuarioUnico(accessToken, email, cpf);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao validar dados." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/cadastro/registrar") {
    try {
      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : body.idToken;

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const usuario = body.usuario || {};
      const telefone = body.telefone || {};
      const endereco = body.endereco || {};

      if (!usuario.nome || !usuario.email || !usuario.cpf || !usuario.dataNascimento || !usuario.genero) {
        sendJson(res, 400, { error: "Dados do usuario incompletos." });
        return;
      }

      if (!cpfRegex.test(usuario.cpf)) {
        sendJson(res, 400, { error: "CPF invalido. Use o formato xxx.xxx.xxx-xx." });
        return;
      }

      if (!telefone.tipoId || !telefone.ddd || !telefone.numero) {
        sendJson(res, 400, { error: "Dados de telefone incompletos." });
        return;
      }

      if (!endereco.tipoLogradouroId || !endereco.tipoResidenciaId || !endereco.logradouro || !endereco.numero) {
        sendJson(res, 400, { error: "Dados de endereco incompletos." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();

      const uniqueCheck = await checkUsuarioUnico(accessToken, usuario.email, usuario.cpf);
      if (uniqueCheck.emailExists || uniqueCheck.cpfExists) {
        sendJson(res, 409, {
          error: "Email ou CPF ja cadastrado.",
          emailExists: uniqueCheck.emailExists,
          cpfExists: uniqueCheck.cpfExists
        });
        return;
      }

      const statusId = await ensureStatusUsuario(accessToken, "ATIVO");
      if (!statusId) {
        sendJson(res, 500, { error: "StatusUsuario ATIVO nao encontrado." });
        return;
      }

      const usuarioId = crypto.randomUUID();
      await insertUsuario(accessToken, {
        id: usuarioId,
        authId,
        statusId,
        codigoUser: generateCodigoUser(),
        nome: usuario.nome,
        genero: usuario.genero,
        dataNascimento: usuario.dataNascimento,
        cpf: usuario.cpf,
        email: usuario.email,
        ranking: 0
      });

      await insertTelefone(accessToken, {
        id: crypto.randomUUID(),
        usuarioId,
        tipoId: telefone.tipoId,
        ddd: telefone.ddd,
        numero: telefone.numero
      });

      const enderecoId = crypto.randomUUID();
      await insertEndereco(accessToken, {
        id: enderecoId,
        usuarioId,
        tipoLogradouroId: endereco.tipoLogradouroId,
        tipoResidenciaId: endereco.tipoResidenciaId,
        tipo: "Principal",
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        bairro: endereco.bairro,
        cep: endereco.cep,
        cidade: endereco.cidade,
        estado: endereco.estado,
        pais: endereco.pais,
        observacoes: endereco.observacoes
      });

      await insertPedido(accessToken, {
        id: crypto.randomUUID(),
        usuarioId,
        enderecoEntregaId: enderecoId,
        statusId: CARRINHO_STATUS_ID,
        valorFrete: 0,
        valorTotal: 0,
        dataCriacao: new Date().toISOString()
      });

      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro ao cadastrar usuario." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/usuario-status") {
    try {
      const rawBody = await readBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : body.idToken;

      if (!idToken) {
        sendJson(res, 400, { error: "idToken ausente." });
        return;
      }

      const authId = await verifyIdToken(idToken);
      const accessToken = await getAccessToken();
      const status = await queryUsuarioStatus(authId, accessToken);

      if (!status) {
        sendJson(res, 404, { error: "Usuario nao encontrado no Data Connect." });
        return;
      }

      sendJson(res, 200, { status });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "Erro interno." });
    }
    return;
  }

  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`API e front-end prontos em http://localhost:${PORT}/view/index.html`);
});

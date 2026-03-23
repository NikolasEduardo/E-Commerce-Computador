const http = require("http");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;

const projectId = process.env.FIREBASE_PROJECT_ID || "ecommercepcpecas";
const location = process.env.DATACONNECT_LOCATION || "southamerica-east1";
const serviceId = process.env.DATACONNECT_SERVICE_ID || "ecommercepcpecas-service";
const apiKey = process.env.FIREBASE_API_KEY || "AIzaSyCBpyWP-Y39VEpWU-Ny0C8fVvTCF0JD1ow";

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "serviceAccount.json");

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

function escapeGqlString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
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
  const args = [whereClause, orderClause, "limit: 50"].filter(Boolean).join(", ");

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
        statusId: "657ec9e6e2e743268c7afe6aeb0db479",
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

  sendJson(res, 404, { error: "Rota nao encontrada." });
});

server.listen(PORT, () => {
  console.log(`API pronta em http://localhost:${PORT}`);
});

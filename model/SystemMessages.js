export const SYSTEM_MESSAGES = {
  general: {
    loading: "AGUARDE...",
    saving: "SALVANDO...",
    accessing: "ENTRANDO...",
    close: "Fechar",
    warningTitle: "Aviso",
    errorTitle: "Erro",
    unexpectedError: "Ocorreu um erro inesperado. Tente novamente.",
    unauthenticated: "Usuario nao autenticado.",
    requiredFields: "Preencha todos os campos obrigatorios.",
    invalidRequest: "Erro na requisicao.",
    dataNotFound: "Dados nao encontrados.",
    publicConfigLoadError: "Nao foi possivel carregar a configuracao publica.",
    publicConfigIncomplete: "Configuracao publica do Firebase incompleta. Verifique o arquivo server/.env."
  },

  auth: {
    errors: {
      missingCredentials: "Informe email e senha para continuar.",
      missingCredentialsShort: "Informe email e senha.",
      tokenFailed: "Falha ao obter token do Firebase Auth.",
      usuarioNaoEncontrado: "Usuario nao encontrado no Data Connect.",
      loginFailed: "Erro ao autenticar.",
      inactiveUser: "O usuario atual foi inativado.",
      unknownStatus: "Status de usuario desconhecido: {status}",
      adminRequired: "Voce precisa estar autenticado e com permissoes administrativas para acessar esta pagina.",
      adminDenied: "Voce nao deveria acessar esta pagina.",
      adminValidationFailed: "Nao foi possivel validar o acesso administrativo.",
      firebase: {
        "auth/invalid-credential": "Email ou senha invalidos. Confira os dados e tente novamente.",
        "auth/invalid-email": "Email invalido. Verifique o formato informado.",
        "auth/user-disabled": "Esta conta foi desativada.",
        "auth/user-not-found": "Email ou senha invalidos. Confira os dados e tente novamente.",
        "auth/wrong-password": "Email ou senha invalidos. Confira os dados e tente novamente.",
        "auth/too-many-requests": "Muitas tentativas de login. Aguarde um pouco e tente novamente.",
        "auth/network-request-failed": "Falha de conexao com o Firebase. Verifique sua internet e tente novamente.",
        "auth/email-already-in-use": "Este email ja esta cadastrado.",
        "auth/weak-password": "A senha precisa ter no minimo 8 caracteres.",
        "auth/operation-not-allowed": "Este metodo de autenticacao nao esta habilitado no Firebase.",
        "auth/requires-recent-login": "Por seguranca, faca login novamente para continuar."
      }
    }
  },

  cadastro: {
    errors: {
      step1Required: "Preencha todos os campos da primeira etapa.",
      step2Required: "Preencha todos os campos de endereco.",
      cpfInvalid: "CPF invalido. Use o formato 000.000.000-00.",
      emailInvalid: "Email invalido. Use um formato com apenas um @.",
      passwordWeak: "Senha fraca. Minimo 8 caracteres, 1 maiusculo, 1 minusculo e 1 especial.",
      passwordMismatch: "As senhas nao conferem.",
      cepInvalid: "CEP invalido. Use o formato 00000-000.",
      emailExists: "Email ja cadastrado.",
      cpfExists: "CPF ja cadastrado.",
      metadataLoadFailed: "Erro ao carregar dados do cadastro.",
      uniquenessFailed: "Erro ao validar email e CPF.",
      registerFailed: "Erro ao cadastrar usuario."
    },
    success: {
      completed: "Cadastro concluido com sucesso."
    }
  },

  carrinho: {
    errors: {
      loadFailed: "Erro ao carregar carrinho.",
      loadStatusFailed: "Erro ao carregar status.",
      addFailed: "Erro ao adicionar item.",
      updateQuantityFailed: "Erro ao atualizar quantidade.",
      removeFailed: "Erro ao remover item.",
      extendFailed: "Erro ao estender carrinho.",
      cancelFailed: "Erro ao cancelar carrinho."
    },
    empty: {
      noItems: "Nenhum produto no carrinho."
    },
    warnings: {
      highDemand: "Esse produto esta com pedidos demais, favor aguardar para aumentar a quantidade."
    }
  },

  produto: {
    errors: {
      loadListFailed: "Erro ao carregar produtos.",
      loadFailed: "Erro ao carregar produto.",
      notFound: "Produto nao encontrado.",
      codeMissing: "Codigo do produto nao informado.",
      saveFailed: "Erro ao salvar produto.",
      createFailed: "Erro ao criar produto.",
      editFailed: "Erro ao editar produto.",
      statusUpdateFailed: "Erro ao atualizar status.",
      metadataLoadFailed: "Erro ao carregar metadata.",
      uploadMissingUrl: "Upload nao retornou URL.",
      uploadFailed: "Erro ao enviar imagem."
    },
    empty: {
      noProducts: "Nenhum produto encontrado.",
      noAvailableProducts: "Nenhum produto disponivel."
    },
    validation: {
      nameModelRequired: "Informe nome e modelo.",
      warrantyTypeRequired: "Selecione o tipo de garantia.",
      warrantyMonthsInvalid: "Informe a garantia em meses (entre 2 e 11).",
      warrantyYearsInvalid: "Informe a garantia em anos (minimo 1).",
      warrantyYearsRequired: "Informe os anos da garantia (minimo 1).",
      warrantyMonthsRequired: "Informe os meses da garantia (entre 2 e 11).",
      descriptionRequired: "Informe descricao e especificacoes.",
      brandRequired: "Selecione ou informe uma marca.",
      pricingGroupRequired: "Selecione o grupo de precificacao.",
      categoryRequired: "Adicione pelo menos uma categoria.",
      imageRequired: "Adicione pelo menos uma imagem.",
      coverRequired: "Defina exatamente uma imagem como capa.",
      uploadPending: "Aguarde o upload das imagens.",
      categoryAlreadyAdded: "Categoria ja adicionada.",
      justificationRequired: "Informe titulo e descricao."
    }
  },

  ia: {
    errors: {
      loadCatalogFailed: "Erro ao carregar catalogo para a IA.",
      sendFailed: "Erro ao enviar mensagem para a Gamzu.",
      aiUnavailable: "A IA ainda nao esta configurada. Verifique se o Firebase AI Logic esta habilitado no projeto.",
      blocked: "Esta conversa foi encerrada. Crie uma nova conversa para continuar."
    },
    empty: {
      noMessages: "Inicie uma conversa com a Gamzu sobre pecas de computador, compatibilidade ou hardware."
    },
    warnings: {
      newConversation: "A conversa antiga nunca podera ser recuperada. Deseja limpar a conversa atual e iniciar uma nova?",
      violationClosed: "A conversa foi encerrada porque saiu do assunto permitido. Crie uma nova conversa para continuar."
    }
  },

  checkout: {
    errors: {
      finishFailed: "Erro ao finalizar compra.",
      loadDataFailed: "Erro ao carregar dados.",
      updateCartFailed: "Erro ao atualizar carrinho.",
      metadataLoadFailed: "Erro ao carregar metadata.",
      addressCreateFailed: "Erro ao cadastrar endereco.",
      cardCreateFailed: "Erro ao cadastrar cartao.",
      addressRequired: "Cadastre um endereco para prosseguir.",
      cardRequired: "Cadastre um cartao para continuar.",
      noCards: "Nenhum cartao cadastrado.",
      couponNotApplicable: "Cupom nao aplicavel (valor minimo nao atingido).",
      cardRemainingCovered: "Compra coberta pelos cupons.",
      cardRemainingTooSmall: "O valor restante nao permite adicionar outro cartao.",
      cardLimitByValue: "Nao e possivel adicionar mais cartoes para este valor.",
      noMoreCards: "Nao ha mais cartoes disponiveis para adicionar.",
      extraCardsAdjusted: "Cartoes adicionais ajustados ao valor restante.",
      extraCardsRemovedByValue: "Valor restante menor que R$ 20. Cartoes adicionais removidos.",
      cardNumberInvalid: "Numero do cartao invalido. Use entre 13 e 16 digitos.",
      cvvInvalid: "CVV invalido. Use 3 ou 4 digitos.",
      cardFieldsRequired: "Preencha todos os dados do cartao.",
      addressFieldsRequired: "Preencha todos os campos obrigatorios.",
      cepInvalidShort: "CEP invalido. Use 00000-000."
    },
    empty: {
      noItems: "Nenhum produto para finalizar.",
      noAddress: "Nenhum endereco cadastrado",
      noCoupons: "Nenhum cupom",
      noExchangeCoupons: "Nenhum cupom de troca disponivel."
    }
  },

  perfil: {
    errors: {
      loadFailed: "Erro ao carregar perfil.",
      loadDataFailed: "Erro ao carregar dados.",
      updateFailed: "Erro ao atualizar dados.",
      addressLoadFailed: "Erro ao carregar enderecos.",
      addressSaveFailed: "Erro ao salvar endereco.",
      addressCreateFailed: "Erro ao criar endereco.",
      addressUpdateFailed: "Erro ao atualizar endereco.",
      addressDeleteFailed: "Erro ao excluir endereco.",
      addressPrincipalFailed: "Erro ao definir endereco residencial.",
      cardLoadFailed: "Erro ao carregar cartoes.",
      cardCreateFailed: "Erro ao cadastrar cartao.",
      cardDeleteFailed: "Erro ao excluir cartao.",
      cardPreferentialFailed: "Erro ao definir cartao preferencial.",
      couponsLoadFailed: "Erro ao carregar cupons.",
      ordersLoadFailed: "Erro ao carregar pedidos.",
      orderLoadFailed: "Erro ao carregar pedido.",
      orderDetailLoadFailed: "Erro ao carregar detalhes do pedido.",
      orderReadicionarFailed: "Erro ao readicionar itens ao carrinho.",
      exchangesLoadFailed: "Erro ao carregar solicitacoes de troca.",
      exchangeOrdersLoadFailed: "Erro ao carregar pedidos elegiveis para troca.",
      exchangeCreateFailed: "Erro ao solicitar troca.",
      profileRequired: "Preencha os dados cadastrais.",
      phoneRequired: "Preencha os dados de telefone.",
      addressRequired: "Preencha todos os dados de endereco.",
      addressFormRequired: "Preencha todos os dados do endereco.",
      cardRequired: "Preencha todos os dados do cartao.",
      exchangeReasonRequired: "Informe o motivo e a descricao da troca.",
      exchangeItemsRequired: "Selecione pelo menos um item para devolver.",
      exchangeQuantityInvalid: "Informe uma quantidade valida para os itens selecionados.",
      cpfInvalid: "CPF invalido. Use o formato 000.000.000-00.",
      cepInvalid: "CEP invalido. Use o formato 00000-000.",
      cardNumberInvalid: "Numero do cartao invalido. Use entre 13 e 16 digitos.",
      cvvInvalid: "CVV invalido. Use 3 ou 4 digitos.",
      orderNotFound: "Pedido nao encontrado."
    },
    success: {
      updated: "Dados atualizados com sucesso.",
      orderReadicionado: "Itens readicionados ao carrinho.",
      exchangeRequested: "Solicitacao de troca registrada com sucesso."
    },
    empty: {
      noAddresses: "Nenhum endereco cadastrado.",
      noCards: "Nenhum cartao cadastrado.",
      noActiveCoupons: "Nenhum cupom ativo.",
      noInactiveCoupons: "Nenhum cupom expirado ou usado.",
      noOrders: "Nenhum pedido encontrado.",
      noExchanges: "Nenhuma solicitacao de troca encontrada.",
      noExchangeOrders: "Nenhum pedido elegivel para troca.",
      noPayment: "Nenhuma forma de pagamento encontrada."
    },
    confirmations: {
      deleteAddress: "Deseja excluir este endereco?",
      deleteCard: "Deseja excluir este cartao?"
    }
  },

  admin: {
    errors: {
      loadClientesFailed: "Erro ao buscar clientes.",
      updateStatusFailed: "Erro ao atualizar status.",
      loadPedidosFailed: "Erro ao buscar pedidos.",
      loadPedidoFailed: "Erro ao buscar pedido.",
      loadProdutosFailed: "Erro ao buscar produtos.",
      loadProdutoFailed: "Erro ao buscar produto.",
      loadEstoqueFailed: "Erro ao carregar estoque.",
      loadFornecedoresFailed: "Erro ao carregar fornecedores.",
      loadGraficosFailed: "Erro ao carregar grafico de vendas.",
      loadTrocasFailed: "Erro ao buscar solicitacoes de troca.",
      loadTrocaFailed: "Erro ao carregar solicitacao de troca.",
      exchangeEvaluateFailed: "Erro ao avaliar produto devolvido.",
      exchangeFinishFailed: "Erro ao finalizar solicitacao de troca.",
      fornecedorCreateFailed: "Erro ao cadastrar fornecedor.",
      loadEntradasFailed: "Erro ao carregar entradas.",
      entradaCreateFailed: "Erro ao registrar entrada.",
      cloudinaryLoadFailed: "Erro ao carregar Cloudinary.",
      cloudinarySignFailed: "Erro ao gerar assinatura.",
      invalidFile: "Arquivo invalido.",
      fornecedorRequired: "Preencha os dados do fornecedor.",
      entradaRequired: "Informe produto, fornecedor e quantidade.",
      custoInvalid: "Informe um custo valido."
    },
    empty: {
      noClientes: "Nenhum cliente encontrado.",
      noPedidos: "Nenhum pedido encontrado.",
      noProdutos: "Nenhum produto encontrado.",
      noFornecedores: "Nenhum fornecedor cadastrado.",
      noEntradas: "Nenhuma entrada registrada.",
      noGraficos: "Nenhuma venda encontrada para os filtros selecionados.",
      noTrocas: "Nenhuma solicitacao de troca encontrada.",
      noExchangeItems: "Nenhum item de troca encontrado.",
      noPayment: "Nenhum pagamento encontrado."
    },
    confirmations: {
      entregarProduto: "Deseja mover o pedido para EM TRANSPORTE?",
      confirmarEntrega: "Deseja mover o pedido para ENTREGUE?"
    }
  }
};

export function formatSystemMessage(template, values = {}) {
  return `${template || ""}`.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

export function getFirebaseAuthMessage(error) {
  const code = error?.code || extractFirebaseAuthCode(error?.message);
  if (!code) {
    return "";
  }
  return SYSTEM_MESSAGES.auth.errors.firebase[code] || "";
}

export function getErrorMessage(error, fallback = SYSTEM_MESSAGES.general.unexpectedError) {
  return getFirebaseAuthMessage(error) || error?.userMessage || error?.message || fallback;
}

export function systemError(error, fallback = SYSTEM_MESSAGES.general.unexpectedError) {
  return new Error(getErrorMessage(error, fallback));
}

function extractFirebaseAuthCode(message = "") {
  const match = `${message}`.match(/\((auth\/[^)]+)\)/);
  return match?.[1] || "";
}

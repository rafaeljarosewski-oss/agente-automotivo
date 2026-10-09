
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "anexos": {
                  Row: {
                    "caminho": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"descricao": string | null,"empresa_id": string,"entidade": string,"entidade_id": string,"id": string,"nome_arquivo": string | null,"tipo_conteudo": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caminho": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"descricao"?: string | null,"empresa_id"?: string,"entidade": string,"entidade_id": string,"id"?: string,"nome_arquivo"?: string | null,"tipo_conteudo"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "caminho"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"descricao"?: string | null,"empresa_id"?: string,"entidade"?: string,"entidade_id"?: string,"id"?: string,"nome_arquivo"?: string | null,"tipo_conteudo"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "anexos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"caixa_movimentos": {
                  Row: {
                    "caixa_id": string,"conta_pagar_id": string | null,"conta_receber_id": string | null,"created_at": string,"created_by": string | null,"descricao": string | null,"empresa_id": string,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"],"id": string,"tipo": Database["public"]['Enums']["tipo_mov_caixa"],"updated_at": string,"updated_by": string | null,"valor_centavos": number
                  }
                  ComputedFields: never
                  Insert: {
                    "caixa_id": string,"conta_pagar_id"?: string | null,"conta_receber_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"descricao"?: string | null,"empresa_id"?: string,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"],"id"?: string,"tipo": Database["public"]['Enums']["tipo_mov_caixa"],"updated_at"?: string,"updated_by"?: string | null,"valor_centavos": number
                  }
                  Update: {
                    "caixa_id"?: string,"conta_pagar_id"?: string | null,"conta_receber_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"descricao"?: string | null,"empresa_id"?: string,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"],"id"?: string,"tipo"?: Database["public"]['Enums']["tipo_mov_caixa"],"updated_at"?: string,"updated_by"?: string | null,"valor_centavos"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "caixa_movimentos_caixa_id_fkey"
      columns: ["caixa_id"]
isOneToOne: false
      referencedRelation: "caixas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "caixa_movimentos_conta_pagar_id_fkey"
      columns: ["conta_pagar_id"]
isOneToOne: false
      referencedRelation: "contas_pagar"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "caixa_movimentos_conta_receber_id_fkey"
      columns: ["conta_receber_id"]
isOneToOne: false
      referencedRelation: "contas_receber"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "caixa_movimentos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"caixas": {
                  Row: {
                    "aberto_em": string,"aberto_por": string | null,"conferencia": Json | null,"created_at": string,"created_by": string | null,"diferenca_centavos": number | null,"empresa_id": string,"fechado_em": string | null,"fechado_por": string | null,"id": string,"observacoes": string | null,"status": string,"updated_at": string,"updated_by": string | null,"valor_abertura_centavos": number
                  }
                  ComputedFields: never
                  Insert: {
                    "aberto_em"?: string,"aberto_por"?: string | null,"conferencia"?: Json | null,"created_at"?: string,"created_by"?: string | null,"diferenca_centavos"?: number | null,"empresa_id"?: string,"fechado_em"?: string | null,"fechado_por"?: string | null,"id"?: string,"observacoes"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string | null,"valor_abertura_centavos"?: number
                  }
                  Update: {
                    "aberto_em"?: string,"aberto_por"?: string | null,"conferencia"?: Json | null,"created_at"?: string,"created_by"?: string | null,"diferenca_centavos"?: number | null,"empresa_id"?: string,"fechado_em"?: string | null,"fechado_por"?: string | null,"id"?: string,"observacoes"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string | null,"valor_abertura_centavos"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "caixas_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"categorias_financeiras": {
                  Row: {
                    "ativo": boolean,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"empresa_id": string,"id": string,"nome": string,"tipo": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"empresa_id"?: string,"id"?: string,"nome": string,"tipo"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"empresa_id"?: string,"id"?: string,"nome"?: string,"tipo"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "categorias_financeiras_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"categorias_veiculo": {
                  Row: {
                    "ativo": boolean,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"empresa_id": string,"id": string,"nome": string,"ordem": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"empresa_id"?: string,"id"?: string,"nome": string,"ordem"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"empresa_id"?: string,"id"?: string,"nome"?: string,"ordem"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "categorias_veiculo_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"clientes": {
                  Row: {
                    "aceita_mensagens": boolean,"bairro": string | null,"busca": string | null,"cep": string | null,"cidade": string | null,"codigo_municipio": string | null,"complemento": string | null,"cpf_cnpj": string | null,"created_at": string,"created_by": string | null,"data_nascimento": string | null,"deleted_at": string | null,"deleted_by": string | null,"email": string | null,"empresa_id": string,"id": string,"inscricao_estadual": string | null,"logradouro": string | null,"nome": string,"nome_fantasia": string | null,"numero": string | null,"observacoes": string | null,"telefone": string | null,"tipo_pessoa": Database["public"]['Enums']["tipo_pessoa"],"uf": string | null,"updated_at": string,"updated_by": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aceita_mensagens"?: boolean,"bairro"?: string | null,"busca"?: never,"cep"?: string | null,"cidade"?: string | null,"codigo_municipio"?: string | null,"complemento"?: string | null,"cpf_cnpj"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_nascimento"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"email"?: string | null,"empresa_id"?: string,"id"?: string,"inscricao_estadual"?: string | null,"logradouro"?: string | null,"nome": string,"nome_fantasia"?: string | null,"numero"?: string | null,"observacoes"?: string | null,"telefone"?: string | null,"tipo_pessoa"?: Database["public"]['Enums']["tipo_pessoa"],"uf"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"whatsapp"?: string | null
                  }
                  Update: {
                    "aceita_mensagens"?: boolean,"bairro"?: string | null,"busca"?: never,"cep"?: string | null,"cidade"?: string | null,"codigo_municipio"?: string | null,"complemento"?: string | null,"cpf_cnpj"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_nascimento"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"email"?: string | null,"empresa_id"?: string,"id"?: string,"inscricao_estadual"?: string | null,"logradouro"?: string | null,"nome"?: string,"nome_fantasia"?: string | null,"numero"?: string | null,"observacoes"?: string | null,"telefone"?: string | null,"tipo_pessoa"?: Database["public"]['Enums']["tipo_pessoa"],"uf"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"whatsapp"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"comissoes": {
                  Row: {
                    "base_centavos": number,"competencia": string,"created_at": string,"created_by": string | null,"empresa_id": string,"id": string,"instalador_id": string,"os_id": string,"os_item_id": string | null,"pago_em": string | null,"status": string,"updated_at": string,"updated_by": string | null,"valor_centavos": number
                  }
                  ComputedFields: never
                  Insert: {
                    "base_centavos"?: number,"competencia"?: string,"created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"instalador_id": string,"os_id": string,"os_item_id"?: string | null,"pago_em"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string | null,"valor_centavos": number
                  }
                  Update: {
                    "base_centavos"?: number,"competencia"?: string,"created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"instalador_id"?: string,"os_id"?: string,"os_item_id"?: string | null,"pago_em"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string | null,"valor_centavos"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "comissoes_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_instalador_id_fkey"
      columns: ["instalador_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_os_id_fkey"
      columns: ["os_id"]
isOneToOne: false
      referencedRelation: "ordens_servico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_os_item_id_fkey"
      columns: ["os_item_id"]
isOneToOne: false
      referencedRelation: "os_itens"
      referencedColumns: ["id"]
    }
                  ]
                },"contadores": {
                  Row: {
                    "chave": string,"empresa_id": string,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "chave": string,"empresa_id": string,"valor"?: number
                  }
                  Update: {
                    "chave"?: string,"empresa_id"?: string,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "contadores_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"contas_pagar": {
                  Row: {
                    "caixa_id": string | null,"categoria_id": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"descricao": string,"documento": string | null,"empresa_id": string,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"] | null,"fornecedor": string | null,"id": string,"nota_compra_id": string | null,"observacoes": string | null,"pago_em": string | null,"status": Database["public"]['Enums']["status_titulo"],"updated_at": string,"updated_by": string | null,"valor_centavos": number,"valor_pago_centavos": number | null,"vencimento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "caixa_id"?: string | null,"categoria_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"descricao": string,"documento"?: string | null,"empresa_id"?: string,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"] | null,"fornecedor"?: string | null,"id"?: string,"nota_compra_id"?: string | null,"observacoes"?: string | null,"pago_em"?: string | null,"status"?: Database["public"]['Enums']["status_titulo"],"updated_at"?: string,"updated_by"?: string | null,"valor_centavos": number,"valor_pago_centavos"?: number | null,"vencimento": string
                  }
                  Update: {
                    "caixa_id"?: string | null,"categoria_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"descricao"?: string,"documento"?: string | null,"empresa_id"?: string,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"] | null,"fornecedor"?: string | null,"id"?: string,"nota_compra_id"?: string | null,"observacoes"?: string | null,"pago_em"?: string | null,"status"?: Database["public"]['Enums']["status_titulo"],"updated_at"?: string,"updated_by"?: string | null,"valor_centavos"?: number,"valor_pago_centavos"?: number | null,"vencimento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contas_pagar_caixa_id_fkey"
      columns: ["caixa_id"]
isOneToOne: false
      referencedRelation: "caixas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contas_pagar_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contas_pagar_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contas_pagar_nota_compra_id_fkey"
      columns: ["nota_compra_id"]
isOneToOne: false
      referencedRelation: "notas_compra"
      referencedColumns: ["id"]
    }
                  ]
                },"contas_receber": {
                  Row: {
                    "caixa_id": string | null,"cliente_id": string | null,"created_at": string,"created_by": string | null,"descricao": string,"empresa_id": string,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"] | null,"forma_pagamento_baixa": Database["public"]['Enums']["forma_pagamento"] | null,"id": string,"observacoes": string | null,"os_id": string | null,"pago_em": string | null,"parcela": number,"status": Database["public"]['Enums']["status_titulo"],"total_parcelas": number,"updated_at": string,"updated_by": string | null,"valor_centavos": number,"valor_pago_centavos": number | null,"vencimento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "caixa_id"?: string | null,"cliente_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"descricao": string,"empresa_id"?: string,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"] | null,"forma_pagamento_baixa"?: Database["public"]['Enums']["forma_pagamento"] | null,"id"?: string,"observacoes"?: string | null,"os_id"?: string | null,"pago_em"?: string | null,"parcela"?: number,"status"?: Database["public"]['Enums']["status_titulo"],"total_parcelas"?: number,"updated_at"?: string,"updated_by"?: string | null,"valor_centavos": number,"valor_pago_centavos"?: number | null,"vencimento": string
                  }
                  Update: {
                    "caixa_id"?: string | null,"cliente_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"descricao"?: string,"empresa_id"?: string,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"] | null,"forma_pagamento_baixa"?: Database["public"]['Enums']["forma_pagamento"] | null,"id"?: string,"observacoes"?: string | null,"os_id"?: string | null,"pago_em"?: string | null,"parcela"?: number,"status"?: Database["public"]['Enums']["status_titulo"],"total_parcelas"?: number,"updated_at"?: string,"updated_by"?: string | null,"valor_centavos"?: number,"valor_pago_centavos"?: number | null,"vencimento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contas_receber_caixa_id_fkey"
      columns: ["caixa_id"]
isOneToOne: false
      referencedRelation: "caixas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contas_receber_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contas_receber_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contas_receber_os_id_fkey"
      columns: ["os_id"]
isOneToOne: false
      referencedRelation: "ordens_servico"
      referencedColumns: ["id"]
    }
                  ]
                },"empresa_config_fiscal": {
                  Row: {
                    "aliquota_cbs": number,"aliquota_ibs_mun": number,"aliquota_ibs_uf": number,"ambiente": Database["public"]['Enums']["ambiente_fiscal"],"certificado_enviado_em": string | null,"certificado_serial": string | null,"certificado_titular": string | null,"certificado_validade": string | null,"created_at": string,"created_by": string | null,"empresa_cadastrada_api": boolean,"empresa_id": string,"informar_ibs_cbs": boolean,"natureza_operacao": string,"nfce_csc_cifrado": string | null,"nfce_csc_id": number | null,"nfce_proximo_numero": number,"nfce_serie": number,"nfe_proximo_numero": number,"nfe_serie": number,"nfse_aliquota_iss": number | null,"nfse_codigo_tributacao_municipal": string | null,"nfse_incentivo_fiscal": boolean,"nfse_provedor": string,"nfse_proximo_numero": number,"nfse_regime_especial": number | null,"nfse_serie": string,"ultima_sincronizacao_api": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aliquota_cbs"?: number,"aliquota_ibs_mun"?: number,"aliquota_ibs_uf"?: number,"ambiente"?: Database["public"]['Enums']["ambiente_fiscal"],"certificado_enviado_em"?: string | null,"certificado_serial"?: string | null,"certificado_titular"?: string | null,"certificado_validade"?: string | null,"created_at"?: string,"created_by"?: string | null,"empresa_cadastrada_api"?: boolean,"empresa_id": string,"informar_ibs_cbs"?: boolean,"natureza_operacao"?: string,"nfce_csc_cifrado"?: string | null,"nfce_csc_id"?: number | null,"nfce_proximo_numero"?: number,"nfce_serie"?: number,"nfe_proximo_numero"?: number,"nfe_serie"?: number,"nfse_aliquota_iss"?: number | null,"nfse_codigo_tributacao_municipal"?: string | null,"nfse_incentivo_fiscal"?: boolean,"nfse_provedor"?: string,"nfse_proximo_numero"?: number,"nfse_regime_especial"?: number | null,"nfse_serie"?: string,"ultima_sincronizacao_api"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "aliquota_cbs"?: number,"aliquota_ibs_mun"?: number,"aliquota_ibs_uf"?: number,"ambiente"?: Database["public"]['Enums']["ambiente_fiscal"],"certificado_enviado_em"?: string | null,"certificado_serial"?: string | null,"certificado_titular"?: string | null,"certificado_validade"?: string | null,"created_at"?: string,"created_by"?: string | null,"empresa_cadastrada_api"?: boolean,"empresa_id"?: string,"informar_ibs_cbs"?: boolean,"natureza_operacao"?: string,"nfce_csc_cifrado"?: string | null,"nfce_csc_id"?: number | null,"nfce_proximo_numero"?: number,"nfce_serie"?: number,"nfe_proximo_numero"?: number,"nfe_serie"?: number,"nfse_aliquota_iss"?: number | null,"nfse_codigo_tributacao_municipal"?: string | null,"nfse_incentivo_fiscal"?: boolean,"nfse_provedor"?: string,"nfse_proximo_numero"?: number,"nfse_regime_especial"?: number | null,"nfse_serie"?: string,"ultima_sincronizacao_api"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "empresa_config_fiscal_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: true
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"empresas": {
                  Row: {
                    "ativo": boolean,"bairro": string | null,"cep": string | null,"cidade": string | null,"cnae": string | null,"cnpj": string,"codigo_municipio": string | null,"complemento": string | null,"created_at": string,"created_by": string | null,"email": string | null,"id": string,"inscricao_estadual": string | null,"inscricao_municipal": string | null,"logo_path": string | null,"logradouro": string | null,"nome_fantasia": string | null,"numero": string | null,"razao_social": string,"regime_tributario": Database["public"]['Enums']["regime_tributario"],"telefone": string | null,"uf": string | null,"updated_at": string,"updated_by": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"bairro"?: string | null,"cep"?: string | null,"cidade"?: string | null,"cnae"?: string | null,"cnpj": string,"codigo_municipio"?: string | null,"complemento"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"inscricao_estadual"?: string | null,"inscricao_municipal"?: string | null,"logo_path"?: string | null,"logradouro"?: string | null,"nome_fantasia"?: string | null,"numero"?: string | null,"razao_social": string,"regime_tributario"?: Database["public"]['Enums']["regime_tributario"],"telefone"?: string | null,"uf"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"whatsapp"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"bairro"?: string | null,"cep"?: string | null,"cidade"?: string | null,"cnae"?: string | null,"cnpj"?: string,"codigo_municipio"?: string | null,"complemento"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"inscricao_estadual"?: string | null,"inscricao_municipal"?: string | null,"logo_path"?: string | null,"logradouro"?: string | null,"nome_fantasia"?: string | null,"numero"?: string | null,"razao_social"?: string,"regime_tributario"?: Database["public"]['Enums']["regime_tributario"],"telefone"?: string | null,"uf"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"fiscal_webhook_eventos": {
                  Row: {
                    "assinatura_valida": boolean,"erro": string | null,"id": string,"nota_id": string | null,"payload": Json | null,"processado_em": string | null,"provedor": string,"recebido_em": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assinatura_valida": boolean,"erro"?: string | null,"id"?: string,"nota_id"?: string | null,"payload"?: Json | null,"processado_em"?: string | null,"provedor": string,"recebido_em"?: string
                  }
                  Update: {
                    "assinatura_valida"?: boolean,"erro"?: string | null,"id"?: string,"nota_id"?: string | null,"payload"?: Json | null,"processado_em"?: string | null,"provedor"?: string,"recebido_em"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiscal_webhook_eventos_nota_id_fkey"
      columns: ["nota_id"]
isOneToOne: false
      referencedRelation: "notas_fiscais"
      referencedColumns: ["id"]
    }
                  ]
                },"linhas_pelicula": {
                  Row: {
                    "ativo": boolean,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"descricao": string | null,"empresa_id": string,"id": string,"marca": string | null,"nome": string,"ordem": number,"produto_id": string | null,"servico_id": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"descricao"?: string | null,"empresa_id"?: string,"id"?: string,"marca"?: string | null,"nome": string,"ordem"?: number,"produto_id"?: string | null,"servico_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"descricao"?: string | null,"empresa_id"?: string,"id"?: string,"marca"?: string | null,"nome"?: string,"ordem"?: number,"produto_id"?: string | null,"servico_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "linhas_pelicula_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "linhas_pelicula_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "linhas_pelicula_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                },"movimentacoes_estoque": {
                  Row: {
                    "created_at": string,"created_by": string | null,"custo_unitario_centavos": number | null,"empresa_id": string,"id": string,"motivo": string | null,"nota_compra_id": string | null,"os_id": string | null,"os_item_id": string | null,"produto_id": string,"quantidade": number,"rolo_id": string | null,"saldo_apos": number | null,"tipo": Database["public"]['Enums']["tipo_movimento_estoque"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"custo_unitario_centavos"?: number | null,"empresa_id"?: string,"id"?: string,"motivo"?: string | null,"nota_compra_id"?: string | null,"os_id"?: string | null,"os_item_id"?: string | null,"produto_id": string,"quantidade": number,"rolo_id"?: string | null,"saldo_apos"?: number | null,"tipo": Database["public"]['Enums']["tipo_movimento_estoque"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"custo_unitario_centavos"?: number | null,"empresa_id"?: string,"id"?: string,"motivo"?: string | null,"nota_compra_id"?: string | null,"os_id"?: string | null,"os_item_id"?: string | null,"produto_id"?: string,"quantidade"?: number,"rolo_id"?: string | null,"saldo_apos"?: number | null,"tipo"?: Database["public"]['Enums']["tipo_movimento_estoque"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimentacoes_estoque_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_estoque_nota_compra_id_fkey"
      columns: ["nota_compra_id"]
isOneToOne: false
      referencedRelation: "notas_compra"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_estoque_rolo_id_fkey"
      columns: ["rolo_id"]
isOneToOne: false
      referencedRelation: "rolos_pelicula"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_os_fk"
      columns: ["os_id"]
isOneToOne: false
      referencedRelation: "ordens_servico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_os_item_fk"
      columns: ["os_item_id"]
isOneToOne: false
      referencedRelation: "os_itens"
      referencedColumns: ["id"]
    }
                  ]
                },"nota_itens": {
                  Row: {
                    "aliquota_cbs": number | null,"aliquota_ibs_mun": number | null,"aliquota_ibs_uf": number | null,"aliquota_iss": number | null,"cclass_trib": string | null,"cfop": string | null,"codigo": string | null,"codigo_servico": string | null,"codigo_tributacao_municipal": string | null,"created_at": string,"created_by": string | null,"csosn": string | null,"cst_ibs_cbs": string | null,"cst_icms": string | null,"desconto_centavos": number,"descricao": string,"empresa_id": string,"id": string,"ncm": string | null,"nota_id": string,"numero_item": number,"origem": number | null,"os_item_id": string | null,"quantidade": number,"unidade": string,"updated_at": string,"updated_by": string | null,"valor_cbs_centavos": number,"valor_ibs_centavos": number,"valor_total_centavos": number,"valor_unitario_centavos": number
                  }
                  ComputedFields: never
                  Insert: {
                    "aliquota_cbs"?: number | null,"aliquota_ibs_mun"?: number | null,"aliquota_ibs_uf"?: number | null,"aliquota_iss"?: number | null,"cclass_trib"?: string | null,"cfop"?: string | null,"codigo"?: string | null,"codigo_servico"?: string | null,"codigo_tributacao_municipal"?: string | null,"created_at"?: string,"created_by"?: string | null,"csosn"?: string | null,"cst_ibs_cbs"?: string | null,"cst_icms"?: string | null,"desconto_centavos"?: number,"descricao": string,"empresa_id"?: string,"id"?: string,"ncm"?: string | null,"nota_id": string,"numero_item": number,"origem"?: number | null,"os_item_id"?: string | null,"quantidade": number,"unidade"?: string,"updated_at"?: string,"updated_by"?: string | null,"valor_cbs_centavos"?: number,"valor_ibs_centavos"?: number,"valor_total_centavos": number,"valor_unitario_centavos": number
                  }
                  Update: {
                    "aliquota_cbs"?: number | null,"aliquota_ibs_mun"?: number | null,"aliquota_ibs_uf"?: number | null,"aliquota_iss"?: number | null,"cclass_trib"?: string | null,"cfop"?: string | null,"codigo"?: string | null,"codigo_servico"?: string | null,"codigo_tributacao_municipal"?: string | null,"created_at"?: string,"created_by"?: string | null,"csosn"?: string | null,"cst_ibs_cbs"?: string | null,"cst_icms"?: string | null,"desconto_centavos"?: number,"descricao"?: string,"empresa_id"?: string,"id"?: string,"ncm"?: string | null,"nota_id"?: string,"numero_item"?: number,"origem"?: number | null,"os_item_id"?: string | null,"quantidade"?: number,"unidade"?: string,"updated_at"?: string,"updated_by"?: string | null,"valor_cbs_centavos"?: number,"valor_ibs_centavos"?: number,"valor_total_centavos"?: number,"valor_unitario_centavos"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "nota_itens_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nota_itens_nota_id_fkey"
      columns: ["nota_id"]
isOneToOne: false
      referencedRelation: "notas_fiscais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nota_itens_os_item_id_fkey"
      columns: ["os_item_id"]
isOneToOne: false
      referencedRelation: "os_itens"
      referencedColumns: ["id"]
    }
                  ]
                },"notas_compra": {
                  Row: {
                    "chave": string | null,"created_at": string,"created_by": string | null,"data_emissao": string | null,"empresa_id": string,"fornecedor_cnpj": string | null,"fornecedor_nome": string | null,"id": string,"numero": string | null,"serie": string | null,"updated_at": string,"updated_by": string | null,"valor_total_centavos": number,"xml_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "chave"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_emissao"?: string | null,"empresa_id"?: string,"fornecedor_cnpj"?: string | null,"fornecedor_nome"?: string | null,"id"?: string,"numero"?: string | null,"serie"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"valor_total_centavos"?: number,"xml_path"?: string | null
                  }
                  Update: {
                    "chave"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_emissao"?: string | null,"empresa_id"?: string,"fornecedor_cnpj"?: string | null,"fornecedor_nome"?: string | null,"id"?: string,"numero"?: string | null,"serie"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"valor_total_centavos"?: number,"xml_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_compra_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"notas_eventos": {
                  Row: {
                    "created_at": string,"created_by": string | null,"empresa_id": string,"id": string,"mensagem": string | null,"nota_id": string,"pdf_path": string | null,"protocolo": string | null,"provedor_id": string | null,"resposta": Json | null,"sequencia": number,"status": string,"texto": string,"tipo": string,"updated_at": string,"updated_by": string | null,"xml_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"mensagem"?: string | null,"nota_id": string,"pdf_path"?: string | null,"protocolo"?: string | null,"provedor_id"?: string | null,"resposta"?: Json | null,"sequencia"?: number,"status"?: string,"texto": string,"tipo": string,"updated_at"?: string,"updated_by"?: string | null,"xml_path"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"mensagem"?: string | null,"nota_id"?: string,"pdf_path"?: string | null,"protocolo"?: string | null,"provedor_id"?: string | null,"resposta"?: Json | null,"sequencia"?: number,"status"?: string,"texto"?: string,"tipo"?: string,"updated_at"?: string,"updated_by"?: string | null,"xml_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_eventos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_eventos_nota_id_fkey"
      columns: ["nota_id"]
isOneToOne: false
      referencedRelation: "notas_fiscais"
      referencedColumns: ["id"]
    }
                  ]
                },"notas_fiscais": {
                  Row: {
                    "ambiente": Database["public"]['Enums']["ambiente_fiscal"],"cancelada_em": string | null,"chave": string | null,"cliente_id": string | null,"codigo_rejeicao": string | null,"codigo_verificacao": string | null,"created_at": string,"created_by": string | null,"data_emissao": string | null,"empresa_id": string,"id": string,"link_url": string | null,"mensagens": Json | null,"motivo_amigavel": string | null,"motivo_cancelamento": string | null,"motivo_rejeicao": string | null,"nfse_provedor": string | null,"numero": string | null,"os_id": string | null,"payload": Json | null,"pdf_path": string | null,"protocolo": string | null,"provedor": string,"provedor_id": string | null,"proxima_sincronizacao": string | null,"referencia": string,"resposta": Json | null,"serie": string | null,"status": Database["public"]['Enums']["status_nota"],"tentativas": number,"tipo": Database["public"]['Enums']["tipo_nota"],"token_publico": string,"ultima_sincronizacao": string | null,"updated_at": string,"updated_by": string | null,"valor_cbs_centavos": number,"valor_ibs_centavos": number,"valor_total_centavos": number,"xml_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ambiente": Database["public"]['Enums']["ambiente_fiscal"],"cancelada_em"?: string | null,"chave"?: string | null,"cliente_id"?: string | null,"codigo_rejeicao"?: string | null,"codigo_verificacao"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_emissao"?: string | null,"empresa_id"?: string,"id"?: string,"link_url"?: string | null,"mensagens"?: Json | null,"motivo_amigavel"?: string | null,"motivo_cancelamento"?: string | null,"motivo_rejeicao"?: string | null,"nfse_provedor"?: string | null,"numero"?: string | null,"os_id"?: string | null,"payload"?: Json | null,"pdf_path"?: string | null,"protocolo"?: string | null,"provedor": string,"provedor_id"?: string | null,"proxima_sincronizacao"?: string | null,"referencia": string,"resposta"?: Json | null,"serie"?: string | null,"status"?: Database["public"]['Enums']["status_nota"],"tentativas"?: number,"tipo": Database["public"]['Enums']["tipo_nota"],"token_publico"?: string,"ultima_sincronizacao"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"valor_cbs_centavos"?: number,"valor_ibs_centavos"?: number,"valor_total_centavos"?: number,"xml_path"?: string | null
                  }
                  Update: {
                    "ambiente"?: Database["public"]['Enums']["ambiente_fiscal"],"cancelada_em"?: string | null,"chave"?: string | null,"cliente_id"?: string | null,"codigo_rejeicao"?: string | null,"codigo_verificacao"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_emissao"?: string | null,"empresa_id"?: string,"id"?: string,"link_url"?: string | null,"mensagens"?: Json | null,"motivo_amigavel"?: string | null,"motivo_cancelamento"?: string | null,"motivo_rejeicao"?: string | null,"nfse_provedor"?: string | null,"numero"?: string | null,"os_id"?: string | null,"payload"?: Json | null,"pdf_path"?: string | null,"protocolo"?: string | null,"provedor"?: string,"provedor_id"?: string | null,"proxima_sincronizacao"?: string | null,"referencia"?: string,"resposta"?: Json | null,"serie"?: string | null,"status"?: Database["public"]['Enums']["status_nota"],"tentativas"?: number,"tipo"?: Database["public"]['Enums']["tipo_nota"],"token_publico"?: string,"ultima_sincronizacao"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"valor_cbs_centavos"?: number,"valor_ibs_centavos"?: number,"valor_total_centavos"?: number,"xml_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_fiscais_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_os_id_fkey"
      columns: ["os_id"]
isOneToOne: false
      referencedRelation: "ordens_servico"
      referencedColumns: ["id"]
    }
                  ]
                },"numeros_serie": {
                  Row: {
                    "created_at": string,"created_by": string | null,"empresa_id": string,"id": string,"numero": string,"os_item_id": string | null,"produto_id": string,"status": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"numero": string,"os_item_id"?: string | null,"produto_id": string,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"numero"?: string,"os_item_id"?: string | null,"produto_id"?: string,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "numeros_serie_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "numeros_serie_os_item_fk"
      columns: ["os_item_id"]
isOneToOne: false
      referencedRelation: "os_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "numeros_serie_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"orcamento_itens": {
                  Row: {
                    "area_m2": number | null,"consumo_metros": number | null,"created_at": string,"created_by": string | null,"desconto_centavos": number,"descricao": string,"empresa_id": string,"id": string,"linha_pelicula_id": string | null,"medidas": Json | null,"orcamento_id": string,"ordem": number,"preco_unitario_centavos": number,"produto_id": string | null,"quantidade": number,"servico_id": string | null,"tipo": Database["public"]['Enums']["tipo_item"],"total_centavos": number,"unidade": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_m2"?: number | null,"consumo_metros"?: number | null,"created_at"?: string,"created_by"?: string | null,"desconto_centavos"?: number,"descricao": string,"empresa_id"?: string,"id"?: string,"linha_pelicula_id"?: string | null,"medidas"?: Json | null,"orcamento_id": string,"ordem"?: number,"preco_unitario_centavos"?: number,"produto_id"?: string | null,"quantidade"?: number,"servico_id"?: string | null,"tipo": Database["public"]['Enums']["tipo_item"],"total_centavos"?: number,"unidade"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "area_m2"?: number | null,"consumo_metros"?: number | null,"created_at"?: string,"created_by"?: string | null,"desconto_centavos"?: number,"descricao"?: string,"empresa_id"?: string,"id"?: string,"linha_pelicula_id"?: string | null,"medidas"?: Json | null,"orcamento_id"?: string,"ordem"?: number,"preco_unitario_centavos"?: number,"produto_id"?: string | null,"quantidade"?: number,"servico_id"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_item"],"total_centavos"?: number,"unidade"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orcamento_itens_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_itens_linha_pelicula_id_fkey"
      columns: ["linha_pelicula_id"]
isOneToOne: false
      referencedRelation: "linhas_pelicula"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_itens_orcamento_id_fkey"
      columns: ["orcamento_id"]
isOneToOne: false
      referencedRelation: "orcamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_itens_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamento_itens_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                },"orcamentos": {
                  Row: {
                    "aprovado_em": string | null,"cliente_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"desconto_itens_centavos": number,"desconto_total_centavos": number,"empresa_id": string,"enviado_em": string | null,"id": string,"motivo_recusa": string | null,"numero": number,"observacoes": string | null,"recusado_em": string | null,"status": Database["public"]['Enums']["status_orcamento"],"subtotal_centavos": number,"token_publico": string,"total_centavos": number,"updated_at": string,"updated_by": string | null,"validade": string,"veiculo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aprovado_em"?: string | null,"cliente_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"desconto_itens_centavos"?: number,"desconto_total_centavos"?: number,"empresa_id"?: string,"enviado_em"?: string | null,"id"?: string,"motivo_recusa"?: string | null,"numero": number,"observacoes"?: string | null,"recusado_em"?: string | null,"status"?: Database["public"]['Enums']["status_orcamento"],"subtotal_centavos"?: number,"token_publico"?: string,"total_centavos"?: number,"updated_at"?: string,"updated_by"?: string | null,"validade"?: string,"veiculo_id"?: string | null
                  }
                  Update: {
                    "aprovado_em"?: string | null,"cliente_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"desconto_itens_centavos"?: number,"desconto_total_centavos"?: number,"empresa_id"?: string,"enviado_em"?: string | null,"id"?: string,"motivo_recusa"?: string | null,"numero"?: number,"observacoes"?: string | null,"recusado_em"?: string | null,"status"?: Database["public"]['Enums']["status_orcamento"],"subtotal_centavos"?: number,"token_publico"?: string,"total_centavos"?: number,"updated_at"?: string,"updated_by"?: string | null,"validade"?: string,"veiculo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orcamentos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamentos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orcamentos_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    }
                  ]
                },"ordens_servico": {
                  Row: {
                    "cancelada_em": string | null,"cliente_id": string,"concluida_em": string | null,"concluida_por": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"desconto_itens_centavos": number,"desconto_total_centavos": number,"empresa_id": string,"entregue_em": string | null,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"] | null,"id": string,"iniciada_em": string | null,"instalador_id": string | null,"km": number | null,"motivo_cancelamento": string | null,"numero": number,"observacoes": string | null,"observacoes_internas": string | null,"orcamento_id": string | null,"parcelas": number,"previsao_entrega": string | null,"status": Database["public"]['Enums']["status_os"],"subtotal_centavos": number,"token_publico": string,"total_centavos": number,"updated_at": string,"updated_by": string | null,"veiculo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelada_em"?: string | null,"cliente_id": string,"concluida_em"?: string | null,"concluida_por"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"desconto_itens_centavos"?: number,"desconto_total_centavos"?: number,"empresa_id"?: string,"entregue_em"?: string | null,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"] | null,"id"?: string,"iniciada_em"?: string | null,"instalador_id"?: string | null,"km"?: number | null,"motivo_cancelamento"?: string | null,"numero": number,"observacoes"?: string | null,"observacoes_internas"?: string | null,"orcamento_id"?: string | null,"parcelas"?: number,"previsao_entrega"?: string | null,"status"?: Database["public"]['Enums']["status_os"],"subtotal_centavos"?: number,"token_publico"?: string,"total_centavos"?: number,"updated_at"?: string,"updated_by"?: string | null,"veiculo_id"?: string | null
                  }
                  Update: {
                    "cancelada_em"?: string | null,"cliente_id"?: string,"concluida_em"?: string | null,"concluida_por"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"desconto_itens_centavos"?: number,"desconto_total_centavos"?: number,"empresa_id"?: string,"entregue_em"?: string | null,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"] | null,"id"?: string,"iniciada_em"?: string | null,"instalador_id"?: string | null,"km"?: number | null,"motivo_cancelamento"?: string | null,"numero"?: number,"observacoes"?: string | null,"observacoes_internas"?: string | null,"orcamento_id"?: string | null,"parcelas"?: number,"previsao_entrega"?: string | null,"status"?: Database["public"]['Enums']["status_os"],"subtotal_centavos"?: number,"token_publico"?: string,"total_centavos"?: number,"updated_at"?: string,"updated_by"?: string | null,"veiculo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ordens_servico_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ordens_servico_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ordens_servico_instalador_id_fkey"
      columns: ["instalador_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ordens_servico_orcamento_id_fkey"
      columns: ["orcamento_id"]
isOneToOne: false
      referencedRelation: "orcamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ordens_servico_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    }
                  ]
                },"os_historico": {
                  Row: {
                    "created_at": string,"created_by": string | null,"empresa_id": string,"id": string,"observacao": string | null,"os_id": string,"status_anterior": Database["public"]['Enums']["status_os"] | null,"status_novo": Database["public"]['Enums']["status_os"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"empresa_id": string,"id"?: string,"observacao"?: string | null,"os_id": string,"status_anterior"?: Database["public"]['Enums']["status_os"] | null,"status_novo": Database["public"]['Enums']["status_os"]
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"observacao"?: string | null,"os_id"?: string,"status_anterior"?: Database["public"]['Enums']["status_os"] | null,"status_novo"?: Database["public"]['Enums']["status_os"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "os_historico_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "os_historico_os_id_fkey"
      columns: ["os_id"]
isOneToOne: false
      referencedRelation: "ordens_servico"
      referencedColumns: ["id"]
    }
                  ]
                },"os_itens": {
                  Row: {
                    "area_m2": number | null,"consumo_metros": number | null,"created_at": string,"created_by": string | null,"desconto_centavos": number,"descricao": string,"empresa_id": string,"id": string,"instalador_id": string | null,"linha_pelicula_id": string | null,"medidas": Json | null,"numeros_serie": (string)[],"ordem": number,"os_id": string,"preco_unitario_centavos": number,"produto_id": string | null,"quantidade": number,"servico_id": string | null,"tipo": Database["public"]['Enums']["tipo_item"],"total_centavos": number,"unidade": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_m2"?: number | null,"consumo_metros"?: number | null,"created_at"?: string,"created_by"?: string | null,"desconto_centavos"?: number,"descricao": string,"empresa_id"?: string,"id"?: string,"instalador_id"?: string | null,"linha_pelicula_id"?: string | null,"medidas"?: Json | null,"numeros_serie"?: (string)[],"ordem"?: number,"os_id": string,"preco_unitario_centavos"?: number,"produto_id"?: string | null,"quantidade"?: number,"servico_id"?: string | null,"tipo": Database["public"]['Enums']["tipo_item"],"total_centavos"?: number,"unidade"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "area_m2"?: number | null,"consumo_metros"?: number | null,"created_at"?: string,"created_by"?: string | null,"desconto_centavos"?: number,"descricao"?: string,"empresa_id"?: string,"id"?: string,"instalador_id"?: string | null,"linha_pelicula_id"?: string | null,"medidas"?: Json | null,"numeros_serie"?: (string)[],"ordem"?: number,"os_id"?: string,"preco_unitario_centavos"?: number,"produto_id"?: string | null,"quantidade"?: number,"servico_id"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_item"],"total_centavos"?: number,"unidade"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "os_itens_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "os_itens_instalador_id_fkey"
      columns: ["instalador_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "os_itens_linha_pelicula_id_fkey"
      columns: ["linha_pelicula_id"]
isOneToOne: false
      referencedRelation: "linhas_pelicula"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "os_itens_os_id_fkey"
      columns: ["os_id"]
isOneToOne: false
      referencedRelation: "ordens_servico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "os_itens_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "os_itens_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                },"perfis": {
                  Row: {
                    "ativo": boolean,"created_at": string,"created_by": string | null,"email": string,"empresa_id": string,"id": string,"nome": string,"papel": Database["public"]['Enums']["papel_usuario"],"telefone": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"email": string,"empresa_id": string,"id": string,"nome": string,"papel"?: Database["public"]['Enums']["papel_usuario"],"telefone"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"email"?: string,"empresa_id"?: string,"id"?: string,"nome"?: string,"papel"?: Database["public"]['Enums']["papel_usuario"],"telefone"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfis_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"produto_codigos_fornecedor": {
                  Row: {
                    "codigo_fornecedor": string,"created_at": string,"created_by": string | null,"empresa_id": string,"fornecedor_cnpj": string,"id": string,"produto_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo_fornecedor": string,"created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"fornecedor_cnpj": string,"id"?: string,"produto_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "codigo_fornecedor"?: string,"created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"fornecedor_cnpj"?: string,"id"?: string,"produto_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "produto_codigos_fornecedor_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "produto_codigos_fornecedor_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"produtos": {
                  Row: {
                    "aliquota_icms": number | null,"ativo": boolean,"busca": string | null,"categoria": string,"cclass_trib": string | null,"cest": string | null,"cfop": string | null,"codigo": string | null,"codigo_barras": string | null,"created_at": string,"created_by": string | null,"csosn": string | null,"cst_cofins": string | null,"cst_ibs_cbs": string | null,"cst_icms": string | null,"cst_pis": string | null,"custo_centavos": number,"deleted_at": string | null,"deleted_by": string | null,"descricao": string | null,"empresa_id": string,"estoque_atual": number,"estoque_minimo": number,"exige_numero_serie": boolean,"fiscal_validado": boolean,"garantia_dias": number | null,"id": string,"largura_rolo_m": number | null,"marca": string | null,"ncm": string | null,"nome": string,"origem": number,"preco_venda_centavos": number,"tipo_controle": Database["public"]['Enums']["tipo_controle_estoque"],"unidade": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aliquota_icms"?: number | null,"ativo"?: boolean,"busca"?: never,"categoria"?: string,"cclass_trib"?: string | null,"cest"?: string | null,"cfop"?: string | null,"codigo"?: string | null,"codigo_barras"?: string | null,"created_at"?: string,"created_by"?: string | null,"csosn"?: string | null,"cst_cofins"?: string | null,"cst_ibs_cbs"?: string | null,"cst_icms"?: string | null,"cst_pis"?: string | null,"custo_centavos"?: number,"deleted_at"?: string | null,"deleted_by"?: string | null,"descricao"?: string | null,"empresa_id"?: string,"estoque_atual"?: number,"estoque_minimo"?: number,"exige_numero_serie"?: boolean,"fiscal_validado"?: boolean,"garantia_dias"?: number | null,"id"?: string,"largura_rolo_m"?: number | null,"marca"?: string | null,"ncm"?: string | null,"nome": string,"origem"?: number,"preco_venda_centavos"?: number,"tipo_controle"?: Database["public"]['Enums']["tipo_controle_estoque"],"unidade"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "aliquota_icms"?: number | null,"ativo"?: boolean,"busca"?: never,"categoria"?: string,"cclass_trib"?: string | null,"cest"?: string | null,"cfop"?: string | null,"codigo"?: string | null,"codigo_barras"?: string | null,"created_at"?: string,"created_by"?: string | null,"csosn"?: string | null,"cst_cofins"?: string | null,"cst_ibs_cbs"?: string | null,"cst_icms"?: string | null,"cst_pis"?: string | null,"custo_centavos"?: number,"deleted_at"?: string | null,"deleted_by"?: string | null,"descricao"?: string | null,"empresa_id"?: string,"estoque_atual"?: number,"estoque_minimo"?: number,"exige_numero_serie"?: boolean,"fiscal_validado"?: boolean,"garantia_dias"?: number | null,"id"?: string,"largura_rolo_m"?: number | null,"marca"?: string | null,"ncm"?: string | null,"nome"?: string,"origem"?: number,"preco_venda_centavos"?: number,"tipo_controle"?: Database["public"]['Enums']["tipo_controle_estoque"],"unidade"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "produtos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"rolos_pelicula": {
                  Row: {
                    "ativo": boolean,"created_at": string,"created_by": string | null,"empresa_id": string,"id": string,"identificacao": string | null,"metragem_inicial": number,"nota_compra_id": string | null,"produto_id": string,"saldo_metros": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"identificacao"?: string | null,"metragem_inicial": number,"nota_compra_id"?: string | null,"produto_id": string,"saldo_metros": number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"identificacao"?: string | null,"metragem_inicial"?: number,"nota_compra_id"?: string | null,"produto_id"?: string,"saldo_metros"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "rolos_pelicula_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rolos_pelicula_nota_compra_id_fkey"
      columns: ["nota_compra_id"]
isOneToOne: false
      referencedRelation: "notas_compra"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rolos_pelicula_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"servico_precos_categoria": {
                  Row: {
                    "categoria_id": string,"created_at": string,"created_by": string | null,"empresa_id": string,"id": string,"preco_centavos": number,"servico_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_id": string,"created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"preco_centavos": number,"servico_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "categoria_id"?: string,"created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"preco_centavos"?: number,"servico_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "servico_precos_categoria_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_veiculo"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servico_precos_categoria_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servico_precos_categoria_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                },"servicos": {
                  Row: {
                    "aliquota_iss": number | null,"ativo": boolean,"busca": string | null,"categoria": string,"cclass_trib": string | null,"codigo": string | null,"codigo_nbs": string | null,"codigo_servico": string | null,"codigo_tributacao_municipal": string | null,"comissao_fixo_centavos": number,"comissao_percentual": number,"comissao_tipo": Database["public"]['Enums']["tipo_comissao"],"created_at": string,"created_by": string | null,"cst_ibs_cbs": string | null,"deleted_at": string | null,"deleted_by": string | null,"descricao": string | null,"empresa_id": string,"fiscal_validado": boolean,"garantia_dias": number | null,"id": string,"nome": string,"perda_percentual": number,"preco_centavos": number,"produto_consumo_id": string | null,"tempo_estimado_min": number | null,"tipo_preco": Database["public"]['Enums']["tipo_preco_servico"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aliquota_iss"?: number | null,"ativo"?: boolean,"busca"?: never,"categoria"?: string,"cclass_trib"?: string | null,"codigo"?: string | null,"codigo_nbs"?: string | null,"codigo_servico"?: string | null,"codigo_tributacao_municipal"?: string | null,"comissao_fixo_centavos"?: number,"comissao_percentual"?: number,"comissao_tipo"?: Database["public"]['Enums']["tipo_comissao"],"created_at"?: string,"created_by"?: string | null,"cst_ibs_cbs"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"descricao"?: string | null,"empresa_id"?: string,"fiscal_validado"?: boolean,"garantia_dias"?: number | null,"id"?: string,"nome": string,"perda_percentual"?: number,"preco_centavos"?: number,"produto_consumo_id"?: string | null,"tempo_estimado_min"?: number | null,"tipo_preco"?: Database["public"]['Enums']["tipo_preco_servico"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "aliquota_iss"?: number | null,"ativo"?: boolean,"busca"?: never,"categoria"?: string,"cclass_trib"?: string | null,"codigo"?: string | null,"codigo_nbs"?: string | null,"codigo_servico"?: string | null,"codigo_tributacao_municipal"?: string | null,"comissao_fixo_centavos"?: number,"comissao_percentual"?: number,"comissao_tipo"?: Database["public"]['Enums']["tipo_comissao"],"created_at"?: string,"created_by"?: string | null,"cst_ibs_cbs"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"descricao"?: string | null,"empresa_id"?: string,"fiscal_validado"?: boolean,"garantia_dias"?: number | null,"id"?: string,"nome"?: string,"perda_percentual"?: number,"preco_centavos"?: number,"produto_consumo_id"?: string | null,"tempo_estimado_min"?: number | null,"tipo_preco"?: Database["public"]['Enums']["tipo_preco_servico"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "servicos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servicos_produto_consumo_id_fkey"
      columns: ["produto_consumo_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"tabela_precos_pelicula": {
                  Row: {
                    "categoria_id": string,"consumo_metros": number,"created_at": string,"created_by": string | null,"empresa_id": string,"id": string,"linha_id": string,"preco_centavos": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_id": string,"consumo_metros"?: number,"created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"linha_id": string,"preco_centavos": number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "categoria_id"?: string,"consumo_metros"?: number,"created_at"?: string,"created_by"?: string | null,"empresa_id"?: string,"id"?: string,"linha_id"?: string,"preco_centavos"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tabela_precos_pelicula_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_veiculo"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tabela_precos_pelicula_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tabela_precos_pelicula_linha_id_fkey"
      columns: ["linha_id"]
isOneToOne: false
      referencedRelation: "linhas_pelicula"
      referencedColumns: ["id"]
    }
                  ]
                },"veiculos": {
                  Row: {
                    "ano_fabricacao": number | null,"ano_modelo": number | null,"categoria_id": string | null,"chassi": string | null,"cliente_id": string,"cor": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"empresa_id": string,"id": string,"marca": string | null,"modelo": string,"observacoes": string | null,"placa": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ano_fabricacao"?: number | null,"ano_modelo"?: number | null,"categoria_id"?: string | null,"chassi"?: string | null,"cliente_id": string,"cor"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"empresa_id"?: string,"id"?: string,"marca"?: string | null,"modelo": string,"observacoes"?: string | null,"placa": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "ano_fabricacao"?: number | null,"ano_modelo"?: number | null,"categoria_id"?: string | null,"chassi"?: string | null,"cliente_id"?: string,"cor"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"empresa_id"?: string,"id"?: string,"marca"?: string | null,"modelo"?: string,"observacoes"?: string | null,"placa"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "veiculos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_veiculo"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_baixar_metros":
{ Args: { "p_empresa": string,"p_item": string,"p_metros": number,"p_motivo": string,"p_os": string,"p_produto": string }; Returns: undefined
                           },
"abrir_caixa":
{ Args: { "p_observacoes"?: string,"p_valor_abertura": number }; Returns: string
                           },
"ajustar_estoque":
{ Args: { "p_delta": number,"p_motivo": string,"p_produto": string,"p_rolo"?: string }; Returns: string
                           },
"alterar_status_os":
{ Args: { "p_observacao"?: string,"p_os": string,"p_status": Database["public"]['Enums']["status_os"] }; Returns: undefined
                           },
"aplicar_gatilhos_padrao":
{ Args: { "p_multiempresa"?: boolean,"p_soft_delete"?: boolean,"p_tabela": unknown }; Returns: undefined
                           },
"baixar_conta_receber":
{ Args: { "p_conta": string,"p_data"?: string,"p_forma": Database["public"]['Enums']["forma_pagamento"],"p_valor_pago": number }; Returns: undefined
                           },
"buscar_clientes":
{ Args: { "p_limite"?: number,"p_termo": string }; Returns: {
              "cpf_cnpj": string,"id": string,"nome": string,"placas": string,"telefone": string,"tipo_pessoa": Database["public"]['Enums']["tipo_pessoa"],"whatsapp": string
            }[]
                           },
"caixa_aberto":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"cliente_do_instalador":
{ Args: { "p_cliente": string }; Returns: boolean
                           },
"concluir_os":
{ Args: { "p_comissoes"?: Json,"p_os": string,"p_parcelas": Json,"p_series"?: Json }; Returns: undefined
                           },
"criar_politicas":
{ Args: { "p_escrita": (Database["public"]['Enums']["papel_usuario"])[],"p_leitura": (Database["public"]['Enums']["papel_usuario"])[],"p_permite_delete"?: boolean,"p_tabela": string }; Returns: undefined
                           },
"empresa_atual":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"expirar_orcamentos":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"fechar_caixa":
{ Args: { "p_conferencia": Json,"p_observacoes"?: string }; Returns: string
                           },
"gerar_os_de_orcamento":
{ Args: { "p_instalador"?: string,"p_orcamento": string }; Returns: string
                           },
"gerar_token":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"movimentar_caixa":
{ Args: { "p_descricao": string,"p_tipo": Database["public"]['Enums']["tipo_mov_caixa"],"p_valor": number }; Returns: string
                           },
"normalizar_busca":
{ Args: { "p": string }; Returns: string
                           },
"os_do_instalador":
{ Args: { "p_os": string }; Returns: boolean
                           },
"pagar_conta_pagar":
{ Args: { "p_conta": string,"p_data"?: string,"p_forma": Database["public"]['Enums']["forma_pagamento"],"p_valor_pago": number }; Returns: undefined
                           },
"painel_indicadores":
{ Args: { "p_hoje"?: string }; Returns: Json
                           },
"papel_atual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["papel_usuario"]
                           },
"proximo_numero":
{ Args: { "p_chave": string,"p_empresa": string }; Returns: number
                           },
"registrar_entrada_estoque":
{ Args: { "p_custo_unitario_centavos"?: number,"p_identificacao_rolo"?: string,"p_motivo"?: string,"p_nota_compra"?: string,"p_numeros_serie"?: (string)[],"p_produto": string,"p_quantidade": number }; Returns: string
                           },
"relatorio_comissoes":
{ Args: { "p_fim": string,"p_inicio": string }; Returns: {
              "base_centavos": number,"comissao_centavos": number,"instalador_id": string,"instalador_nome": string,"quantidade_itens": number,"quantidade_os": number
            }[]
                           },
"relatorio_faturamento":
{ Args: { "p_fim": string,"p_inicio": string }; Returns: {
              "dia": string,"faturado_centavos": number,"quantidade_os": number,"recebido_centavos": number
            }[]
                           },
"relatorio_mais_vendidos":
{ Args: { "p_fim": string,"p_inicio": string }; Returns: {
              "descricao": string,"qtd_os": number,"quantidade": number,"referencia_id": string,"tipo": Database["public"]['Enums']["tipo_item"],"total_centavos": number
            }[]
                           },
"reservar_numero_nota":
{ Args: { "p_tipo": Database["public"]['Enums']["tipo_nota"] }; Returns: {
              "numero": number,"serie": string
            }[]
                           },
"resumo_caixa":
{ Args: { "p_caixa": string }; Returns: {
              "entradas": number,"esperado": number,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"],"saidas": number
            }[]
                           },
"somente_digitos":
{ Args: { "p": string }; Returns: string
                           },
"tem_papel":
{ Args: { "p_papeis": (Database["public"]['Enums']["papel_usuario"])[] }; Returns: boolean
                           },
"veiculo_do_instalador":
{ Args: { "p_veiculo": string }; Returns: boolean
                           }
          }
          Enums: {
            "ambiente_fiscal": "homologacao"|"producao","forma_pagamento": "dinheiro"|"pix"|"debito"|"credito_vista"|"credito_parcelado"|"boleto","papel_usuario": "admin"|"atendente"|"instalador","regime_tributario": "simples_nacional"|"simples_excesso"|"normal"|"mei","status_nota": "rascunho"|"processando"|"autorizada"|"rejeitada"|"cancelada"|"erro","status_orcamento": "rascunho"|"enviado"|"aprovado"|"recusado"|"expirado","status_os": "aberta"|"em_execucao"|"aguardando_peca"|"concluida"|"entregue"|"cancelada","status_titulo": "aberto"|"pago"|"cancelado","tipo_comissao": "nenhuma"|"percentual"|"fixo","tipo_controle_estoque": "unidade"|"metro","tipo_item": "servico"|"produto","tipo_mov_caixa": "abertura"|"sangria"|"reforco"|"recebimento"|"pagamento","tipo_movimento_estoque": "entrada"|"saida"|"ajuste","tipo_nota": "nfse"|"nfce"|"nfe","tipo_pessoa": "PF"|"PJ","tipo_preco_servico": "fixo"|"categoria"|"m2"|"pelicula"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "ambiente_fiscal": ["homologacao", "producao"],"forma_pagamento": ["dinheiro", "pix", "debito", "credito_vista", "credito_parcelado", "boleto"],"papel_usuario": ["admin", "atendente", "instalador"],"regime_tributario": ["simples_nacional", "simples_excesso", "normal", "mei"],"status_nota": ["rascunho", "processando", "autorizada", "rejeitada", "cancelada", "erro"],"status_orcamento": ["rascunho", "enviado", "aprovado", "recusado", "expirado"],"status_os": ["aberta", "em_execucao", "aguardando_peca", "concluida", "entregue", "cancelada"],"status_titulo": ["aberto", "pago", "cancelado"],"tipo_comissao": ["nenhuma", "percentual", "fixo"],"tipo_controle_estoque": ["unidade", "metro"],"tipo_item": ["servico", "produto"],"tipo_mov_caixa": ["abertura", "sangria", "reforco", "recebimento", "pagamento"],"tipo_movimento_estoque": ["entrada", "saida", "ajuste"],"tipo_nota": ["nfse", "nfce", "nfe"],"tipo_pessoa": ["PF", "PJ"],"tipo_preco_servico": ["fixo", "categoria", "m2", "pelicula"]
          }
        }
} as const

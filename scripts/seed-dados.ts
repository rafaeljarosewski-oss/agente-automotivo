/**
 * Dados de demonstração: oficina de películas e acessórios em Porto Alegre/RS.
 * Os dados fiscais são PLAUSÍVEIS e ficam marcados com fiscal_validado = false
 * até o contador validar.
 */

export const EMPRESA_DEMO = {
  razao_social: "Prime Películas e Acessórios Automotivos LTDA",
  nome_fantasia: "Prime Películas",
  cnpj_base: "457812630001", // DV calculado no seed
  inscricao_estadual: "0962574811",
  inscricao_municipal: "52731409",
  regime_tributario: "simples_nacional" as const,
  cnae: "4530-7/05",
  email: "contato@primepeliculas.com.br",
  telefone: "5133447788",
  whatsapp: "51998765432",
  cep: "91010003",
  logradouro: "Avenida Assis Brasil",
  numero: "3940",
  complemento: "Loja 2",
  bairro: "São Sebastião",
  cidade: "Porto Alegre",
  uf: "RS",
  codigo_municipio: "4314902",
};

export const USUARIOS_DEMO = [
  { papel: "admin" as const, nome: "Rafael Moreira", email: "admin@demo.orion.app", senha: "Demo@2026" },
  { papel: "atendente" as const, nome: "Juliana Kunz", email: "atendente@demo.orion.app", senha: "Demo@2026" },
  { papel: "instalador" as const, nome: "Diego Becker", email: "instalador@demo.orion.app", senha: "Demo@2026" },
  { papel: "instalador" as const, nome: "Marcos Weber", email: "instalador2@demo.orion.app", senha: "Demo@2026" },
];

// Segunda empresa, só para demonstrar o isolamento multiempresa
export const EMPRESA_DEMO_2 = {
  razao_social: "Serra Insulfilm e Som LTDA",
  nome_fantasia: "Serra Insulfilm",
  cnpj_base: "381247590001",
  cidade: "Caxias do Sul",
  uf: "RS",
  codigo_municipio: "4305108",
  admin: { nome: "Paula Zanella", email: "admin@serra.demo.orion.app", senha: "Demo@2026" },
};

const FISCAL_PELICULA = { ncm: "39206219", cfop: "5102", csosn: "102", origem: 0, cst_pis: "99", cst_cofins: "99", cst_ibs_cbs: "000", cclass_trib: "000001" };
const FISCAL_LAMPADA = { ncm: "85395200", cfop: "5405", csosn: "500", origem: 0, cst_pis: "99", cst_cofins: "99", cst_ibs_cbs: "000", cclass_trib: "000001" };
const FISCAL_LAMPADA_HALOGENA = { ...FISCAL_LAMPADA, ncm: "85392110" };
const FISCAL_ALARME = { ncm: "85311090", cfop: "5405", csosn: "500", origem: 0, cst_pis: "99", cst_cofins: "99", cst_ibs_cbs: "000", cclass_trib: "000001" };
const FISCAL_ACESSORIO = { cfop: "5102", csosn: "102", origem: 0, cst_pis: "99", cst_cofins: "99", cst_ibs_cbs: "000", cclass_trib: "000001" };

export interface ProdutoSeed {
  chave: string;
  codigo: string;
  nome: string;
  categoria: "pelicula" | "lampada" | "alarme" | "acessorio" | "ar_condicionado" | "som" | "outro";
  marca?: string;
  tipo_controle?: "unidade" | "metro";
  unidade?: string;
  exige_numero_serie?: boolean;
  preco: number; // reais
  custo: number; // reais
  minimo: number;
  estoque: number; // entrada inicial (metros para rolos)
  rolos?: number[]; // metragem de cada rolo
  largura_rolo_m?: number;
  codigo_barras?: string;
  fiscal: Record<string, unknown>;
}

export const PRODUTOS: ProdutoSeed[] = [
  // Rolos de película (controle por metro)
  { chave: "rolo_g5", codigo: "PEL-G5", nome: "Película automotiva G5 (fumê 5%) — rolo 1,52 m", categoria: "pelicula", marca: "Insulfilm", tipo_controle: "metro", unidade: "M", preco: 45, custo: 14.5, minimo: 15, estoque: 0, rolos: [30, 12.5], largura_rolo_m: 1.52, fiscal: FISCAL_PELICULA },
  { chave: "rolo_g20", codigo: "PEL-G20", nome: "Película automotiva G20 — rolo 1,52 m", categoria: "pelicula", marca: "Insulfilm", tipo_controle: "metro", unidade: "M", preco: 45, custo: 14.5, minimo: 15, estoque: 0, rolos: [30, 30], largura_rolo_m: 1.52, fiscal: FISCAL_PELICULA },
  { chave: "rolo_g35", codigo: "PEL-G35", nome: "Película automotiva G35 — rolo 1,52 m", categoria: "pelicula", marca: "Insulfilm", tipo_controle: "metro", unidade: "M", preco: 45, custo: 14.5, minimo: 15, estoque: 0, rolos: [30], largura_rolo_m: 1.52, fiscal: FISCAL_PELICULA },
  { chave: "rolo_g50", codigo: "PEL-G50", nome: "Película automotiva G50 — rolo 1,52 m", categoria: "pelicula", marca: "Insulfilm", tipo_controle: "metro", unidade: "M", preco: 45, custo: 14.5, minimo: 10, estoque: 0, rolos: [8.4], largura_rolo_m: 1.52, fiscal: FISCAL_PELICULA },
  { chave: "rolo_nano", codigo: "PEL-NANO", nome: "Película nano cerâmica G20 — rolo 1,52 m", categoria: "pelicula", marca: "3M", tipo_controle: "metro", unidade: "M", preco: 120, custo: 52, minimo: 10, estoque: 0, rolos: [30], largura_rolo_m: 1.52, fiscal: FISCAL_PELICULA },
  { chave: "rolo_seg", codigo: "PEL-SEG", nome: "Película de segurança 8 mil (antivandalismo) — rolo 1,52 m", categoria: "pelicula", marca: "Solarfilm", tipo_controle: "metro", unidade: "M", preco: 95, custo: 38, minimo: 5, estoque: 0, rolos: [15], largura_rolo_m: 1.52, fiscal: FISCAL_PELICULA },
  { chave: "rolo_res", codigo: "PEL-RES-ESP", nome: "Película residencial espelhada prata — rolo 1,52 m", categoria: "pelicula", marca: "Solarfilm", tipo_controle: "metro", unidade: "M", preco: 60, custo: 21, minimo: 10, estoque: 0, rolos: [30], largura_rolo_m: 1.52, fiscal: FISCAL_PELICULA },
  // Lâmpadas
  { chave: "led_h1", codigo: "LMP-H1-LED", nome: "Lâmpada LED H1 6000K (par)", categoria: "lampada", marca: "Shocklight", preco: 129.9, custo: 58, minimo: 4, estoque: 10, codigo_barras: "7898612345011", fiscal: FISCAL_LAMPADA },
  { chave: "led_h4", codigo: "LMP-H4-LED", nome: "Lâmpada LED H4 6000K (par)", categoria: "lampada", marca: "Shocklight", preco: 149.9, custo: 64, minimo: 4, estoque: 12, codigo_barras: "7898612345028", fiscal: FISCAL_LAMPADA },
  { chave: "led_h7", codigo: "LMP-H7-LED", nome: "Lâmpada LED H7 6000K (par)", categoria: "lampada", marca: "Shocklight", preco: 139.9, custo: 60, minimo: 4, estoque: 3, codigo_barras: "7898612345035", fiscal: FISCAL_LAMPADA },
  { chave: "led_h11", codigo: "LMP-H11-LED", nome: "Lâmpada LED H11 6000K (par)", categoria: "lampada", marca: "Shocklight", preco: 139.9, custo: 60, minimo: 4, estoque: 8, codigo_barras: "7898612345042", fiscal: FISCAL_LAMPADA },
  { chave: "led_hb3", codigo: "LMP-HB3-LED", nome: "Lâmpada LED HB3 6000K (par)", categoria: "lampada", marca: "Shocklight", preco: 149.9, custo: 64, minimo: 2, estoque: 6, fiscal: FISCAL_LAMPADA },
  { chave: "sb_h4", codigo: "LMP-H4-SB", nome: "Lâmpada super branca H4 (par)", categoria: "lampada", marca: "Philips", preco: 69.9, custo: 28, minimo: 4, estoque: 14, fiscal: FISCAL_LAMPADA_HALOGENA },
  { chave: "t10", codigo: "LMP-T10", nome: "Lâmpada pingo T10 LED (par)", categoria: "lampada", marca: "Shocklight", preco: 24.9, custo: 7, minimo: 10, estoque: 40, fiscal: FISCAL_LAMPADA },
  // Alarmes (com número de série)
  { chave: "alarme_px", codigo: "ALM-PX360", nome: "Alarme Pósitron Cyber PX 360 BT", categoria: "alarme", marca: "Pósitron", exige_numero_serie: true, preco: 389, custo: 198, minimo: 2, estoque: 5, fiscal: FISCAL_ALARME },
  { chave: "alarme_ex", codigo: "ALM-EX360", nome: "Alarme Pósitron Cyber EX 360", categoria: "alarme", marca: "Pósitron", exige_numero_serie: true, preco: 299, custo: 149, minimo: 2, estoque: 4, fiscal: FISCAL_ALARME },
  { chave: "alarme_fks", codigo: "ALM-FKS", nome: "Alarme FKS FX-330 com bloqueador", categoria: "alarme", marca: "FKS", exige_numero_serie: true, preco: 259, custo: 120, minimo: 2, estoque: 1, fiscal: FISCAL_ALARME },
  // Acessórios
  { chave: "trava", codigo: "ACS-TRAVA4", nome: "Trava elétrica 4 portas universal", categoria: "acessorio", marca: "Tury", preco: 189, custo: 82, minimo: 3, estoque: 7, fiscal: { ...FISCAL_ACESSORIO, ncm: "83012000" } },
  { chave: "sensor", codigo: "ACS-SENSOR4", nome: "Sensor de estacionamento 4 pontos com display", categoria: "acessorio", marca: "Multilaser", preco: 219, custo: 95, minimo: 3, estoque: 6, fiscal: { ...FISCAL_ACESSORIO, ncm: "85311090" } },
  { chave: "camera", codigo: "ACS-CAMRE", nome: "Câmera de ré colorida à prova d'água", categoria: "acessorio", marca: "Multilaser", preco: 149, custo: 58, minimo: 3, estoque: 2, fiscal: { ...FISCAL_ACESSORIO, ncm: "85258929" } },
  { chave: "multimidia", codigo: "SOM-MM7", nome: "Central multimídia 7\" Android Auto/CarPlay", categoria: "som", marca: "Positron", preco: 1290, custo: 690, minimo: 1, estoque: 3, fiscal: { ...FISCAL_ACESSORIO, ncm: "85272190" } },
  { chave: "vidro", codigo: "ACS-VIDRO2", nome: "Kit vidro elétrico 2 portas", categoria: "acessorio", marca: "Tury", preco: 459, custo: 210, minimo: 1, estoque: 2, fiscal: { ...FISCAL_ACESSORIO, ncm: "85014019" } },
  { chave: "calha", codigo: "ACS-CALHA", nome: "Calha de chuva (jogo 4 peças)", categoria: "acessorio", marca: "TG Poli", preco: 159, custo: 61, minimo: 2, estoque: 5, fiscal: { ...FISCAL_ACESSORIO, ncm: "87082999" } },
  // Ar-condicionado
  { chave: "gas", codigo: "AC-R134A", nome: "Gás refrigerante R134a", categoria: "ar_condicionado", marca: "Dupont", unidade: "KG", preco: 180, custo: 62, minimo: 5, estoque: 13.6, fiscal: { ...FISCAL_ACESSORIO, ncm: "29034500" } },
  { chave: "filtro", codigo: "AC-FILTRO", nome: "Filtro de cabine (ar-condicionado)", categoria: "ar_condicionado", marca: "Tecfil", preco: 59.9, custo: 21, minimo: 6, estoque: 18, fiscal: { ...FISCAL_ACESSORIO, ncm: "84213990" } },
  { chave: "higienizador", codigo: "AC-HIGI", nome: "Higienizador bactericida para ar-condicionado", categoria: "ar_condicionado", marca: "Wurth", preco: 49.9, custo: 18, minimo: 6, estoque: 4, fiscal: { ...FISCAL_ACESSORIO, ncm: "38089419" } },
  { chave: "oleo", codigo: "AC-PAG46", nome: "Óleo PAG 46 para compressor (250 ml)", categoria: "ar_condicionado", marca: "Wurth", preco: 79, custo: 31, minimo: 2, estoque: 5, fiscal: { ...FISCAL_ACESSORIO, ncm: "27101932" } },
];

export const CATEGORIAS = ["Hatch", "Sedan", "SUV", "Caminhonete", "Utilitário"] as const;
type Cat = (typeof CATEGORIAS)[number];

const FISCAL_SERV_VEICULO = { codigo_servico: "14.01.01", aliquota_iss: 4, cst_ibs_cbs: "000", cclass_trib: "000001" };
const FISCAL_SERV_INSTALACAO = { codigo_servico: "14.06.01", aliquota_iss: 4, cst_ibs_cbs: "000", cclass_trib: "000001" };
const FISCAL_SERV_IMOVEL = { codigo_servico: "07.05.01", aliquota_iss: 4, cst_ibs_cbs: "000", cclass_trib: "000001" };

export interface ServicoSeed {
  chave: string;
  codigo: string;
  nome: string;
  categoria: "pelicula_automotiva" | "pelicula_residencial" | "instalacao" | "ar_condicionado" | "eletrica" | "estetica" | "outro";
  tipo_preco: "fixo" | "categoria" | "m2" | "pelicula";
  preco: number;
  precos_categoria?: Partial<Record<Cat, number>>;
  produto_consumo?: string;
  comissao: { tipo: "nenhuma" | "percentual" | "fixo"; valor: number };
  tempo?: number;
  garantia?: number;
  fiscal: Record<string, unknown>;
}

export const SERVICOS: ServicoSeed[] = [
  { chave: "pel_auto", codigo: "SRV-PEL", nome: "Aplicação de película automotiva (veículo completo)", categoria: "pelicula_automotiva", tipo_preco: "pelicula", preco: 0, comissao: { tipo: "percentual", valor: 15 }, tempo: 180, garantia: 1825, fiscal: FISCAL_SERV_VEICULO },
  { chave: "pel_parabrisa", codigo: "SRV-PEL-PB", nome: "Película no para-brisa (faixa degradê)", categoria: "pelicula_automotiva", tipo_preco: "categoria", preco: 120, precos_categoria: { Hatch: 100, Sedan: 110, SUV: 130, Caminhonete: 130, Utilitário: 140 }, comissao: { tipo: "fixo", valor: 15 }, tempo: 40, fiscal: FISCAL_SERV_VEICULO },
  { chave: "remocao", codigo: "SRV-REMOCAO", nome: "Remoção de película antiga", categoria: "pelicula_automotiva", tipo_preco: "categoria", preco: 120, precos_categoria: { Hatch: 100, Sedan: 120, SUV: 150, Caminhonete: 150, Utilitário: 170 }, comissao: { tipo: "percentual", valor: 20 }, tempo: 90, fiscal: FISCAL_SERV_VEICULO },
  { chave: "pel_res", codigo: "SRV-RES", nome: "Película residencial espelhada (por m²)", categoria: "pelicula_residencial", tipo_preco: "m2", preco: 120, produto_consumo: "rolo_res", comissao: { tipo: "percentual", valor: 12 }, garantia: 1825, fiscal: FISCAL_SERV_IMOVEL },
  { chave: "pel_seg_res", codigo: "SRV-RES-SEG", nome: "Película de segurança residencial/comercial (por m²)", categoria: "pelicula_residencial", tipo_preco: "m2", preco: 210, produto_consumo: "rolo_seg", comissao: { tipo: "percentual", valor: 12 }, garantia: 1825, fiscal: FISCAL_SERV_IMOVEL },
  { chave: "inst_alarme", codigo: "SRV-ALARME", nome: "Instalação de alarme", categoria: "instalacao", tipo_preco: "fixo", preco: 150, comissao: { tipo: "fixo", valor: 40 }, tempo: 120, garantia: 90, fiscal: FISCAL_SERV_INSTALACAO },
  { chave: "inst_som", codigo: "SRV-MULTIMIDIA", nome: "Instalação de central multimídia", categoria: "instalacao", tipo_preco: "fixo", preco: 200, comissao: { tipo: "fixo", valor: 50 }, tempo: 150, garantia: 90, fiscal: FISCAL_SERV_INSTALACAO },
  { chave: "inst_sensor", codigo: "SRV-SENSOR", nome: "Instalação de sensor de estacionamento", categoria: "instalacao", tipo_preco: "fixo", preco: 120, comissao: { tipo: "fixo", valor: 30 }, tempo: 90, fiscal: FISCAL_SERV_INSTALACAO },
  { chave: "inst_camera", codigo: "SRV-CAMERA", nome: "Instalação de câmera de ré", categoria: "instalacao", tipo_preco: "fixo", preco: 130, comissao: { tipo: "fixo", valor: 30 }, tempo: 90, fiscal: FISCAL_SERV_INSTALACAO },
  { chave: "inst_trava", codigo: "SRV-TRAVA", nome: "Instalação de trava elétrica", categoria: "instalacao", tipo_preco: "categoria", preco: 160, precos_categoria: { Hatch: 150, Sedan: 160, SUV: 180, Caminhonete: 180, Utilitário: 200 }, comissao: { tipo: "fixo", valor: 40 }, tempo: 150, fiscal: FISCAL_SERV_INSTALACAO },
  { chave: "troca_lampada", codigo: "SRV-LAMPADA", nome: "Troca de lâmpada (por par)", categoria: "eletrica", tipo_preco: "fixo", preco: 30, comissao: { tipo: "fixo", valor: 8 }, tempo: 20, fiscal: FISCAL_SERV_VEICULO },
  { chave: "higienizacao", codigo: "SRV-AC-HIGI", nome: "Higienização do ar-condicionado", categoria: "ar_condicionado", tipo_preco: "categoria", preco: 140, precos_categoria: { Hatch: 120, Sedan: 130, SUV: 150, Caminhonete: 150, Utilitário: 170 }, comissao: { tipo: "percentual", valor: 15 }, tempo: 60, garantia: 30, fiscal: FISCAL_SERV_VEICULO },
  { chave: "carga_gas", codigo: "SRV-AC-GAS", nome: "Carga de gás do ar-condicionado (mão de obra)", categoria: "ar_condicionado", tipo_preco: "categoria", preco: 150, precos_categoria: { Hatch: 140, Sedan: 150, SUV: 170, Caminhonete: 180, Utilitário: 190 }, comissao: { tipo: "percentual", valor: 15 }, tempo: 60, garantia: 90, fiscal: FISCAL_SERV_VEICULO },
  { chave: "troca_filtro", codigo: "SRV-AC-FILTRO", nome: "Troca de filtro de cabine", categoria: "ar_condicionado", tipo_preco: "fixo", preco: 40, comissao: { tipo: "fixo", valor: 10 }, tempo: 20, fiscal: FISCAL_SERV_VEICULO },
];

/** Linhas de película: preço (R$) e consumo (m) por categoria */
export const LINHAS_PELICULA: { nome: string; marca: string; descricao: string; produto: string; precos: Record<Cat, [number, number]> }[] = [
  { nome: "G5", marca: "Insulfilm", descricao: "Fumê 5% — máxima privacidade (somente vidros traseiros)", produto: "rolo_g5", precos: { Hatch: [250, 3.5], Sedan: [280, 4], SUV: [330, 5], Caminhonete: [300, 4.5], Utilitário: [380, 6] } },
  { nome: "G20", marca: "Insulfilm", descricao: "Fumê 20% — equilíbrio entre privacidade e visibilidade", produto: "rolo_g20", precos: { Hatch: [250, 3.5], Sedan: [280, 4], SUV: [330, 5], Caminhonete: [300, 4.5], Utilitário: [380, 6] } },
  { nome: "G35", marca: "Insulfilm", descricao: "Fumê 35% — leve, dentro da legislação no para-brisa lateral", produto: "rolo_g35", precos: { Hatch: [250, 3.5], Sedan: [280, 4], SUV: [330, 5], Caminhonete: [300, 4.5], Utilitário: [380, 6] } },
  { nome: "G50", marca: "Insulfilm", descricao: "Fumê 50% — proteção UV com visibilidade quase total", produto: "rolo_g50", precos: { Hatch: [250, 3.5], Sedan: [280, 4], SUV: [330, 5], Caminhonete: [300, 4.5], Utilitário: [380, 6] } },
  { nome: "Nano cerâmica", marca: "3M", descricao: "Bloqueio de calor de até 60% sem escurecer demais", produto: "rolo_nano", precos: { Hatch: [690, 3.5], Sedan: [790, 4], SUV: [950, 5], Caminhonete: [890, 4.5], Utilitário: [1090, 6] } },
  { nome: "Segurança", marca: "Solarfilm", descricao: "Antivandalismo 8 mil — dificulta quebra e estilhaços", produto: "rolo_seg", precos: { Hatch: [890, 3.5], Sedan: [990, 4], SUV: [1190, 5], Caminhonete: [1090, 4.5], Utilitário: [1390, 6] } },
];

export interface ClienteSeed {
  nome: string;
  tipo: "PF" | "PJ";
  fantasia?: string;
  doc_base: string; // 9 dígitos (CPF) ou 12 (CNPJ) — DV calculado no seed
  ie?: string;
  telefone: string;
  email?: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  ibge: string;
  veiculos: { placa: string; marca: string; modelo: string; ano: number; cor: string; categoria: Cat }[];
}

export const CLIENTES: ClienteSeed[] = [
  { nome: "Ana Paula Schneider", tipo: "PF", doc_base: "283746195", telefone: "51991234501", email: "anapaula.s@gmail.com", cep: "90460190", logradouro: "Rua Dona Laura", numero: "820", bairro: "Rio Branco", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "IZQ8B21", marca: "Jeep", modelo: "Compass Longitude", ano: 2022, cor: "Branco", categoria: "SUV" }] },
  { nome: "Bruno Henrique Rodrigues", tipo: "PF", doc_base: "394857162", telefone: "51992345602", cep: "91350000", logradouro: "Avenida Plínio Brasil Milano", numero: "1500", bairro: "Higienópolis", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "IVB4521", marca: "Chevrolet", modelo: "Onix LT", ano: 2018, cor: "Prata", categoria: "Hatch" }] },
  { nome: "Camila Fernandes Dutra", tipo: "PF", doc_base: "405968273", telefone: "51993456703", email: "camila.dutra@hotmail.com", cep: "92010000", logradouro: "Rua Tiradentes", numero: "245", bairro: "Centro", cidade: "Canoas", ibge: "4304606", veiculos: [{ placa: "JBC2E45", marca: "Volkswagen", modelo: "T-Cross Comfortline", ano: 2023, cor: "Cinza", categoria: "SUV" }] },
  { nome: "Daniel Zimmermann", tipo: "PF", doc_base: "516079384", telefone: "51994567804", cep: "93510000", logradouro: "Rua Bento Gonçalves", numero: "1200", bairro: "Centro", cidade: "Novo Hamburgo", ibge: "4313409", veiculos: [{ placa: "IUT7832", marca: "Toyota", modelo: "Hilux SRV", ano: 2017, cor: "Preto", categoria: "Caminhonete" }, { placa: "JCA1F90", marca: "Toyota", modelo: "Corolla XEi", ano: 2023, cor: "Branco", categoria: "Sedan" }] },
  { nome: "Eduarda Lopes Machado", tipo: "PF", doc_base: "627180495", telefone: "51995678905", email: "duda.machado@gmail.com", cep: "94010000", logradouro: "Avenida Dorival Cândido Luz de Oliveira", numero: "3000", bairro: "Centro", cidade: "Gravataí", ibge: "4309209", veiculos: [{ placa: "JAZ3G12", marca: "Hyundai", modelo: "HB20 Comfort", ano: 2021, cor: "Vermelho", categoria: "Hatch" }] },
  { nome: "Felipe Augusto Kuhn", tipo: "PF", doc_base: "738291506", telefone: "51996789006", cep: "90560001", logradouro: "Rua Ramiro Barcelos", numero: "1700", bairro: "Bom Fim", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "IXK6H34", marca: "Honda", modelo: "Civic EXL", ano: 2019, cor: "Cinza", categoria: "Sedan" }] },
  { nome: "Gabriela Pinto Silveira", tipo: "PF", doc_base: "849302617", telefone: "51997890107", email: "gabi.silveira@outlook.com", cep: "90619900", logradouro: "Avenida Ipiranga", numero: "6681", bairro: "Partenon", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "JCH5J67", marca: "Fiat", modelo: "Pulse Impetus", ano: 2024, cor: "Azul", categoria: "SUV" }] },
  { nome: "Henrique Bortolini", tipo: "PF", doc_base: "950413728", telefone: "54998901208", cep: "95010000", logradouro: "Rua Sinimbu", numero: "1800", bairro: "Centro", cidade: "Caxias do Sul", ibge: "4305108", veiculos: [{ placa: "IRX4410", marca: "Ford", modelo: "Ranger XLS", ano: 2015, cor: "Prata", categoria: "Caminhonete" }] },
  { nome: "Isabela Martins Correa", tipo: "PF", doc_base: "061524839", telefone: "51999012309", cep: "94930000", logradouro: "Avenida Flores da Cunha", numero: "1550", bairro: "Centro", cidade: "Cachoeirinha", ibge: "4303103", veiculos: [{ placa: "JBE8K90", marca: "Renault", modelo: "Kwid Zen", ano: 2022, cor: "Branco", categoria: "Hatch" }] },
  { nome: "João Pedro Antunes", tipo: "PF", doc_base: "172635940", telefone: "51981234510", email: "jp.antunes@gmail.com", cep: "93010000", logradouro: "Rua Independência", numero: "540", bairro: "Centro", cidade: "São Leopoldo", ibge: "4318705", veiculos: [{ placa: "IWP1C23", marca: "Volkswagen", modelo: "Polo Highline", ano: 2020, cor: "Preto", categoria: "Hatch" }] },
  { nome: "Karen Becker Vargas", tipo: "PF", doc_base: "283746051", telefone: "51982345611", cep: "94410000", logradouro: "Avenida Senador Salgado Filho", numero: "3800", bairro: "Centro", cidade: "Viamão", ibge: "4323002", veiculos: [{ placa: "JAP7D45", marca: "Nissan", modelo: "Kicks SV", ano: 2021, cor: "Laranja", categoria: "SUV" }] },
  { nome: "Leonardo Fagundes", tipo: "PF", doc_base: "394857162", telefone: "51983456712", cep: "90150000", logradouro: "Rua Mostardeiro", numero: "333", bairro: "Moinhos de Vento", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "JDA9E87", marca: "BMW", modelo: "320i M Sport", ano: 2024, cor: "Azul", categoria: "Sedan" }] },
  { nome: "Mariana Dal Pizzol", tipo: "PF", doc_base: "405968273", telefone: "54984567813", email: "mari.dalpizzol@gmail.com", cep: "95700000", logradouro: "Rua Marechal Deodoro", numero: "90", bairro: "Centro", cidade: "Bento Gonçalves", ibge: "4302105", veiculos: [{ placa: "IYF2F12", marca: "Chevrolet", modelo: "Tracker Premier", ano: 2020, cor: "Branco", categoria: "SUV" }] },
  { nome: "Nicolas Oliveira da Rosa", tipo: "PF", doc_base: "516079385", telefone: "51985678914", cep: "91040000", logradouro: "Avenida Assis Brasil", numero: "2611", bairro: "Cristo Redentor", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "ISM3388", marca: "Fiat", modelo: "Strada Working", ano: 2014, cor: "Branco", categoria: "Utilitário" }] },
  { nome: "Patrícia Hoffmann", tipo: "PF", doc_base: "627180496", telefone: "51986789015", email: "pati.hoffmann@terra.com.br", cep: "90880000", logradouro: "Avenida Wenceslau Escobar", numero: "2100", bairro: "Tristeza", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "JBK4G56", marca: "Toyota", modelo: "Yaris XLS", ano: 2022, cor: "Prata", categoria: "Hatch" }, { placa: "JCX6H78", marca: "Toyota", modelo: "Corolla Cross XRE", ano: 2024, cor: "Preto", categoria: "SUV" }] },
  { nome: "Rafael Tomazi", tipo: "PF", doc_base: "738291507", telefone: "51987890116", cep: "92310000", logradouro: "Rua Santos Ferreira", numero: "2200", bairro: "Marechal Rondon", cidade: "Canoas", ibge: "4304606", veiculos: [{ placa: "IVZ8I90", marca: "Volkswagen", modelo: "Amarok Highline", ano: 2019, cor: "Cinza", categoria: "Caminhonete" }] },
  { nome: "Sabrina Cardoso Luz", tipo: "PF", doc_base: "849302618", telefone: "51988901217", cep: "91530000", logradouro: "Avenida Bento Gonçalves", numero: "4500", bairro: "Partenon", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "JAU1J23", marca: "Hyundai", modelo: "Creta Limited", ano: 2022, cor: "Branco", categoria: "SUV" }] },
  { nome: "Thiago Mezzomo", tipo: "PF", doc_base: "950413729", telefone: "54989012318", cep: "95020000", logradouro: "Avenida Júlio de Castilhos", numero: "2030", bairro: "São Pelegrino", cidade: "Caxias do Sul", ibge: "4305108", veiculos: [{ placa: "IPC7712", marca: "Chevrolet", modelo: "S10 LTZ", ano: 2013, cor: "Preto", categoria: "Caminhonete" }] },
  { nome: "Vanessa Ritter", tipo: "PF", doc_base: "061524830", telefone: "51990123419", email: "vanessa.ritter@gmail.com", cep: "93300000", logradouro: "Rua Júlio de Castilhos", numero: "770", bairro: "Centro", cidade: "Novo Hamburgo", ibge: "4313409", veiculos: [{ placa: "JBR2K45", marca: "Jeep", modelo: "Renegade Sport", ano: 2022, cor: "Verde", categoria: "SUV" }] },
  { nome: "William Prestes", tipo: "PF", doc_base: "172635941", telefone: "51991234520", cep: "90040000", logradouro: "Avenida João Pessoa", numero: "1100", bairro: "Farroupilha", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "IUA3301", marca: "Renault", modelo: "Logan Expression", ano: 2016, cor: "Prata", categoria: "Sedan" }] },
  { nome: "Yasmin Goulart", tipo: "PF", doc_base: "283746052", telefone: "51992345621", cep: "90620000", logradouro: "Rua Eça de Queiroz", numero: "600", bairro: "Petrópolis", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "JDF4B67", marca: "BYD", modelo: "Dolphin", ano: 2024, cor: "Branco", categoria: "Hatch" }] },
  { nome: "Gustavo Kirsch", tipo: "PF", doc_base: "394857163", telefone: "51993456722", cep: "93700000", logradouro: "Rua Tristão Monteiro", numero: "300", bairro: "Centro", cidade: "Campo Bom", ibge: "4303905", veiculos: [{ placa: "IXY5C89", marca: "Honda", modelo: "HR-V EXL", ano: 2019, cor: "Vermelho", categoria: "SUV" }] },
  { nome: "Luciana Brum", tipo: "PF", doc_base: "405968274", telefone: "51994567823", email: "lu.brum@gmail.com", cep: "90820000", logradouro: "Avenida Icaraí", numero: "1400", bairro: "Cristal", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "JAK6D12", marca: "Peugeot", modelo: "208 Griffe", ano: 2021, cor: "Azul", categoria: "Hatch" }] },
  { nome: "Otávio Rech", tipo: "PF", doc_base: "516079386", telefone: "54995678924", cep: "95050000", logradouro: "Rua Pinheiro Machado", numero: "2200", bairro: "Centro", cidade: "Caxias do Sul", ibge: "4305108", veiculos: [{ placa: "JBM7E34", marca: "Mitsubishi", modelo: "L200 Triton Sport", ano: 2022, cor: "Branco", categoria: "Caminhonete" }] },
  // Pessoas jurídicas
  { nome: "Transportes Pampa Gaúcho LTDA", tipo: "PJ", fantasia: "Pampa Transportes", doc_base: "123456780001", ie: "0961122334", telefone: "5133221100", email: "frota@pampatransportes.com.br", cep: "91150000", logradouro: "Avenida Sertório", numero: "6600", bairro: "Sarandi", cidade: "Porto Alegre", ibge: "4314902", veiculos: [{ placa: "IVN2F67", marca: "Fiat", modelo: "Fiorino Endurance", ano: 2019, cor: "Branco", categoria: "Utilitário" }, { placa: "JBT8G90", marca: "Renault", modelo: "Master Furgão", ano: 2022, cor: "Branco", categoria: "Utilitário" }, { placa: "JCB3H12", marca: "Fiat", modelo: "Ducato Cargo", ano: 2023, cor: "Branco", categoria: "Utilitário" }] },
  { nome: "Imobiliária Guaíba Negócios LTDA", tipo: "PJ", fantasia: "Guaíba Imóveis", doc_base: "234567890001", telefone: "5132445566", email: "adm@guaibaimoveis.com.br", cep: "90010150", logradouro: "Rua dos Andradas", numero: "1001", bairro: "Centro Histórico", cidade: "Porto Alegre", ibge: "4314902", veiculos: [] },
  { nome: "Construtora Vale do Sinos S.A.", tipo: "PJ", fantasia: "Vale do Sinos Construções", doc_base: "345678900001", ie: "1240098765", telefone: "5135901122", email: "compras@valedosinos.eng.br", cep: "93510000", logradouro: "Rua Joaquim Nabuco", numero: "800", bairro: "Centro", cidade: "Novo Hamburgo", ibge: "4313409", veiculos: [{ placa: "JAW4J34", marca: "Toyota", modelo: "Hilux SR", ano: 2021, cor: "Branco", categoria: "Caminhonete" }] },
  { nome: "Clínica Odontológica Sorriso Sul LTDA", tipo: "PJ", fantasia: "Sorriso Sul", doc_base: "456789010001", telefone: "5130304040", email: "financeiro@sorrisosul.com.br", cep: "91330000", logradouro: "Avenida Nilo Peçanha", numero: "2900", bairro: "Chácara das Pedras", cidade: "Porto Alegre", ibge: "4314902", veiculos: [] },
  { nome: "Auto Escola Farroupilha LTDA", tipo: "PJ", fantasia: "Auto Escola Farroupilha", doc_base: "567890120001", telefone: "5134567890", email: "contato@aefarroupilha.com.br", cep: "94030000", logradouro: "Rua Anápio Gomes", numero: "1300", bairro: "Centro", cidade: "Gravataí", ibge: "4309209", veiculos: [{ placa: "JAA1K56", marca: "Chevrolet", modelo: "Onix Plus LT", ano: 2021, cor: "Branco", categoria: "Sedan" }, { placa: "JAA1K57", marca: "Chevrolet", modelo: "Onix Plus LT", ano: 2021, cor: "Branco", categoria: "Sedan" }] },
  { nome: "Agropecuária Coxilha Verde LTDA", tipo: "PJ", fantasia: "Coxilha Verde", doc_base: "678901230001", ie: "0450011223", telefone: "5532211234", email: "adm@coxilhaverde.agr.br", cep: "97010000", logradouro: "Rua do Acampamento", numero: "500", bairro: "Centro", cidade: "Santa Maria", ibge: "4316907", veiculos: [{ placa: "IQS9A78", marca: "Ford", modelo: "Ranger XLT", ano: 2014, cor: "Prata", categoria: "Caminhonete" }] },
];

export const CONTAS_PAGAR = [
  { descricao: "Aluguel da loja — outubro", fornecedor: "Imobiliária Guaíba", categoria: "Aluguel", valor: 4800, dias: 0 },
  { descricao: "Energia elétrica — CEEE Equatorial", fornecedor: "CEEE Equatorial", categoria: "Energia elétrica", valor: 612.37, dias: 4 },
  { descricao: "Internet fibra 500 Mb", fornecedor: "Vivo", categoria: "Internet e telefone", valor: 149.9, dias: 6 },
  { descricao: "Compra de películas Insulfilm (boleto 2/3)", fornecedor: "Insulfilm do Brasil", categoria: "Fornecedores de material", valor: 2380, dias: 12 },
  { descricao: "DAS Simples Nacional", fornecedor: "Receita Federal", categoria: "Impostos", valor: 1932.55, dias: 11 },
  { descricao: "Água — DMAE", fornecedor: "DMAE", categoria: "Água", valor: 98.4, dias: -3 },
  { descricao: "Anúncios Instagram/Google", fornecedor: "Meta / Google", categoria: "Marketing", valor: 450, dias: -1 },
  { descricao: "Compra de alarmes Pósitron", fornecedor: "Distribuidora Pósitron Sul", categoria: "Fornecedores de material", valor: 1785, dias: 18 },
];

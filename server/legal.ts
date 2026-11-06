import { createHash } from 'node:crypto'
import type { Request } from 'express'
import { env } from './env.js'
import { secretHmac } from './secretCrypto.js'

export const TERMS_VERSION = '2026-11-06-v3'
export const PRIVACY_VERSION = '2026-11-06-v3'
export const LEGAL_BUNDLE_VERSION = `${TERMS_VERSION}|${PRIVACY_VERSION}`
export const PLATFORM_MARKETING_WHATSAPP_VERSION = 'lashdesigner-marketing-whatsapp-v1'
export const PLATFORM_MARKETING_WHATSAPP_TEXT = 'Quero receber novidades, recursos e ofertas do NaRégua pelo WhatsApp.'

type LegalSection = { id: string; title: string; paragraphs: string[] }

type LegalProvider = {
  name: string | null
  taxId: string | null
  address: string | null
  contactEmail: string | null
  privacyEmail: string | null
}

function termsSections(providerName: string): LegalSection[] {
  return [
    { id: 'escopo', title: '1. Sobre estes Termos', paragraphs: [
      `Estes Termos regulam o acesso e o uso do NaRégua, plataforma de agenda, relacionamento com clientes, WhatsApp, gestão financeira, recursos de inteligência artificial e funcionalidades relacionadas, disponibilizada por ${providerName}. Ao contratar um plano e marcar o aceite no fluxo de compra, a pessoa titular da conta celebra este contrato na versão indicada no momento da contratação.`,
      'A Política de Privacidade integra estes Termos para fins de transparência sobre tratamento de dados. O aceite dos Termos não transforma tratamentos opcionais, como marketing, em consentimento: autorizações promocionais permanecem separadas e facultativas.',
    ]},
    { id: 'conta', title: '2. Conta, acesso e segurança', paragraphs: [
      'A conta profissional é pessoal e deve conter informações verdadeiras e atualizadas. A pessoa titular é responsável por manter senha, WhatsApp de segurança e dispositivos sob seu controle, não compartilhar códigos de autenticação e comunicar imediatamente qualquer suspeita de acesso indevido.',
      'O NaRégua pode exigir verificações adicionais, revogar sessões, bloquear acessos suspeitos ou adotar medidas emergenciais quando houver risco de fraude, comprometimento de credenciais, abuso, violação destes Termos ou ameaça à segurança da plataforma ou de terceiros.',
    ]},
    { id: 'servico', title: '3. Serviço, evolução do produto e disponibilidade', paragraphs: [
      'O serviço é fornecido como software em evolução contínua. Recursos, fluxos, interface, integrações e limites técnicos podem ser alterados para corrigir falhas, aumentar segurança ou desempenho, adaptar o produto a mudanças legais e de terceiros ou desenvolver a oferta. Alterações materialmente relevantes que reduzam de forma substancial o serviço contratado serão comunicadas quando razoavelmente possível.',
      'Não há promessa de disponibilidade ininterrupta ou de ausência absoluta de erros. Podem ocorrer manutenções programadas, correções emergenciais, indisponibilidades de infraestrutura, falhas de conexão, incidentes de segurança e interrupções causadas por fornecedores externos. O NaRégua adotará medidas comercialmente razoáveis para prevenir, mitigar e restaurar o serviço, sem afastar direitos e responsabilidades que não possam ser excluídos pela legislação aplicável.',
      'Quando houver manutenção planejada com impacto relevante e houver condição operacional para aviso prévio, a plataforma poderá comunicar a janela de manutenção pelos canais cadastrados ou dentro do produto.',
    ]},
    { id: 'terceiros', title: '4. Integrações e serviços de terceiros', paragraphs: [
      'Determinadas funções dependem de terceiros, incluindo processamento de pagamentos, infraestrutura, provedores de WhatsApp, APIs de inteligência artificial e serviços de rede. Esses serviços possuem disponibilidade, regras, políticas e limites próprios. Uma alteração, suspensão ou bloqueio imposto por terceiro pode afetar determinada funcionalidade mesmo quando o restante do NaRégua continuar disponível.',
      'O uso de WhatsApp deve respeitar as políticas aplicáveis da Meta/WhatsApp e a legislação. A pessoa responsável pelo espaço responde pelo conteúdo das mensagens que envia, por possuir base legal adequada para tratar os dados de seus clientes e, em mensagens promocionais, por utilizar somente pessoas destinatárias que tenham autorizado esse tipo de comunicação.',
    ]},
    { id: 'pagamento', title: '5. Planos, pagamento e acesso', paragraphs: [
      'Preço, ciclo, descontos, período de acesso e condições comerciais válidas são os apresentados antes da finalização da compra. A contratação só deve ser concluída após a possibilidade de revisar essas informações e corrigir os dados informados.',
      'Os pagamentos são processados pela AbacatePay. Nas novas assinaturas mensais no cartão, a renovação é automática até o cancelamento, mediante autorização expressa na contratação. Preço, faixa da equipe e descontos são apresentados antes do pagamento. Descontos exclusivos da primeira mensalidade não se repetem nas próximas cobranças, conforme o resumo da contratação. Períodos adquiridos sem recorrência não se tornam automáticos sem nova autorização. O acesso é liberado após a confirmação do pagamento pelo provedor.',
      'Para interromper cobranças futuras, acesse a área de plano da barbearia no painel e selecione “Cancelar renovação automática”. Após a confirmação, não haverá novas renovações e o acesso continuará até o fim do período já pago. Cancelar a renovação não equivale a excluir a conta nem solicita, por si só, o reembolso do período pago.',
      `Se não conseguir acessar o painel, solicite o cancelamento pelo e-mail ${env.LEGAL_CONTACT_EMAIL || 'informado no canal de suporte da plataforma'}. Informe o e-mail da conta e o endereço do espaço. Não envie senha, código de autenticação nem dados completos do cartão.`,
      'Quando aplicável à relação de consumo, o direito de arrependimento pode ser exercido em até 7 dias contados da assinatura do contrato ou do recebimento do serviço, conforme o art. 49 do Código de Defesa do Consumidor, com devolução integral dos valores pagos. Para exercê-lo, solicite expressamente o cancelamento e o reembolso pelo contato indicado nestes Termos.',
      'Para solicitar reembolso ou comunicar cobrança indevida, informe o e-mail da conta, o endereço do espaço, a data e o identificador da cobrança, se disponível. O pedido será analisado sem afastar os direitos previstos em lei. Reconhecido o direito à devolução, o estorno será encaminhado ao processador; o lançamento do crédito depende do meio de pagamento e da instituição emissora. Não exigimos dados completos do cartão para atender ao pedido.',
      'A participação no programa de indicação em dinheiro exige aceite separado do regulamento exibido na área Indicações. O regulamento define comissão, elegibilidade, validação, saque mínimo, taxa do processador e tratamento de estornos. Cada aceite preserva a versão das regras. Créditos anteriores de desconto não se convertem automaticamente em dinheiro; cancelar a renovação da assinatura não elimina, por si só, comissões legitimamente adquiridas.',
    ]},
    { id: 'responsabilidades', title: '6. Responsabilidades do profissional', paragraphs: [
      'A pessoa responsável pelo espaço responde pela organização e licitude de sua atividade, pelos serviços oferecidos aos clientes, pelos preços e informações publicados, por manter sua agenda e dados corretos, por observar obrigações fiscais e regulatórias próprias e por definir quem pode acessar a conta.',
      'Também é responsável por utilizar dados de clientes apenas para finalidades legítimas, fornecer os avisos de privacidade que lhe caibam como controladora e respeitar solicitações de opt-out de marketing. O NaRégua oferece mecanismos de consentimento e revogação, mas não substitui a análise jurídica da operação particular de cada espaço.',
    ]},
    { id: 'assistant', title: '7. Assistant e recursos de inteligência artificial', paragraphs: [
      'O Mestre AI é uma ferramenta de apoio. Respostas podem conter imprecisões, interpretações incompletas ou erros. A pessoa responsável deve revisar informações antes de utilizá-las para decisões comerciais, financeiras, operacionais ou comunicações com clientes. O Mestre AI não presta aconselhamento jurídico, contábil, tributário, médico ou financeiro profissional.',
      'Algumas solicitações podem envolver processamento por provedores de inteligência artificial. O tratamento aplicável é descrito na Política de Privacidade.',
    ]},
    { id: 'propriedade-intelectual', title: '8. Propriedade intelectual e licença de uso', paragraphs: [
      'O software, código, arquitetura, identidade do produto, interfaces, textos institucionais, marcas, sinais distintivos e demais elementos próprios do NaRégua permanecem de titularidade de seus respectivos titulares. A contratação concede apenas um direito limitado, não exclusivo, não transferível e revogável de acesso e uso da plataforma durante a vigência do plano, conforme estes Termos.',
      'A contratação não transfere código-fonte, marca, tecnologia ou qualquer direito de propriedade intelectual do NaRégua. É vedado copiar, revender, sublicenciar, explorar comercialmente o acesso de terceiros, contornar limites técnicos ou reproduzir elementos protegidos da plataforma fora das hipóteses autorizadas por lei.',
    ]},
    { id: 'conteudo', title: '9. Dados e conteúdo da conta', paragraphs: [
      'A pessoa responsável mantém seus direitos sobre conteúdo, marca e dados que inserir na plataforma. Essa pessoa concede ao NaRégua apenas as permissões técnicas necessárias para armazenar, processar, reproduzir, transmitir e exibir esse conteúdo na medida necessária à prestação, segurança, suporte e evolução do serviço, observada a Política de Privacidade.',
      'É proibido usar a plataforma para fraude, spam, assédio, atividade ilícita, violação de direitos de terceiros, tentativa de acesso não autorizado, engenharia reversa abusiva, distribuição de malware ou qualquer conduta capaz de comprometer o serviço.',
    ]},
    { id: 'suspensao', title: '10. Suspensão e encerramento', paragraphs: [
      'O acesso poderá ser limitado ou suspenso em caso de inadimplência, risco de segurança, uso ilícito, abuso de infraestrutura, violação relevante destes Termos ou determinação legal. Sempre que a situação permitir, serão priorizadas medidas proporcionais e possibilidade de regularização.',
      'A pessoa titular pode solicitar cancelamento pelos canais disponibilizados. O encerramento não elimina obrigações já constituídas nem impede retenção de dados necessária ao cumprimento de obrigação legal, exercício regular de direitos, prevenção a fraude ou outras hipóteses permitidas pela LGPD.',
    ]},
    { id: 'responsabilidade', title: '11. Limites e preservação de direitos', paragraphs: [
      'O NaRégua não se responsabiliza por decisões tomadas exclusivamente com base em dados incorretos inseridos pela própria pessoa usuária, por condutas de clientes ou terceiros, nem por indisponibilidades que estejam fora de seu controle razoável, sem prejuízo das responsabilidades que a lei imponha de forma obrigatória.',
      'Nenhuma cláusula destes Termos deve ser interpretada como exclusão de garantia legal, exoneração por ato doloso, fraude, violação de dever legal de segurança ou renúncia antecipada a direito que não possa ser afastado contratualmente.',
    ]},
    { id: 'mudancas', title: '12. Atualizações destes Termos', paragraphs: [
      'Os Termos podem ser atualizados para refletir evolução do produto, mudanças operacionais, novas integrações ou exigências legais. Cada versão recebe identificador e data. Alterações materialmente relevantes serão apresentadas com destaque razoável e, quando a natureza da mudança exigir, novo aceite será solicitado antes da continuidade do uso afetado.',
    ]},
    { id: 'comunicacoes', title: '13. Comunicações essenciais', paragraphs: [
      'Avisos necessários à execução do contrato, segurança da conta, autenticação, cobrança, alterações materiais do serviço, incidentes, manutenção e suporte podem ser enviados pelos canais cadastrados, inclusive e-mail, WhatsApp ou mensagens dentro da plataforma. Essas comunicações operacionais não se confundem com publicidade e não dependem da autorização promocional opcional.',
      'A pessoa titular deve manter seus dados de contato atualizados. Quando a legislação exigir forma, destaque ou antecedência específicos para determinada comunicação, prevalecerá o requisito legal aplicável.',
    ]},
    { id: 'contato', title: '14. Contato e solução de questões', paragraphs: [
      `Dúvidas, solicitações de cancelamento, reclamações e questões contratuais podem ser encaminhadas para ${env.LEGAL_CONTACT_EMAIL || 'o canal de suporte informado pela plataforma'}.`,
      'Estes Termos são regidos pelas leis da República Federativa do Brasil. Foro, competência territorial e demais regras processuais observarão a legislação aplicável, inclusive normas protetivas de consumidor quando incidentes.',
    ]},
  ]
}

function privacySections(providerName: string): LegalSection[] {
  return [
    { id: 'visao-geral', title: '1. Quem trata os dados', paragraphs: [
      `Para dados do profissional que contrata ou administra o NaRégua, ${providerName} atua como controlador das operações necessárias à conta, contratação, segurança, suporte e relacionamento com a plataforma.`,
      'Para dados de clientes inseridos e utilizados por um espaço dentro do NaRégua, o próprio espaço normalmente define as finalidades do atendimento e atua como controlador; o NaRégua trata esses dados como operador para prestar a plataforma, sem prejuízo de operações próprias estritamente necessárias à segurança, prevenção a fraude, faturamento, cumprimento legal e defesa de direitos.',
    ]},
    { id: 'dados', title: '2. Dados tratados', paragraphs: [
      'Dependendo das funções usadas, podemos tratar: dados de cadastro e contato do profissional; configurações e identidade visual do espaço; dados de clientes e agenda; serviços e valores; registros financeiros inseridos na plataforma; mensagens, números e metadados de WhatsApp; arquivos e mídias enviados; solicitações de suporte; dados de pagamento e conciliação; prompts, contexto e respostas do Mestre AI; além de registros técnicos de segurança, sessão, dispositivo, IP ou identificadores derivados quando necessários para prevenir abuso e comprovar eventos relevantes.',
      'Não solicitamos dados pessoais além do necessário para as finalidades descritas. Informações sensíveis não devem ser inseridas sem necessidade e base legal adequada.',
      'No programa de indicação, tratamos vínculos de convite, valores e datas de comissões, aceite do regulamento, chave Pix CPF/CNPJ, decisões de revisão, identificadores de transferência e comprovantes. A chave Pix é armazenada criptografada, e identificadores protegidos por HMAC ajudam a prevenir repetição de benefícios por recriação de contas. A consulta do destino pela equipe é restrita e registrada. O processador de pagamentos recebe os dados necessários ao repasse.',
    ]},
    { id: 'finalidades', title: '3. Por que tratamos', paragraphs: [
      'Os dados podem ser usados para criar e administrar a conta; executar agendamentos e funcionalidades contratadas; autenticar acessos; processar e conciliar pagamentos; entregar mensagens e automações solicitadas; oferecer suporte; prevenir fraude e incidentes; manter logs e cópias técnicas quando configuradas; melhorar estabilidade e usabilidade; cumprir obrigações legais; exercer ou defender direitos; e operar o Mestre AI quando habilitado.',
      'Comunicações promocionais do NaRégua ou do espaço dependem da hipótese legal aplicável. Quando utilizarmos consentimento, a autorização será específica, separada das condições necessárias ao serviço e poderá ser retirada gratuitamente.',
    ]},
    { id: 'bases', title: '4. Bases legais', paragraphs: [
      'Conforme a operação, o tratamento pode se apoiar na execução de contrato ou procedimentos preliminares; cumprimento de obrigação legal ou regulatória; exercício regular de direitos; legítimo interesse, mediante avaliação de necessidade, expectativa e impacto; proteção contra fraude e segurança; e consentimento quando essa for a base adequada, especialmente para comunicações promocionais opcionais.',
    ]},
    { id: 'compartilhamento', title: '5. Compartilhamento e fornecedores', paragraphs: [
      'Dados são compartilhados apenas quando necessário para a finalidade correspondente. Isso pode envolver infraestrutura de hospedagem e rede; processadores de pagamento como a AbacatePay; provedores e infraestrutura usados para integração com WhatsApp; serviços de inteligência artificial usados pelo Mestre AI; serviços técnicos de armazenamento, observabilidade ou suporte; profissionais autorizados; e autoridades públicas quando houver obrigação ou fundamento jurídico.',
      'Para criar o cliente de cobrança e aproveitar os dados já preenchidos no checkout da AbacatePay, enviamos nome, e-mail, telefone e CPF/CNPJ do responsável. O documento de cobrança persistido no NaRégua é criptografado. Os dados completos de cartão são informados diretamente no ambiente do processador, sem armazenamento pelo NaRégua. Fornecedores recebem apenas os dados necessários à função contratada e devem ser selecionados e geridos com medidas proporcionais de segurança e proteção de dados.',
    ]},
    { id: 'internacional', title: '6. Transferências internacionais', paragraphs: [
      'Alguns fornecedores de infraestrutura, mensageria ou inteligência artificial podem processar dados fora do Brasil. Quando houver transferência internacional sujeita à LGPD, serão adotados mecanismos e salvaguardas aplicáveis, incluindo instrumentos contratuais e medidas de segurança compatíveis com a regulamentação da ANPD.',
    ]},
    { id: 'retencao', title: '7. Retenção e exclusão', paragraphs: [
      'Os dados são mantidos enquanto necessários à prestação do serviço e depois pelo período exigido ou permitido para obrigações legais, prevenção a fraude, auditoria, segurança e exercício regular de direitos. Logs e eventuais cópias técnicas podem seguir ciclos próprios de retenção conforme a infraestrutura configurada. Encerrada a finalidade, os dados serão eliminados, anonimizados ou mantidos apenas nas hipóteses autorizadas por lei.',
    ]},
    { id: 'seguranca', title: '8. Segurança', paragraphs: [
      'Adotamos controles técnicos e organizacionais proporcionais ao risco, incluindo autenticação, controle de acesso, proteção de credenciais e segredos, criptografia de informações sensíveis quando aplicável, registros de eventos, limitação de requisições, segregação por espaço e procedimentos de resposta a incidentes.',
      'Nenhum ambiente conectado à internet é absolutamente imune a falhas ou ataques. Caso ocorra incidente com potencial de risco ou dano relevante, serão adotadas as medidas de contenção, investigação e comunicação exigidas pela legislação e regulamentação aplicáveis.',
    ]},
    { id: 'marketing-whatsapp', title: '9. WhatsApp e promoções', paragraphs: [
      'Mensagens necessárias ao atendimento, acesso ou agendamento são tratadas separadamente de marketing. Para promoções via WhatsApp, a plataforma registra o estado atual da autorização e eventos de concessão ou retirada. A opção promocional começa desativada e só é ativada mediante ação positiva da pessoa titular.',
      'A autorização promocional do espaço pode ser retirada no portal do cliente ou respondendo palavras de saída suportadas, como “SAIR”, “PARE”, “PARAR” ou “STOP”. Comunicações promocionais do próprio NaRégua podem ser desativadas nas configurações da conta. A retirada não impede comunicações transacionais necessárias ao agendamento ou à segurança da conta.',
    ]},
    { id: 'ia', title: '10. Assistant e inteligência artificial', paragraphs: [
      'Quando o Mestre AI é utilizado, a pergunta e apenas o contexto necessário para produzir a resposta podem ser enviados ao provedor de inteligência artificial configurado. Evitamos enviar segredos técnicos e aplicamos limites de uso. A pessoa responsável deve evitar inserir dados excessivos ou sensíveis sem necessidade.',
    ]},
    { id: 'cookies', title: '11. Cookies e armazenamento local', paragraphs: [
      'O NaRégua utiliza cookies e mecanismos locais essenciais para sessão, autenticação, segurança, preferências e funcionamento técnico. Não dependemos de consentimento promocional para os mecanismos estritamente necessários à prestação do serviço. Caso ferramentas não essenciais de publicidade ou rastreamento sejam adicionadas futuramente, esta política e os controles de escolha deverão ser atualizados antes de seu uso.',
    ]},
    { id: 'direitos', title: '12. Direitos da pessoa titular', paragraphs: [
      'Nos termos da LGPD e conforme aplicável a cada operação, a pessoa titular pode solicitar confirmação e acesso; correção; anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade; portabilidade quando regulamentada e aplicável; informação sobre compartilhamentos; eliminação de dados tratados com consentimento, ressalvadas as hipóteses legais de conservação; informação sobre a possibilidade de negar consentimento; revogação; e revisão ou oposição nos casos previstos em lei.',
      'Para dados de clientes tratados por um espaço, a solicitação pode precisar ser dirigida primeiro ao próprio espaço, que é quem determina a finalidade daquele tratamento.',
    ]},
    { id: 'contato-privacidade', title: '13. Canal de privacidade', paragraphs: [
      `Solicitações sobre dados pessoais podem ser enviadas para ${env.PRIVACY_CONTACT_EMAIL || 'o canal de privacidade informado pela plataforma'}. Poderemos solicitar informações proporcionais para confirmar a identidade da pessoa requerente e proteger os dados contra acesso indevido.`,
    ]},
    { id: 'alteracoes', title: '14. Alterações desta Política', paragraphs: [
      'Esta Política é versionada. Mudanças relevantes sobre finalidade, compartilhamento, base legal ou direitos serão comunicadas com destaque razoável. Quando uma nova finalidade depender de consentimento e não for compatível com a autorização anterior, será solicitada nova manifestação antes do tratamento correspondente.',
    ]},
  ]
}

export function legalPublicConfig() {
  const provider: LegalProvider = {
    name: env.LEGAL_PROVIDER_NAME || null,
    taxId: env.LEGAL_PROVIDER_TAX_ID || null,
    address: env.LEGAL_PROVIDER_ADDRESS || null,
    contactEmail: env.LEGAL_CONTACT_EMAIL || null,
    privacyEmail: env.PRIVACY_CONTACT_EMAIL || null,
  }
  const providerName = provider.name || 'NaRégua'
  const documents = {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    updatedAt: '2026-11-06',
  }
  const content = { terms: termsSections(providerName), privacy: privacySections(providerName) }
  const bundleHash = createHash('sha256').update(JSON.stringify({ provider, documents, content })).digest('hex')
  return { provider, documents: { ...documents, bundleHash }, content, supportUrl: env.VITE_SUPPORT_URL || null }
}

export function currentLegalBundleHash() {
  return legalPublicConfig().documents.bundleHash
}

export function legalAcceptanceSnapshot() {
  return JSON.stringify(legalPublicConfig())
}

function normalizedForwardedIp(req: Request) {
  const forwarded = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0]?.trim() : ''
  return forwarded || req.ip || req.socket.remoteAddress || ''
}

export function legalEvidenceFingerprint(req: Request) {
  const ip = normalizedForwardedIp(req).slice(0, 128)
  const userAgent = String(req.headers['user-agent'] ?? '').slice(0, 1024)
  return {
    ipHash: ip ? secretHmac(ip, 'legal-evidence:ip') : null,
    userAgentHash: userAgent ? secretHmac(userAgent, 'legal-evidence:user-agent') : null,
  }
}

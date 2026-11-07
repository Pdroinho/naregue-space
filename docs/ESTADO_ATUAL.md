# Estado atual e continuidade do NaRégua

Atualizado em **06/11/2026**, fuso America/Bahia. Este documento permite continuar o trabalho em outro chat. Não contém credenciais, dados de clientes ou cópia do banco.

## Leitura rápida para um novo chat

O NaRégua é um SaaS multi-tenant de gestão de barbearias, já publicado. A fase atual é de refinamento do produto em uso e homologação operacional dos pagamentos. A última implementação foi a renovação da aba **Indicações** e o programa de recompensas em Pix. A interface, as regras, o registro financeiro e a aprovação DEV estão publicados; o Pix de saída ainda não foi homologado de ponta a ponta.

Não recomeçar a aplicação, a landing ou a integração do zero. Há dados e configurações em produção que precisam ser preservados. Começar verificando o código, as pendências deste documento e o estado real do ambiente.

## Código, versão e publicação

| Item | Estado verificado nesta data |
| --- | --- |
| Workspace usado | `D:\Projetos\naregua`, PowerShell no Windows |
| Repositório | `git@github.com:Pdroinho/naregue-space.git` |
| Branch | `main`, acompanhando `origin/main` |
| Último commit funcional publicado | `a3eb242` — recompensas Pix e nova área de indicações |
| Imagem publicada | `naregua:3.0-ui-a3eb242` |
| Release no servidor | `/opt/lashdesigner/releases/3.0-ui-a3eb242` |
| Versão no package/lock e última tag | `3.0.0` / `v3.0.0` |
| Alterações depois da tag | Em `CHANGELOG.md`, seção “Não lançado”; a tag não representa todo o código atual |
| CI do commit funcional | `checks`, `secrets` e `landing`: sucesso; job de release pulado por ser push de branch |
| API de prontidão | `https://naregua.space/api/ready`, saudável na conferência |

O commit que adiciona esta documentação pode estar à frente do commit funcional na VPS: alteração apenas documental não exige republicar o container. Consultar `deployment-state.json` para saber o código realmente publicado; não inferir isso apenas de `HEAD` ou da tag.

A identidade Git local foi configurada como **Pdroinho**, com e-mail noreply do GitHub. O usuário pediu para evitar autoria “Codex”. Os commits futuros seguem essa configuração. Não houve autorização para reescrever autores antigos, tags ou fazer force-push.

## Produto e escolhas já definidas

- Marca NaRégua; público de barbearias; assistente **Mestre AI**. Não reapresentar o produto como LashDesigner.
- Identidade: petróleo, creme e cobre; Manrope; Hugeicons Free Stroke Rounded hospedados localmente. **Verde não é a identidade do NaRégua.** A AbacatePay foi referência de composição e contraste, não de paleta ou marca.
- A landing usa ilustrações e assets próprios, mockups com a marca real e uma hero enquadrada em cobre claro. A versão mobile tem composição e assets dedicados; não tratá-la como desktop encolhido.
- Painel claro/escuro e whitelabel por espaço: cores de destaque, hover e estados interativos devem derivar do tema. Neutros e estados semânticos continuam do produto.
- Logos mantêm proporção e a área cresce com a altura. Sidebar aberta: controle de recolher na divisória lateral. Recolhida: controle menor sobre a divisória horizontal abaixo da logo, com logo centralizada nos dois eixos.
- Ícones do menu foram diferenciados: Clientes/contact-book, Equipe/user-group, Serviços/scissor, WhatsApp/whatsapp, Indicações/gift, Suporte/headset. No menu recolhido, nomes aparecem com mouse e teclado.
- Evitar texto genérico, telas fictícias sem identidade, uso arbitrário do feminino e afirmações de funcionalidades não comprovadas. As últimas solicitações têm sido correções visuais concretas, publicadas e verificadas em desktop/mobile.

## Funcionalidades e estrutura

React/TypeScript/Vite no frontend; Node/Express/TypeScript no servidor; SQLite local com `better-sqlite3`. Node 22 é a referência do projeto e do CI. Uma instância da aplicação escreve no SQLite; não é uma implantação distribuída.

Estão integrados agenda, reservas pelo navegador, equipe e acesso profissional, clientes, serviços, financeiro, WhatsApp/Evolution, campanhas, Mestre AI, suporte, notificações, recuperação de acesso, configuração da marca e domínios. A linhagem do banco preserva as migrações NaRégua 1–40 e depois 101–118. **Não aplicar migrações 39/40 da referência Lash sobre este banco.**

Arquivos principais:

| Área | Entrada |
| --- | --- |
| Bootstrap e registro de rotas | `server/index.ts`, `server/routes/register*Routes.ts` |
| Migrações | `server/migrate.ts`, `server/nareguaUpgrade.ts` |
| Shell, marca e menu | `src/layouts/Shell.tsx`, `src/components/TenantBrand.tsx`, `src/tenant-brand.css` |
| Administração | `src/features/admin/AdminApp.tsx` |
| Console DEV | `src/features/dev/DevConsole.tsx` |
| Landing | `src/features/marketing/`, `src/LandingPage.tsx` e docs de superfície |
| Upload/análise da logo | `src/features/settings/AdminSettings.tsx`, `server/logoImageProcessing.ts` |
| Temas whitelabel | `src/theme.ts`, `src/naregua-identity.css`, `src/naregua-integration.css` |

## Cobrança de assinatura: produção já configurada

AbacatePay v2 está configurada em **produção**, com credencial privada no servidor. Não é mais correto descrever o checkout atual como sandbox. Não transcrever chaves fornecidas no chat para arquivos versionados.

Planos mensais por espaço/equipe:

| Equipe | Mensalidade |
| --- | ---: |
| 1–3 profissionais | R$74,90 |
| 4–6 profissionais | R$99,90 |
| 7–15 profissionais | R$149,00 |

- Novas assinaturas usam **renovação mensal automática no cartão**, produto mensal compartilhado e `/subscriptions/create`.
- Produtos são reutilizados por plano/preço/ambiente. Não criar produto com nome do comprador nem um produto por cliente. Descontos da primeira mensalidade têm tratamento separado do preço de renovação.
- Dados pessoais e CPF/CNPJ são enviados via cliente do provedor; o documento é validado e persistido criptografado. A máscara CPF/CNPJ é automática. Foi comprovado no sandbox que cliente sem documento não bastava para preencher o checkout hospedado.
- Disponibilidade do endereço do espaço é verificada junto ao campo, com sugestões e conferência final no servidor. Não ocultar conflito de subdomínio em um formulário recolhido.
- Retorno do navegador não concede acesso sozinho. A confirmação consulta o provedor, verifica valor, ambiente e vínculo com o pedido, e encaminha ao espaço correto. A preparação inicial aparece após autenticação quando pendente.
- Cancelamento da renovação pelo painel chama o provedor e conserva o período já pago. A resposta individual e a resposta da operação têm precedência sobre a listagem, que apresentou atraso após cancelamento nos testes.
- Créditos de IA continuam sendo compras avulsas. Períodos antigos não foram transformados retroativamente em recorrência.
- O webhook de produção está cadastrado para os quatro eventos de checkout e cinco de assinatura tratados. Segredo privado de instalação e validação de integridade são exigidos. Não cadastrar outro webhook idêntico sem conferir o existente.
- **Pix Automático:** consta na documentação do provedor; teste anterior foi recusado com “PIX Automático is not available for this store”. Disponibilidade na loja/produção não foi comprovada. Não habilitar nem anunciar Pix recorrente como funcional. Não foi implementada mensalidade por Pix manual.

Fontes técnicas no projeto: `server/payment.ts`, `server/paymentBillingService.ts`, `server/paymentWebhookRuntime.ts`, `server/abacatepayWebhook.ts`, `server/routes/publicOnboardingRoutes.ts`, `src/components/LandingCheckout.tsx`, `src/components/BillingCenter.tsx`. Detalhes e histórico: [ABACATEPAY.md](ABACATEPAY.md).

## Indique e ganhe: regras aprovadas e fluxo real

O usuário aprovou **50% somente da primeira mensalidade efetivamente paga**, após descontos, uma única vez; não é 50% de todas as mensalidades. A barbearia indicada recebe 15% no primeiro pagamento. O mínimo de **saque** escolhido foi **R$100**; não é depósito que o cliente precisa fazer.

1. O indicador aceita o regulamento na aba Indicações e ativa o link. Um link padrão existente pode ser aproveitado para novos pedidos após a adesão.
2. A primeira mensalidade confirmada gera recompensa pendente. Ela não gera também crédito antigo de renovação.
3. São necessários pelo menos 45 dias, segunda mensalidade confirmada e revisão de elegibilidade, identidade e disponibilidade dos valores. O pagamento original é revalidado antes da liberação DEV.
4. A partir de R$100 liberados, o cliente solicita saque, informa uma chave Pix CPF/CNPJ correspondente ao documento de cobrança e confirma a senha atual.
5. Há espera mínima de 48 horas do pedido. No painel DEV, o operador confere o destino, titularidade, vínculos e pagamentos, registra justificativa, confirma senha e digita **ENVIAR PIX REAL**.
6. O botão chama a API da AbacatePay. **A aprovação é humana; a execução da transferência é pela integração.** Não exige abrir o banco e fazer cada Pix manualmente, mas não transfere automaticamente ao atingir o mínimo.
7. Taxa do provedor sai do valor solicitado; taxa, líquido e comprovante são registrados quando confirmados. Timeout/resultado incerto ficam reservados para conciliação; não há reenvio automático.

A nova aba separa saldo pendente, disponível, reservado e pago, link, histórico e regras. Créditos anteriores permanecem separados e não são convertidos em dinheiro. Documentos protegidos por HMAC ajudam a impedir repetição; a chave Pix é criptografada. Reembolso posterior revoga saldo ou gera compensação em comissões futuras; não debita a conta bancária da pessoa. Registros financeiros do programa impedem exclusão permanente do espaço; usar desativação para preservar conciliação e auditoria.

**Limites reais:** não há KYC bancário automático, análise societária automática, orçamento automático de campanha ou conciliação de transferências por webhook. A revisão humana precisa ser realizada, não apenas marcar um checkbox. Esperar 45 dias não elimina chargebacks posteriores. Com desconto e comissão, incentivos consomem 57,5% do preço cheio da primeira mensalidade, antes de taxas e custos: acompanhar retenção e margem antes de escalar.

Código: `server/referralCash.ts`, `server/referralCashGateway.ts`, `server/referralCashSchema.ts`, `server/referralCashPolicy.ts`, `server/routes/referralCashRoutes.ts`, `src/components/ReferralCashDashboard.tsx`, `src/components/DevReferralCash.tsx`. Regulamento, controles e operação: [REFERRAL_CASH.md](REFERRAL_CASH.md).

## O que está comprovado e o que falta

| Tema | Evidência/pendência |
| --- | --- |
| Código funcional publicado | Commit `a3eb242`; CI verde e API de prontidão saudável |
| Esquema | Migração 118 confirmada na VPS |
| Validação local | 284 testes principais, 22 de migração, 16 de segurança e 35 de WhatsApp; typecheck, lint, auditoria de release e build aprovados. Checagens focadas posteriores também aprovadas |
| Tela de indicações | Fixtures no navegador em 1440/390/320px, claro/escuro; adesão, saldo, mínimo, formulário, solicitação e histórico. DEV verificado em desktop/mobile sem transferência |
| Assinatura sandbox | Fluxo completo até pagamento simulado, retorno ao espaço, assinatura ativa, webhook aplicado e cancelamento preservando período pago já foi comprovado; espaços sintéticos foram removidos |
| Produção de pagamentos | Chave autenticada, modo live e webhook configurados. Primeira compra real completa e seu repasse não foram homologados nesta sessão |
| Pix de saída sandbox | Primeiro “Saldo insuficiente”; após entrada simulada de teste, “Serviço temporariamente indisponível”. Não houve envio confirmado de ponta a ponta |
| Pix de saída produção | Diagnósticos sem valor/destinatário chegaram à validação sem erro de permissão. **Isso não comprova transferência real**; nenhum dinheiro real foi enviado |
| Renovação futura | Lógica e replay testados. Um mês real não foi aguardado. Evento sem data confiável fica para revisão, sem conceder período ou comissão por suposição |
| Pix Automático | Documentado pelo provedor, mas recusado no teste da loja; não disponível na interface atual |
| Documentos públicos | Termos/Privacidade `2026-11-06-v3`, incluindo AbacatePay, cobrança, cancelamento, reembolso e indicações |
| Contatos públicos | Ainda configurados com domínio legado `lashdesigner.space`; o usuário não confirmou caixas ativas do NaRégua. Não inventar e-mails nem trocar sem confirmar recebimento |
| Backup externo/restauração | Deploy registrou backup criptografado. Isso não comprova, sozinho, recuperação testada, timer íntegro ou cópia externa atualizada |

Na inspeção de publicação do programa havia zero recompensas e zero saques pagos no novo registro financeiro. São números daquele momento, não um estado fixo a ser imposto ao banco.

## Próximos passos, em ordem

1. Homologar Pix de saída com o provedor. O erro sandbox pode depender de ambiente/loja/serviço; não concluir que produção falha ou que faltam permissões só por esse erro. Não executar Pix real sem autorização específica de valor e destinatário.
2. Acompanhar a primeira contratação real, seu webhook, assinatura, retorno e setup. Não usar dados reais de terceiros como fixtures.
3. Conferir a primeira renovação real e o formato/data do evento antes de tratar o ciclo futuro como completamente homologado.
4. Confirmar os e-mails de atendimento/privacidade que realmente recebem mensagens e então atualizar a configuração privada/publicação dos documentos.
5. Antes de ampliar a campanha, definir orçamento e rotina de revisão; acompanhar CAC, margem, retenção, saques e chargebacks. Não mudar regras já aceitas retroativamente.
6. Continuar refinamentos a partir de relatos/screenshots concretos e verificar mobile e dark mode. Não há outra reformulação de página solicitada e deixada em andamento neste ponto.

## Como retomar o trabalho

Leia primeiro este arquivo, depois `AGENTS.md`, `PRODUCT.md`, `DESIGN.md` e os documentos do módulo. Verifique `git status`, `git log`, branch, CI e estado da VPS. Prefira os documentos atuais acima aos registros históricos de sandbox/InfinitePay.

Para validar e publicar, siga [CONTINUIDADE_OPERACIONAL.md](CONTINUIDADE_OPERACIONAL.md). Não copiar `.env`, banco, mídia, backups ou `.validation/` para o Git. Não reexecutar scripts de homologação apenas porque existem: alguns criam/pagam transações sandbox ou removem espaços sintéticos específicos.

Texto sugerido para abrir outro chat:

> Estamos continuando o NaRégua no repositório Pdroinho/naregue-space. Leia AGENTS.md, docs/ESTADO_ATUAL.md e docs/CONTINUIDADE_OPERACIONAL.md antes de agir. O código funcional de referência publicado é a3eb242, esquema 118; confira se mudou. Pagamentos estão em produção no cartão. O programa de indicações tem 50% da primeira mensalidade paga, 45 dias, segunda mensalidade e revisão, saque mínimo R$100 e execução via API após aprovação DEV. Pix de saída ainda precisa de homologação real; não envie dinheiro ou mensagens sem autorização específica. Preserve dados, segredos, whitelabel e identidade petróleo/creme/cobre. Minha próxima tarefa é: [descrever aqui].

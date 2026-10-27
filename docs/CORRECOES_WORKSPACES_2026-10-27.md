# Correcoes dos workspaces - 2026-10-27

Adaptacao operacional de indicacoes, assinatura, dominios, equipe, financeiro, WhatsApp e seletor de cor. Preserva PRODUCT.md, BRANDING.md e DESIGN.md: neutros creme/petroleo, cobre de acao, Manrope, Hugeicons e geometria compartilhada. Nao introduz nova identidade nem regra global contra banners em outros contextos.

## Alteracoes implementadas

- Indicacoes: remove o banner promocional solicitado; mantem introducao operacional, metricas e informacao honesta de disponibilidade.
- Assinatura: substitui a apresentacao destacada por titulo e explicacao legiveis; organiza planos e resumo de contratacao com superficies existentes, sem cartao lateral comprimido. Planos ficam em uma coluna no mobile.
- Dominios: campo composto com foco visivel e icone limitado; estado vazio usa `EmptyState` e Globe local. A entrada normalizada envia hostname e apresenta instrucoes DNS; o placeholder passa a usar contexto de barbearia.
- Equipe: grade com largura limitada para cada profissional, evitando esticar um unico cartao pelo espaco disponivel.
- Financeiro: cabecalho, acoes, indicadores, movimentacoes, metas e grafico recebem hierarquia de trabalho consistente. Grades se reorganizam abaixo de 1100px e 760px; valores e filtros mantem leitura em larguras pequenas. Falha do extrato e explicita e oferece recuperacao.
- WhatsApp: a primeira requisicao de QR nao depende mais de uma instancia que so seria provisionada pelo servidor depois dessa requisicao. A interface permite iniciar a preparacao quando ainda nao ha configuracao de tenant; falhas da plataforma retornam erro explicito. O servidor reconhece instancia ja conectada e responde esse estado antes de tentar criar outra. Apos a resposta, a interface recarrega a instancia.
- Cor personalizada: substitui a janela nativa de cor por painel inline com presets, campo HEX, plano de saturacao/valor por ponteiro e tres sliders nomeados de tonalidade, saturacao e luminosidade. Aceita #RGB e #RRGGBB, informa erro, permite Enter para confirmar e Escape para fechar e devolver foco ao gatilho. Mantem o estado HSV durante passagem pelo preto e preserva tonalidade ao receber cor acromatica equivalente. O painel herda superficies, textos e foco dos tokens existentes; os gradientes locais representam o espaco funcional de cor e nao uma nova decoracao de marca.

Fontes: `src/panel-workspaces.css`, `src/components/ColorPicker.tsx`, `src/components/color-picker.css`, BillingCenter, ReferralCenter, CustomDomainsSettings, WhatsAppCenter, AdminFinance, AdminTeam e `server/routes/adminWhatsappConnectionRoutes.ts`.

## Evidencias

Capturas em `.validation/workspaces/` incluem financeiro e seus estados de movimentacoes, metas e grafico, assinatura, indicacoes, equipe, dominios e cor, em claro/escuro nas larguras 1440, 1024, 390 e 320px. Incluem tambem primeira conexao WhatsApp e dominio pendente. Nesta passagem foram inspecionadas visualmente cor escura em 320px e financeiro claro em 1440px, alem das fontes e diffs.

`.validation/workspace-review-final.log` registra 12/12 verificacoes aprovadas: o conjunto inclui 48 contextos de layout, operacao de cor por ponteiro/teclado/validacao, primeira requisicao de QR sem instancia, envio normalizado de dominio e recuperacao de falha do extrato. A auditoria registra lista vazia de defeitos medidos e nenhum erro de navegador. Fixtures de API nao fazem chamadas a provedores externos.

`.validation/workspace-settings.log` registra 14/14 e `.validation/workspace-interactions.log` 24/24. A coordenacao confirmou tipos, lint, release e build aprovados. O teste backend WhatsApp em Node 22 passou como um teste de multiplos cenarios: fixture da rota exata, isolamento entre tenants, provedor ausente, instancia ja conectada e ausencia de criacao indevida. O comando reproduzivel `npm run test:panel-ui` agora inclui `--workspace-review`, mantendo este pacote de verificacoes na guarda do painel. O revisor `workspace_batch_finish` concluiu "ship" para este pacote. O ultimo ajuste empilha as metricas de indicacoes no mobile; a recaptura em claro/escuro, 320px e 390px, passou 5/5 (`.validation/workspace-referrals-reviewed.log`). A execucao completa adicional Firefox passou 12/12 (`.validation/workspace-review-firefox.log`), assim como a final Chromium: 48 contextos e os fluxos de QR inicial, dominio normalizado, recuperacao do extrato e regressao HSV ao passar pelo preto. A landing passou 4/4 (`.validation/workspace-landing.log`).

## WhatsApp: alcance da confirmacao

A consulta de producao somente leitura identificou disponibilidade global do provedor (resposta 200), mas tenant de teste sem configuracao. O bloqueio antigo na interface impedia chegar ao caminho de provisionamento do servidor. Os testes locais confirmam a correcao desse caminho e o tratamento de instancia ja conectada; nao demonstram pareamento de um telefone real. Ler o QR em Aparelhos conectados continua sendo uma acao da pessoa operadora. Nenhuma conexao real foi iniciada por esta passagem de documentacao. A coordenacao preve provisionar um novo tenant proprio apos publicar para verificar disponibilidade real do QR no provedor; essa verificacao ainda nao ocorreu. Pareamento pelo telefone e envio real nao estao certificados, e o pareamento permanece uma acao da pessoa usuaria.

## Sistema e limites

DESIGN.md e `.impeccable/design.json` foram preservados: nao descreviam um seletor nativo nem duplicavam um exemplo de ColorPicker, portanto nao ha representacao antiga a sincronizar. O controle inline e documentado aqui como implementado, sem alterar primitivas, canonizar gradientes ornamentais ou inventar um novo componente de exemplo.

A verificacao e local e restrita ao pacote de estados e contextos fornecido. Nao certifica todos os tenants, provedores, dispositivos ou estados possiveis. Dados de teste nao comprovam cobranca, DNS efetivamente propagado ou pareamento de telefone. A publicacao e a prova real estao registradas abaixo; o parecer visual final "ship" e restrito a este pacote e suas evidencias. Ornamentos herdados e textos tenues fora da amostra nao sao declarados conformes nem promovidos a padrao por este registro.

## Validacao real da configuracao WhatsApp

Depois do deploy visual 2e01612, o teste real de preparacao encontrou divergencia: o runtime por tenant consultava somente platform_settings, enquanto a configuracao global efetiva utilizava fallback do ambiente. O runtime agora recebe platformEvolutionConfig da mesma fonte canonica usada pelo painel DEV, preservando isolamento e sem copiar chaves em texto puro para cada tenant. Oito testes Node22 de configuracao, QR, webhook, isolamento, persistencia e transporte passaram, incluindo regressao para ambiente configurado e banco sem configuracao global persistida. A verificacao real posterior do QR esta registrada na secao final.

A prova real identificou tambem o contrato antigo de webhook: a API instalada respondeu HTTP400 exigindo a propriedade webhook. O runtime passou a enviar o objeto aninhado da Evolution, com eventos, cabecalho secreto e webhookBase64/webhookByEvents. A requisicao real corrigida recebeu HTTP201. O diagnostico da tela agora recarrega ao conectar. Os oito testes Node22 passaram novamente com o contrato aninhado.

## Publicacao e verificacao final

Imagem final naregua:3.0-ui-b6f2f17, apos backups criptografados anteriores as trocas. Readiness publico confirmou banco pronto e login publico abriu com os novos estilos. Na Evolution real, a instancia exclusiva do tenant teste respondeu HTTP200 e produziu um PNG de QR Code com 348px. Webhook configurado e lido de volta com URL e eventos esperados: webhookVerified true. A instancia estava connecting, aguardando leitura pelo aparelho. Nenhuma mensagem real foi enviada; pareamento e entrega de mensagens continuam dependendo do WhatsApp do celular.

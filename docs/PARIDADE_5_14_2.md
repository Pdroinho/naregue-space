# Matriz de integração — NaRégua 3.0

Referência: `lash-designer-5.14.2-agendamento-mobile-refinado.zip`. O inventário dos módulos importados e adaptados está em `reference-integration-manifest.json`. Esta matriz identifica a implementação e a forma de validação; não substitui a homologação dos provedores reais.

| Área | Recursos integrados | Implementação/validação |
| --- | --- | --- |
| Arquitetura | Rotas e funcionalidades separadas, carregamento das áreas por demanda | `server/routes`, `src/features`, typecheck e build |
| Acesso | Sessões revogáveis, MFA, dispositivos e recuperação de senha por WhatsApp | `authSessionRuntime`, `passwordRecoveryRoutes`, testes HTTP |
| Setup e marca | Logo preparada no servidor, identificação de símbolo/marca completa, tamanho, paletas, revisão com IA | `brandPresentation`, `logoImageProcessing`, setup e settings |
| Equipe | Cadastro separado de acesso, horários múltiplos, folgas, foto, redes sociais, ativação e remoção com histórico | `adminProfessionalsRoutes`, `professionalAccessRoutes`, `features/team` |
| NaRégua existente | Apelido, cor, contato, horários independentes, acesso individual, filtro por profissional | Ponte 101, campos no editor, `professionalReadScope`, `staffSelfRoutes` |
| Agendamento | Catálogo com busca, seleção de profissional ou distribuição, calendário e horários por período, foco, consentimento e confirmação mobile | `BookingPage`, `customerAppointmentService`, testes HTTP e navegador |
| Agenda | Confirmações, reenvio, presença, bloqueios, timezone e automações | Routers de agenda, runtime de automação e testes |
| Clientes | Histórico, visitas, gastos e consentimento | `adminClientsRoutes`, portal de cliente e testes |
| Financeiro | Períodos civis, metas, entradas, despesas, extrato e gráficos | `finance.ts`, `adminFinanceRoutes`; preço capturado e filtro individual preservados |
| Mestre AI | Ferramentas confirmadas, imagem/logo, preferências, contexto da tela, histórico com mensagens, lembretes, créditos e limites | `assistant*`, `features/assistant`, testes de operações e imagens |
| Histórico da IA | Separado por tenant/usuário; reabrir conversa sem reenviar ao modelo | `AssistantConversation`, `storageScope` gerado no servidor |
| WhatsApp | Inbox, contato após reserva, estado de conexão, mídia privada, lembretes pessoais e campanhas com imagem | Runtimes WhatsApp, `WhatsAppCenter`, testes de filas e segurança de campanhas |
| Campanhas | Cadência, limite diário e por contato, revalidação de consentimento, expiração e interrupção em envio incerto | `campaignSafety`, worker e migração 112 |
| Suporte | Pedidos ADMIN/STAFF, central DEV, notas privadas, anexos, notificações e concorrência | `server/support`, `features/support`, testes com SQLite e sessões reais |
| Indicações | Cotação antes da compra, desconto de primeira compra, reserva de créditos, recompensa e reversão | `paymentReferralService`, testes de pagamento/indicação |
| Cobrança | Catálogo por equipe, checkout, status, recuperação de acesso e créditos do Mestre AI | Serviços genéricos + adaptador AbacatePay; Appmax substituído |
| Domínios | Verificação, configuração e autorização de TLS | Runtimes/domínios, proteção do callback e testes |
| Identidade | Marca, fotos de barbearia, petróleo/creme/cobre, Manrope e Hugeicons | Assets originais, camada de identidade e revisão desktop/mobile |
| Operação | Backup online, criptografia, mídia, exportação, rotação de logs e paths coerentes | `deploy/`, Compose e ensaio local de backup/criptografia |

## Diferenças deliberadas

- NaRégua e Mestre AI substituem a marca e a assistente do Lash; imagens e exemplos são de barbearia.
- AbacatePay substitui Appmax. Os serviços de regras são compartilhados com o modelo da referência, mas autenticação e comunicação com o provedor foram implementadas para a API v2.
- A landing mantém a composição original do NaRégua, com os planos por equipe e o novo checkout.
- A numeração de migração é própria; o banco publicado não recebe uma migração incompatível com sua linhagem.
- O modo escuro opcional e as visões por profissional do NaRégua foram preservados.
- Identificadores criptográficos, DNS e consentimento de versões anteriores permanecem apenas onde a compatibilidade exige.

## Critérios de aceite

Typecheck, lint, testes de domínio/HTTP, migrações, segurança, WhatsApp, gate de release e build devem passar. O navegador deve validar reserva, formulários e estados em desktop/mobile. A atualização deve preservar dados de uma fixture NaRégua 2.2.2 e permitir restauração de seu backup.

A publicação exige ainda a configuração e homologação reais descritas em `PRODUCAO_3_0.md`. Não usar “paridade total” como sinônimo de teste de carga, auditoria independente ou confirmação de compra live que não foi executada.

# Entrega local — NaRégua 3.0

Data: 24/10/2026. Base publicada identificada: NaRégua 2.2.2, `naregua.space`, SSH `oracle_tunado`, diretório `/opt/lashdesigner/app`. A produção não foi alterada.

## Escopo implementado

A referência Lash Designer 5.14.2 foi integrada à arquitetura modular do NaRégua, incluindo equipe e acesso individual, agendamento mobile refinado, recuperação de senha, suporte, campanhas com imagem, ferramentas e lembretes do Mestre AI, planos por equipe e créditos. A [matriz de paridade](PARIDADE_5_14_2.md) relaciona as áreas à implementação e à validação.

Foram preservados marca, fotografia de barbearia, landing original, Manrope, Hugeicons, modo escuro, apelidos/cores dos profissionais, horários individuais e filtros por profissional. A ponte de migração preserva a linhagem própria das migrações 39/40, contas, convites e identificadores criptográficos existentes. O financeiro passou a usar o preço registrado na reserva, evitando alterações retroativas ao editar o catálogo.

Appmax foi substituído pelo adaptador AbacatePay v2. O servidor verifica valor, identidade e ambiente da cobrança antes de conceder acesso; autentica e persiste eventos, trata reentrega e reversões. O checkout antigo fica disponível somente para conciliar pedidos existentes. Planos mantêm renovação manual mensal, conforme a referência.

## Evidências de validação

| Verificação | Resultado |
| --- | --- |
| Instalação limpa com Node 22.23.4 e módulo SQLite nativo | Passou |
| TypeScript frontend/backend, ESLint | Passaram |
| Testes principais de domínio, HTTP e integração | 263/263 |
| Migrações | 22/22 |
| Segurança | 16/16 |
| WhatsApp e campanhas | 35/35 |
| Contratos de release e build de produção | Passaram |
| Auditoria npm, incluindo dependências de desenvolvimento | 0 vulnerabilidades conhecidas |
| Interface Chromium: layouts, formulários, erros, temas e equipe | 70/70 |
| Agendamento Chromium: reserva, conflito, confirmação e reinício | 12/12 |
| Preflight com o `.env` local atual | Bloqueado: AbacatePay live, `DATABASE_PATH` e chave de backup ainda não configurados |

Os 336 testes incluem atualização de uma fixture do banco antigo, preço histórico, isolamento por profissional/tenant, aplicação HTTP real, concessão de pagamento/reentrega/reembolso com provedor simulado e backup/restauração com SQLite WAL e criptografia real. Os 82 checks de interface usam API controlada, sem pagamentos ou mensagens externas. As larguras cobertas vão de 320 a 1440 pixels.

Nos alvos medidos, os textos secundários do agendamento ficaram entre 4,60:1 e 14,33:1; placeholders em 8,37:1 e texto secundário do dashboard mobile em 7,43:1. As ações primárias passaram em seis cores de tenant e as superfícies neutras permaneceram constantes. Isso não cobre todos os textos e estados da aplicação.

A revisão visual independente deu **ship dentro do escopo de cinco correções**, todas resolvidas: neutros protegidos da cor do tenant, cabeçalho mobile legível, acentuação, títulos auxiliares redundantes e contraste secundário do agendamento. Esse parecer não é uma auditoria global de acessibilidade ou de produção. Os logs e capturas locais estão em `.validation*` e `.impeccable/review`, excluídos da distribuição.

## Pendências externas antes de publicar

1. Configurar credenciais live e webhook AbacatePay; executar a homologação descrita em [ABACATEPAY.md](ABACATEPAY.md). Não houve compra live nesta entrega.
2. Conferir os segredos e metadados legais do ambiente e executar `npm run preflight` na configuração final.
3. Ensaiar a atualização e restauração em staging com cópia protegida do banco real. Os testes locais usaram fixtures, não uma cópia dos dados pessoais de produção.
4. Configurar a cópia externa dos backups, testar a chave SSH e substituir o timer antigo conforme [PRODUCAO_3_0.md](PRODUCAO_3_0.md). A rotina SQLite não substitui o backup PostgreSQL/Evolution.
5. Homologar integrações reais de WhatsApp, IA, DNS/TLS e aparelhos Android/iPhone. Definir a política comercial de transição das assinaturas antigas antes de permitir cobrança durante um período já pago.

O código e os procedimentos estão preparados para essa etapa. Não se declara paridade irrestrita, ausência de todos os problemas ou prontidão operacional live sem concluir essas verificações externas.

O gate Node 22 foi executado em instalação limpa no Windows. O build da imagem Docker Linux e o ensaio completo da infraestrutura Compose devem ser realizados no staging; não foram executados contra a VPS de produção nesta entrega.

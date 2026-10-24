# Auditoria técnica do NaRégua — 24/10/2026

Análise do código em `D:\Projetos\naregua` e inspeção por SSH da produção em `oracle_tunado`. Nenhuma configuração, serviço, dado ou código de produção foi alterado. O build local foi regenerado durante a validação.

## Conclusão

A aplicação está disponível e tem proteções relevantes, mas há problemas concretos de recuperação, disponibilidade, cálculo financeiro e agendamento que devem ser resolvidos antes de ampliar a operação. A aprovação nos testes existentes não cobre esses casos.

## Ambiente confirmado

| Item | Evidência |
| --- | --- |
| SSH | `oracle_tunado`, host `servidor-a1-free` |
| Diretório de implantação | `/opt/lashdesigner/app` |
| URL | `https://naregua.space` |
| Versão | 2.2.2 |
| Processo | Node 22.23.2 em Docker, usuário `node`, healthcheck saudável, zero reinícios registrados para o container atual |
| Proxy | Caddy, HTTPS respondendo 200 |
| Aplicação | `127.0.0.1:3000` |
| Evolution | `127.0.0.1:8080`, PostgreSQL 16, Redis 7 |
| Banco | SQLite em `/data/db/app.db`, volume `app_app-db`, migration máxima 40, `PRAGMA quick_check` retornou `ok` |
| Disco | 27 GB utilizados de 96 GB; 69 GB disponíveis |
| Memória | Cerca de 16 GiB disponíveis, swap sem uso no momento da inspeção |

O SHA-256 do `dist/server/index.js` publicado é igual ao arquivo local, inclusive após recompilação: `cb024485edd10e63422d8b26799e3b80f19127007d743f077357e55abc9129dd`. Isso comprova correspondência desse arquivo; não comprova igualdade de todos os módulos, frontend ou variáveis.

Nos logs da aplicação das últimas 24 horas, foram encontrados 3.717 registros JSON: 3.170 respostas 200, 481 respostas 400, 53 respostas 403, 12 respostas 404 e uma resposta 204. Não apareceram eventos com nível `error` nessa amostra. Os healthchecks compõem parte significativa desse tráfego; esses números não representam usuários ativos. Os erros 400 e a maior parte dos 403 vieram da autorização interna de domínios.

## Achados prioritários

### 1. Alta — backup de produção copia o SQLite aberto sem coordenar o WAL

O timer `naregua-backup.timer` executa diariamente às 03:00 UTC o serviço que chama `/opt/lashdesigner/backup.sh`. Esse script usa `cp` sobre `app.db` e depois gzip. Ele não utiliza a API de backup do SQLite, não obtém lock e não inclui o WAL. Na inspeção havia um `app.db-wal` de aproximadamente 37 KB.

Consequência: uma execução bem-sucedida do timer não comprova que todas as transações confirmadas foram copiadas, nem garante uma cópia consistente durante escrita concorrente. Não foi demonstrada perda concreta de registros nesta auditoria.

O projeto já contém uma alternativa em `deploy/backup.sh`, que usa `.backup`, criptografia e checksum, mas ela não está conectada ao agendamento ativo. `BACKUP_ENCRYPTION_KEY` não está configurada no container publicado; trocar somente o comando do timer faria o novo script falhar.

Amostra: o último gzip foi lido em memória; após adaptar apenas os bytes de modo WAL do cabeçalho para permitir a leitura em memória, `quick_check` retornou `ok` e a migration máxima foi 40. Isso não é um ensaio de restauração e não mede dados ausentes do WAL.

Ação: preparar chave independente, alinhar paths e permissões, usar backup online consistente, testar restauração em ambiente isolado e só então substituir o timer. Referência: [SQLite Online Backup API](https://www.sqlite.org/backup.html).

### 2. Alta — cópias sem criptografia e sem recuperação externa comprovada

Os backups ativos são `.db.gz`, legíveis por outros usuários locais (`0644`), em diretório `0755`. O script observado mantém cópias na mesma VPS e não faz exportação externa. Não foi encontrada evidência de uma cópia externa nesse fluxo; isso não exclui snapshots ou serviços externos que não foram inspecionados.

O gzip contém dados da aplicação, potencialmente dados pessoais e hashes de credenciais. Criptografia dos segredos do aplicativo não criptografa o restante do banco. Banco e backups no mesmo host também compartilham o risco de perda da VPS.

Ação: restringir permissões, criptografar, armazenar fora do host e ensaiar recuperação incluindo banco, chave de aplicação, mídias e configuração. Avaliar também recuperação de Evolution/PostgreSQL e das sessões WhatsApp.

### 3. Alta — `body-parser` vulnerável confirmado no container

Produção executa `body-parser` 2.3.0. O advisory GHSA-27r3-jxmh-p828 informa queda do processo por requisição comprimida malformada; a correção está na versão 2.4.0. `server/index.ts` usa `express.json` e `express.urlencoded` sem desativar inflação, antes do rate limit geral. O processo também encerra em `uncaughtException`.

A combinação exige correção prioritária de dependência e validação em staging. Não foi enviada requisição maliciosa à produção; a passagem desse formato pelo proxy não foi ensaiada.

Referência: [advisory do body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828). Não executar atualização cega de todas as dependências no servidor.

### 4. Alta — preço atual altera faturamento histórico

`server/finance.ts:28` soma `services.price_cents` ligado aos agendamentos históricos. O endpoint de edição em `server/index.ts:3668` permite alterar esse preço; a criação de agendamento em `server/index.ts:7646` não persiste um preço contratado.

Exemplo: dez atendimentos confirmados de R$ 40 totalizam R$ 400; atualizar o serviço para R$ 50 faz a consulta histórica passar a R$ 500 sem novos atendimentos. É uma consequência direta das consultas, não uma alteração feita no banco de produção.

Ação: registrar preço no agendamento/lançamento e calcular períodos passados por esse valor. A migração de registros antigos precisa de uma política explícita: o preço histórico exato pode não ser recuperável apenas do catálogo atual. Diferenciar também receita prevista/confirmada de dinheiro efetivamente recebido.

### 5. Média — disponibilidade oferece horários rejeitados ao reservar

`server/publicBooking.ts:177` gera slots a partir do início de cada faixa; `server/index.ts:7628` exige que o minuto do dia seja divisível pelo passo.

Reprodução executada localmente, em SQLite em memória, usando a fixture existente: início 09:05, passo 30 minutos. A disponibilidade retornou `09:05`, `09:35`, `10:05`; os três falham na validação de criação. O cadastro permite minutos fora da grade.

Ação: compartilhar a regra de geração e validação da grade e adicionar teste que percorra disponibilidade até a criação real. Não houve reserva de teste na produção.

### 6. Média — histórico da IA não é separado por conta

`src/components/AssistantConversation.tsx:59` usa chaves fixas para conversa em `sessionStorage` e histórico em `localStorage`, sem usuário ou tenant. Os fluxos de logout observados em `src/App.tsx` encerram a sessão e navegam, sem limpar essas chaves.

Consequência: em um navegador compartilhado, a próxima conta na mesma origem pode recuperar conversa ou prompts anteriores. `sessionStorage` sobrevive à navegação na mesma aba; `localStorage` permanece entre sessões do navegador.

Ação: incluir usuário/tenant nas chaves, limpar informações no logout e tratar migração das chaves antigas. Confirmar o fluxo com duas contas em staging. A origem do navegador separa domínios diferentes, mas não contas na mesma origem.

### 7. Média — segredo de autorização de domínios aparece nos logs

O endpoint `server/index.ts:1048` coloca o segredo no caminho `/api/internal/domains/authorize/:secret`. O logger de acesso em `server/index.ts:770` registra `req.path` integral. A inspeção confirmou registros desse caminho com o segredo configurado; o valor foi omitido deste documento.

Ação: redigir o segmento sensível antes de gravar logs. Revisar a configuração do callback Caddy antes de migrar para outro mecanismo de autenticação; não remover a proteção durante a correção. Considerar rotação coordenada e tratamento dos logs antigos conforme seu acesso e retenção.

### 8. Média — `npm run check` não passa

Typecheck passa. Lint falha por `Scissors` importado e não utilizado em `src/components/ProfessionalManager.tsx:6`; há outras 25 advertências, principalmente dependências de hooks.

A auditoria estrutural passa 72 de 73 regras no Windows. A falha da allowlist de identificadores em `scripts/stable-release-audit.mjs:146` compara paths obtidos com `path.relative` com strings que usam `/`. No Windows os resultados usam `\`, causando falha mesmo com os três arquivos esperados. A busca confirmou somente `domains.ts`, `legal.ts` e `secretCryptoCore.ts` com os identificadores de compatibilidade.

Ação: corrigir import e normalizar paths na auditoria. Não remover os identificadores persistidos de compatibilidade para contornar a regra. Investigar os hooks individualmente; incluir funções instáveis nas dependências indiscriminadamente pode gerar recargas em loop.

### 9. Média — documentação de recuperação aponta para paths diferentes dos volumes reais

`docs/OPERATIONS.md` manda usar `DATABASE_PATH=/data/app.db` e `/backups`, enquanto o Compose publicado monta o banco em `/data/db/app.db` e backups em `/data/backups`. O Dockerfile ainda declara volumes em `/data`, `/media` e `/backups`, produzindo volumes anônimos adicionais, confirmados pela inspeção.

Consequência: seguir os comandos documentados pode procurar/restaurar um banco que a aplicação não usa, ou gerar cópia em volume diferente do esperado. O script atual de backup não cobre as mídias.

Ação: definir um contrato único de volumes, revisar documentação e ensaiar a sequência completa em staging antes de usá-la em incidente.

### 10. Média — retenção de logs Docker não está definida no container

`HostConfig.LogConfig` informa `json-file` com configuração vazia. O Compose local não define `logging`; a tentativa de ler `/etc/docker/daemon.json` não produziu configuração. Não ficou comprovada uma política externa de rotação.

Como toda requisição é registrada, existe risco de crescimento contínuo. O disco está saudável hoje; não foi demonstrado esgotamento.

Ação: confirmar a política efetiva do daemon e definir limites de tamanho/arquivos ou um driver com retenção; adicionar alerta de disco e monitoramento externo de disponibilidade. Healthcheck Docker isoladamente não comprova que notificações chegam ao operador.

## Dependências: alcance dos alertas

`npm audit` local: 12 pacotes sinalizados — 3 críticos, 7 altos, 2 moderados. Com `--omit=dev`: 4 — `body-parser` alto, `proxy-addr` crítico, `qs` moderado e `zod` alto. São classificações dos advisories, não quatro explorações comprovadas nesta aplicação.

No container foram confirmados `express` 5.2.1, `body-parser` 2.3.0, `proxy-addr` 2.0.7 e `zod` 3.25.76. `proxy-addr` requer atenção e atualização, mas o advisory depende de configuração específica de sub-rede IPv6 confiável; o código observado usa `trust proxy = 1`. Portanto, a condição específica descrita não foi identificada. [Advisory do proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).

Os alertas de ferramentas de desenvolvimento não devem ser apresentados como falhas diretamente expostas pelo container de runtime. Atualizar Zod para versão maior exige avaliar compatibilidade. Não foi feito scan de vulnerabilidades das imagens do sistema operacional, Evolution, Redis ou PostgreSQL.

## Arquitetura e pontos positivos

- React 19 + Vite + TypeScript, com separação de alguns componentes e carregamento de chunks; Express 5 com módulos de domínio; SQLite via `better-sqlite3`.
- Escopo funcional amplo: tenants, agenda, profissionais e convites, acesso de clientes, financeiro, assinatura InfinitePay, indicações, WhatsApp, domínios próprios e assistente.
- Sessões opacas com token aleatório, hash persistido, expiração, revogação e cookies de produção `__Host-`; senhas com bcrypt; OTP com limite de tentativas.
- Middleware de papéis e escopo de tenant; consultas avaliadas com parâmetros; projeção pública remove contatos privados dos profissionais. Não foi executado um pentest completo de isolamento entre tenants.
- Transações `IMMEDIATE` na reserva e mecanismos de conflito no banco, reduzindo risco de duas reservas para o mesmo profissional e horário.
- Webhook de pagamento consulta o provedor antes de liberar assinatura/créditos, valida valor e faz transição transacional condicionada ao status pendente, protegendo repetição.
- Ações mutáveis da IA exigem confirmação, verificam usuário/tenant e usam transação; não executam SQL arbitrário fornecido pelo modelo no fluxo revisado.
- Segredos de integrações criptografados, política de origem para mutações, Helmet/CSP, HTTPS, banco com WAL, foreign keys e sincronização FULL em produção.
- Firewall IPv4 observado termina em REJECT; portas 3000/8080 estão em localhost. Portas de outros serviços existem no host, inclusive Minecraft; estar em LISTEN não prova exposição externa. Regras IPv6 e security lists da Oracle não foram auditadas.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| TypeScript frontend e servidor | Passou |
| Lint | 1 erro e 25 warnings |
| Testes de domínio | 44/44 |
| Migrações | 22/22 |
| Segurança | 17/17 |
| WhatsApp/campanhas | 35/35 |
| Total de testes | 118/118 |
| Auditoria estrutural de release | 72/73 no Windows |
| Build Vite + TypeScript do servidor | Passou |
| HTTPS público | HTTP 200 |
| Readiness público e local | Banco ready |
| Quick check do banco publicado | ok |
| Reprodução de grade desalinhada | Confirmada em memória |

O Node local é 24.21.0, fora do intervalo declarado `>=22 <23`; produção usa Node 22. Isso reduz a paridade da validação local. Vite também emitiu aviso sobre `NODE_ENV=production` no `.env`.

O build gerou aproximadamente 392 KB de CSS principal (65,6 KB gzip), JS principal de 262 KB (68,3 KB gzip), além de React e outros chunks. Esses tamanhos merecem acompanhamento, mas não são uma medição de experiência real ou de Core Web Vitals.

## Manutenção e escala

`server/index.ts` tem 8.108 linhas e `src/App.tsx` 7.630. Concentram muitas responsabilidades, tornando permissões, transações e efeitos de alterações mais difíceis de revisar. Priorizar extração por domínio: auth, billing, agenda, financeiro, WhatsApp e área DEV, mantendo os contratos atuais e acrescentando testes HTTP de integração nos fluxos críticos.

SQLite não é o gargalo demonstrado na VPS atual. O limite arquitetural é a combinação de arquivo local, workers no processo e rate limits parcialmente em memória. Não aumentar réplicas sem resolver coordenação de workers, armazenamento de mídia, limites e banco compartilhados.

A pasta local não é um repositório Git. Não foram encontradas instruções AGENTS.md nos arquivos do projeto examinados. Sem histórico/versionamento verificável, rollback e rastreabilidade dependem dos arquivos e imagens preservados; a numeração 2.2.2 isolada não identifica o conteúdo completo do release.

## Ordem de trabalho sugerida

1. Preparar backup consistente, criptografado e externo; comprovar restauração isolada.
2. Corrigir dependências de runtime, principalmente body-parser, e validar em staging.
3. Corrigir preço histórico e alinhar disponibilidade/criação de reservas.
4. Isolar armazenamento da IA e remover segredos dos logs.
5. Fazer o gate passar, alinhar Node 22, paths de operação e retenção de logs.
6. Criar testes de integração de reserva, alteração de preços, troca de contas e replay de pagamento; versionar e modularizar gradualmente.

## Limites

Esta é uma revisão ampla de código e operação, não uma certificação de segurança ou garantia de ausência de bugs. Não foram realizados testes destrutivos, carga, cobrança real, disparos WhatsApp, login com contas de clientes, revisão visual de todas as telas, ensaio completo de restauração, verificação da conta Oracle, nem auditoria jurídica. Os achados financeiros foram derivados do código; nenhuma transação de produção foi modificada. Integrações externas precisam de validação ponta a ponta com credenciais e dados de staging.

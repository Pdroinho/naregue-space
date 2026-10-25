# Publicação NaRégua 3.0 — 24/10/2026

Publicação autorizada pelo usuário e concluída em `oracle_tunado`, servidor `servidor-a1-free`. Código da aplicação: commit `fbe91f8`, versão `3.0.0`, imagem `naregua:3.0-fbe91f8` construída na própria VPS ARM64.

## Estado publicado

- Site: https://naregua.space
- Acesso do espaço existente: https://teste.naregua.space/login
- Agendamento do espaço existente: https://teste.naregua.space/agendar
- Container `naregua-app`: saudável; `/api/health` informa versão 3.0.0 e `/api/ready` confirma o banco.
- Migração 40→115 concluída, integridade SQLite `ok`, zero violações de chaves estrangeiras.
- Preservados o espaço, dois usuários, um profissional, três serviços e os identificadores existentes. Não havia agendamentos antes da atualização.
- AbacatePay permanece desabilitado para novas compras: não foram encontradas chave live e segredo de webhook no ambiente em execução. O preflight comercial bloqueia somente esses requisitos de pagamento. A chave de backup foi criada e configurada; a chave de criptografia da aplicação foi preservada.

## Preparação e recuperação

Antes da troca, foram guardados banco, mídia, configuração/código e dump PostgreSQL/Evolution, com criptografia e checksum. O conjunto criptografado foi copiado e verificado fora da VPS em `.validation/production-backup-20261024/`. A chave fica em arquivo privado separado e não pertence ao Git ou à distribuição.

Na VPS, os artefatos estão em `/opt/lashdesigner/deployment-backups/20261024T235417Z/`. O snapshot `final-pre-upgrade.sqlite.enc` foi feito após parar a aplicação antiga, antes da migração real. A imagem anterior está preservada como `naregua:rollback-20261024T235417Z`; as fontes anteriores em `/opt/lashdesigner/app-before-20261024T235417Z/`. O registro operacional privado é `/opt/lashdesigner/deployment-state.json`.

O ensaio restaurou o backup criptografado em banco isolado, executou e repetiu a migração, comparou os IDs, verificou integridade e leitura dos segredos existentes. A composição HTTP foi iniciada com rede externa desativada, sem tocar no banco publicado ou enviar mensagens.

Para rollback, parar o aplicativo e restaurar o snapshot anterior junto da imagem e configuração anteriores; não basta trocar a imagem sobre o banco migrado. Preservar antes um backup do estado pós-publicação para não descartar alterações feitas depois do deploy. O procedimento de rollback automático não precisou ser acionado.

## Ajustes específicos da infraestrutura existente

`/opt/lashdesigner/app` agora aponta para `/opt/lashdesigner/releases/3.0-fbe91f8`. Foi mantido o projeto Compose `app`, os volumes existentes e a rede `app_naregua-net`. O gateway real é `172.18.0.1`; o Compose publicado autoriza esse gateway em `INTERNAL_PROXY_IPS`, em vez de criar a rede nova proposta no pacote. PostgreSQL, Redis e Evolution não foram recriados.

O timer existente `naregua-backup.timer` continua ativo. Seu script `/opt/lashdesigner/backup.sh` foi substituído por uma rotina que chama o backup online criptografado do container e copia seus arquivos para `/opt/lashdesigner/backups-v3`, com retenção de 14 dias. Foi executada com sucesso depois da publicação. A cópia externa desta publicação é manual; um destino externo recorrente ainda precisa ser configurado. O dump PostgreSQL desta publicação não substitui uma rotina recorrente própria do Evolution.

## Verificação em navegador real

Chromium abriu a aplicação publicada por HTTPS e validou a landing, acesso por espaço, catálogo de três serviços, identificação do profissional, consulta de disponibilidade real e passagem ao formulário de confirmação. Layout mobile de 390 pixels sem overflow e sem imagens quebradas no agendamento. Não foi concluída reserva nem disparada mensagem ou cobrança.

O painel recusou acesso anônimo com HTTP 401, como esperado, e seu botão abriu o login correto. O conteúdo autenticado do painel não foi inspecionado sem as credenciais do usuário. Capturas locais: `.validation/production-home-desktop.png`, `.validation/production-booking-mobile.png` e `.validation/production-login-mobile.png`.

Ainda pendentes: homologação financeira live do AbacatePay, integrações externas autenticadas e backup remoto recorrente. Esses pontos não foram tratados como aprovados pelo deploy ou pelo teste público de navegador.

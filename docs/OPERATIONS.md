# Operação atual

Para a versão 3.0, siga [Produção e recuperação](PRODUCAO_3_0.md). Esse documento substitui os comandos antigos que apontavam para `/data/app.db` e `/backups`.

O contrato correto do Compose é banco em `/data/db/app.db`, mídia em `/data/media` e backups em `/data/backups`. O backup agendado antigo da VPS deve ser substituído somente depois de validar a nova exportação e restauração.

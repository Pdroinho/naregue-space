# Deploy com Docker Compose

## Requisitos

- Docker Engine e Compose v2;
- proxy reverso apontando para `127.0.0.1:3000`;
- DNS do domínio principal, wildcard de espaços e hostname DEV;
- arquivo `.env` real fora do artefato público.

## Subir

```bash
cp .env.example .env
docker compose config
docker compose build --pull
docker compose up -d
docker compose ps
curl --fail http://127.0.0.1:3000/api/ready
```

As variáveis `VITE_*` são incorporadas ao frontend durante o build. Reconstrua a imagem quando domínio, suporte ou URLs legais mudarem.

## Persistência

- `naregua_data`: `/data/app.db`;
- `naregua_media`: `/media`;
- `naregua_backups`: `/backups`.

Nunca use `docker compose down -v` em produção.

## Backup

```bash
docker compose exec -e DATABASE_PATH=/data/app.db -e BACKUP_DIR=/backups app /app/deploy/backup.sh
```

O arquivo gerado termina em `.sqlite.gz.enc`, usa AES-256-GCM e exige `BACKUP_ENCRYPTION_KEY`. Copie o backup criptografado e seu `.sha256` para outro provedor ou região.

## Restauração

```bash
docker compose stop app
docker compose run --rm --no-deps \
  -e DATABASE_PATH=/data/app.db \
  --entrypoint /app/deploy/restore-container.sh \
  app /backups/naregua-AAAA-MM-DDTHH-MM-SSZ.sqlite.gz.enc
docker compose start app
curl --fail http://127.0.0.1:3000/api/ready
```

O script valida checksum e integridade e preserva o banco anterior como `app.db.before-restore-*`.

## Atualização

Faça backup, reconstrua, suba com `--remove-orphans` e execute o smoke test completo de `docs/RELEASE_CHECKLIST.md`.

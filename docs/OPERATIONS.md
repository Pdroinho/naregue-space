# Operações e recuperação — Docker

O caminho recomendado para produção é Docker Compose. A instalação direta via systemd permanece documentada separadamente em `DEPLOY_VPS.md` apenas como modalidade legada.

## Sinais vitais

```bash
docker compose ps
docker compose logs -f app
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
docker system df
df -h
```

A porta 3000 deve ficar publicada somente em `127.0.0.1` do host; Caddy/Nginx/Traefik expõe HTTPS.

## Backup

O container inclui `deploy/backup.sh`, que usa `.backup` do SQLite, comprime, criptografa com AES-256-GCM usando `BACKUP_ENCRYPTION_KEY` e gera checksum:

```bash
docker compose exec \
  -e DATABASE_PATH=/data/app.db \
  -e BACKUP_DIR=/backups \
  app /app/deploy/backup.sh
```

Agende esse comando no host (cron/systemd timer/runner de infraestrutura) e copie o `.sqlite.gz.enc` e seu `.sha256` para outro provedor/região. Um volume na mesma VPS não é backup contra perda do host. Guarde `BACKUP_ENCRYPTION_KEY` fora do mesmo storage dos backups.

## Restauração

Teste mensalmente em staging. Para restaurar em produção:

```bash
docker compose stop app
docker compose run --rm --no-deps \
  -e DATABASE_PATH=/data/app.db \
  --entrypoint /app/deploy/restore-container.sh \
  app /backups/naregua-AAAA-MM-DDTHH-MM-SSZ.sqlite.gz.enc
docker compose start app
curl -fsS http://127.0.0.1:3000/api/ready
```

O script valida o banco antes da instalação e preserva o banco anterior como `app.db.before-restore-*`.

**Nunca use `docker compose down -v` em produção**, pois `-v` remove os volumes persistentes.

## Incidente

1. Preserve logs e horário exato.
2. Se houver exposição, retire o serviço do proxy antes de alterar evidências.
3. Revogue sessões/dispositivos pela aplicação ou de forma controlada no banco.
4. Se houver exposição de segredos, rotacione credenciais com procedimento que preserve ciphertext existente.
5. Rotacione chaves de DNS, VPS, InfinitePay, Evolution e domínio conforme o vetor.
6. Restaure somente de backup validado.
7. Registre impacto, causa raiz, correção e prevenção.

## Capacidade

SQLite deve rodar em uma única instância da aplicação. Antes de escalar horizontalmente, migre banco, arquivos e rate limits para serviços compartilhados.

## Recuperação de acesso

ADMIN/DEV possuem troca de senha e sessões revogáveis. CLIENT acessa por telefone + OTP WhatsApp. Enquanto não existir recuperação profissional por e-mail transacional, perda simultânea da senha e do WhatsApp cadastrado exige procedimento de suporte com confirmação de identidade e trilha de auditoria.

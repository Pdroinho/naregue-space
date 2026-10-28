# Publicação e recuperação — NaRégua 3.0

## Estado da entrega

A versão 3.0 foi publicada deliberadamente na VPS. Na preparação da release GitHub, a base de código em produção é `79d4a3c`; mudanças posteriores dessa preparação documentam a entrega e adicionam CI. O push para o GitHub não publica no servidor. Não copie `.env`, banco ou volumes de desenvolvimento para produção.

O checkout publicado está em sandbox por autorização do responsável enquanto a conta de pagamentos aguarda aprovação. Consulte `ABACATEPAY.md` antes de habilitar cobranças reais. Relatórios, credenciais e arquivos operacionais privados não fazem parte do Git.

## Antes do deploy

1. Guardar a imagem/configuração anterior e um backup SQLite online consistente. Não confiar apenas no `cp app.db` do timer antigo. Preservar também mídias, PostgreSQL/Evolution e as chaves fora do host.
2. Restaurar o backup em staging, executar a atualização 40→115 e validar dados, foreign keys e acesso ADMIN/STAFF/CLIENT. Nunca aplicar as migrações 39/40 do Lash ao banco NaRégua.
3. Configurar e homologar AbacatePay conforme `ABACATEPAY.md`, Evolution, MFA e IA. A chave de aplicação existente precisa ser preservada para ler os segredos criptografados.
4. Usar Node 22 e `npm ci`. Executar `npm run check` e os testes de navegador. Com as variáveis reais carregadas, executar `npm run preflight`.
5. Revisar a nova rede Docker `172.30.41.0/24` contra redes existentes. O callback interno de TLS autoriza o gateway definido em `INTERNAL_PROXY_IPS`; nunca habilitar essa rota para qualquer IP privado indiscriminadamente.
6. Definir `EVOLUTION_DB_PASSWORD` com a senha que o volume PostgreSQL já usa. Alterar a variável não muda a senha dentro de um banco existente; a rotação deve ser coordenada. Usar senha alfanumérica na URI ou adaptar o escape antes de usar caracteres especiais.

## Volumes

| Dado | Caminho no container | Volume |
| --- | --- | --- |
| Banco | `/data/db/app.db` | `app-db` |
| Mídia WhatsApp | `/data/media` | `app-media` |
| Backups criptografados | `/data/backups` | `app-backups` |

Os nomes reais dependem do projeto Compose; na produção inspecionada o banco está em `app_app-db`. Não mudar o nome do projeto Compose sem mapear explicitamente os volumes existentes. Não executar `docker compose down -v`.

O container roda como `node`, escuta em `0.0.0.0:3000`, é publicado somente em `127.0.0.1:3000` do host e usa healthcheck em `/api/ready`. Caddy entrega HTTPS. O log da aplicação tem limite no driver `local`.

## Backup

`deploy/backup.sh` usa `.backup`, verifica a cópia e grava banco e mídia em arquivos criptografados com AES-256-GCM. Configure `BACKUP_ENCRYPTION_KEY` separada da chave da aplicação e preserve ambas em cofre externo. As cópias têm checksum e permissões restritas.

No container:

```bash
docker compose exec -T app /app/deploy/backup.sh
```

O host usa `deploy/backup-host.sh`. Configure `/etc/naregua-backup.env` com permissão 600:

```dotenv
BACKUP_CONTAINER=naregua-app
BACKUP_HOST_DIR=/opt/lashdesigner/backups-v3
BACKUP_REMOTE_TARGET=backup@outro-servidor:/backups/naregua/
```

Instale o serviço/timer somente depois de testar a chave SSH e a exportação. O job falha se não conseguir exportar; um timer executado não substitui alerta de falha. Mantenha retenção também no destino remoto. O PostgreSQL/Evolution exige rotina própria de `pg_dump` e recuperação de suas instâncias; o backup do SQLite não substitui isso.

## Restore e rollback

Parar o aplicativo antes de substituir o banco. Testar primeiro em staging:

```bash
docker compose stop app
docker compose run --rm --no-deps --entrypoint /app/deploy/restore-container.sh app /data/backups/naregua-DATA.sqlite.gz.enc
docker compose start app
curl -fsS http://127.0.0.1:3000/api/ready
```

O restore preserva uma cópia anterior, valida integridade e remove WAL/SHM antigos antes de instalar o banco. Para recuperar mídia, verificar checksum, descriptografar o `.media.tar.gz.enc` com `backup-crypto.mjs` e extrair no volume `/data/media` com o app parado, mantendo proprietário `node`. Não extrair um arquivo não verificado sobre o volume.

Para voltar à versão 2.2.2, restaurar a imagem anterior **e o backup anterior à migração**. Não executar a aplicação antiga sobre um banco atualizado supondo compatibilidade de papéis e triggers. Não há down migration destrutiva automática.

## Após publicar

Conferir health/readiness, logs, timer e cópia remota. Usar contas de teste para validar login/MFA, recuperação, aceite legal, equipe, reserva, confirmação, presença, preço histórico, financeiro, suporte e notificações. Conferir isolamento entre espaços e acesso STAFF. Homologar em Android/Chrome e iPhone/Safari reais, além do Chromium automatizado. Acompanhar rejeições de pagamento e fila de eventos.

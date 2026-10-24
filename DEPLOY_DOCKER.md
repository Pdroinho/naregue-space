# Deploy Docker — NaRégua 3.0

O procedimento autoritativo está em [docs/PRODUCAO_3_0.md](docs/PRODUCAO_3_0.md).

Use o mesmo projeto Compose e os volumes publicados. Configure AbacatePay, chave de backup, segredo do webhook, credencial existente do PostgreSQL Evolution e a rede interna antes de iniciar. `docker compose config` precisa passar com o ambiente real; as credenciais de exemplo devem falhar no preflight.

Antes de recriar: backup online externo e teste de restore. Depois de compilar/publicar: readiness, fluxos com conta de teste e logs. Nunca execute `docker compose down -v` em produção.

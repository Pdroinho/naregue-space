# NaRégua 2.2.2

SaaS multi-tenant para barbearias: agenda, clientes, serviços, caixa, cobrança, WhatsApp, domínio próprio e inteligência operacional.

## Operação com equipe

- cadastro de múltiplos profissionais, serviços habilitados e horários próprios;
- visão “Toda a equipe” e visão individual no dashboard, agenda, clientes e caixa;
- bloqueios gerais ou por profissional;
- agendamento público com escolha do barbeiro ou atribuição automática ao próximo disponível;
- proteção transacional contra conflito de agenda e isolamento entre espaços;
- conta individual opcional por profissional, limitada à própria agenda e ao próprio perfil;
- convites de equipe gerados e revogados somente pelo responsável do espaço.

O modelo, as permissões e as regras de migração estão documentados em `docs/MULTIPLOS_PROFISSIONAIS.md`.

## Stack

- React 19, Vite e TypeScript;
- Express 5 e TypeScript;
- SQLite com `better-sqlite3`;
- Docker Compose em produção, atrás de proxy reverso;
- sessão opaca revogável, MFA por WhatsApp e segredos criptografados;
- checkout InfinitePay;
- Hugeicons local para iconografia funcional.

## Desenvolvimento

```bash
cp .env.example .env
npm ci
npm run dev
```

## Gate de release

```bash
npm run check
# com as variáveis reais carregadas:
npm run preflight
```

O gate executa typecheck de frontend e servidor, lint, testes de domínio, migrations, segurança, WhatsApp, auditoria estrutural do release e build de produção.

## Produção

O caminho recomendado está em `DEPLOY_DOCKER.md`. Antes de publicar, conclua também `docs/RELEASE_CHECKLIST.md` no staging com as integrações reais.

## Estrutura

```text
src/            frontend e design system
src/components/ componentes reutilizáveis
server/         API, autenticação, banco e migrações
deploy/         backup, restore, proxy e serviços
scripts/        preflight e gate estável
docs/           operação e contratos do produto
public/         marca, fotografia e ícones
```

## Limite arquitetural

SQLite atende uma implantação de uma única VPS e carga inicial/moderada. Escala horizontal exige banco, arquivos e rate limits compartilhados.

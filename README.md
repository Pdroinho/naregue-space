# NaRégua 3.0.0

Gestão para barbearias, com a evolução funcional da referência 5.14.2 e a identidade original do NaRégua.

Código consolidado em `main`, com release identificada pela tag anotada **`v3.0.0`**. Consulte o [changelog](CHANGELOG.md) e as [notas da release](docs/RELEASE_3.0.0.md). A publicação no GitHub não executa deploy automático.

## O que está integrado

Agenda e reserva mobile, equipes e acesso individual, clientes, financeiro, suporte com anexos/notificações, recuperação de senha, domínios, WhatsApp, campanhas com imagem, Mestre AI com ferramentas confirmadas, lembretes e histórico por conta. Novas cobranças usam AbacatePay v2, incluindo planos por equipe, indicações e créditos extras.

A landing, as fotografias de barbearia, a marca, Hugeicons e a paleta petróleo/creme/cobre permanecem NaRégua. Planos mensais herdados da referência: R$ 74,90 (1–3 profissionais), R$ 99,90 (4–6), R$ 149,00 (7–15), com renovação manual.

## Desenvolvimento e validação

Node 22 e npm 10 ou superior. Use `.env.example` como referência; nunca versione `.env` ou dados reais.

```bash
npm ci
cp .env.example .env
npm run dev
npm run check
npm run test:ui
npm run test:booking-ui
```

Os testes de servidor usam ambiente e bancos isolados. Os testes de navegador usam APIs controladas; não fazem cobranças nem enviam WhatsApp. Para instalar Chromium: `npx playwright install chromium`.

A landing do celular possui implementação e assets próprios; o desktop mantém sua composição. Para validar as duas:

```bash
npx playwright install chromium firefox
npm run build
node scripts/check-landing-ui.mjs --desktop-only
node scripts/check-mobile-landing.mjs
node scripts/check-mobile-landing.mjs --firefox
```

`npm run preflight` exige configuração operacional e deve ser executado no ambiente preparado para deploy. Ele não usa as mesmas premissas dos testes isolados.

## Estrutura e paridade

- `ARCHITECTURE.md`: módulos, dados, acesso e limites.
- `docs/PARIDADE_5_14_2.md`: matriz de funcionalidades integradas e diferenças deliberadas.
- `docs/ABACATEPAY.md`: configuração, segurança e homologação da cobrança.
- `docs/PRODUCAO_3_0.md`: publicação, migração, backup e rollback.
- `VALIDATION.md`: comandos e evidências de verificação.
- `SECURITY.md`: regras para credenciais, varredura de segredos e relato privado de falhas.
- `.github/workflows/ci.yml`: verificações automáticas de qualidade, landing e histórico Git.

## Produção

A ponte de banco preserva a linhagem 1–40 do NaRégua e adiciona as migrações 101–115. Não aplique as migrações 39/40 do Lash diretamente. Faça backup online, restaure em staging e execute `npm run preflight` com as variáveis reais antes de publicar.

Uma instância da aplicação escreve no SQLite local. A migração não transforma SQLite em banco distribuído. Provedores externos precisam de homologação real; testes locais não comprovam credenciais live.

# Validação — NaRégua 3.0.0

## Entrega consolidada de 28/10/2026

`npm run check` passou com 268 testes principais, 22 de migração, 16 de segurança e 35 de WhatsApp, além de TypeScript, ESLint, auditoria de release e build. Os bancos dos testes são isolados e não usam dados de produção.

Verificações da landing:

```bash
npx playwright install chromium firefox
npm run build
node scripts/check-landing-ui.mjs --desktop-only
node scripts/check-mobile-landing.mjs
node scripts/check-mobile-landing.mjs --firefox
```

Desktop: 9/9 verificações. Mobile: 8/8 em Chromium e 8/8 em Firefox, incluindo troca de orientação sem perder os campos do cadastro, catálogo, indicação e checkout sandbox. Não houve criação de pedidos reais ou envio de mensagens nos testes.

Gitleaks inspeciona todo o histórico Git com valores redigidos. A auditoria de publicação e os relatórios de ferramentas permanecem locais em `.validation/`, fora do repositório. Nenhuma verificação automatizada comprova aumento de conversão ou substitui Safari e aparelhos físicos.

As seções de versões 2.x abaixo documentam a base histórica; não limitam as mudanças de runtime feitas na 3.0.

O gate oficial continua sendo:

```bash
npm ci
npm run check
npm run preflight
```

`npm run check` valida TypeScript do cliente e servidor, ESLint, testes de domínio, migrations, segurança, WhatsApp, auditoria estrutural e build de produção.

## Cobertura nova da 2.2.2

- stepper mobile do booking com cinco segmentos em linha única;
- rodapé do booking fixo à viewport, respeitando safe-area;
- conteúdo e CTA de confirmação reservam espaço para o rodapé fixo.

## Cobertura nova da 2.2.1

- dropdown compartilhado calcula altura de opções simples/detalhadas para não criar rolagem falsa e oculta somente o chrome visual do scrollbar;
- Agenda mantém o seletor segmentado em desktop e mobile, com ícones funcionais, foco e `role=tab`;
- dashboard não reintroduz o runway decorativo nem ícones encaixotados nas métricas;
- Equipe não reintroduz trilhos decorativos ou indicadores pulsantes;
- sidebar desktop recolhido esconde identidade textual mesmo com marca do tenant, sem afetar o drawer mobile;
- Agenda mobile omite copy de escopo redundante e mostra contexto textual apenas para Bloqueios;
- Clientes mobile usa resumo em uma coluna, destaque condicional, filtros segmentados e estado vazio com área de respiro própria.

## Cobertura nova da 2.2.0

- migration de vínculo entre usuário e profissional e tabela de convites;
- guards no SQLite impedindo vínculo de conta/perfil e convites entre tenants ou com role incompatível;
- sessão com role `PROFESSIONAL` preservando escopo de tenant;
- token de convite persistido apenas como SHA-256;
- expiração de convite em sete dias;
- convite restrito ao hostname/tenant que o emitiu e revalidado dentro da transação de aceite;
- contrato profissional limitado ao próprio perfil e aos próprios atendimentos;
- dados de assinatura omitidos das identidades não administrativas;
- escrita de atendimento pelo profissional restrita a confirmar ou cancelar;
- expediente customizado preserva múltiplos intervalos por dia e rejeita sobreposição;
- edição de profissional salva perfil, serviços e expediente na mesma transação;
- auditoria estrutural impede retorno de contatos no booking público, metadados administrativos no portal profissional, glyph de check rejeitado e indicadores pulsantes da antiga tela de equipe.

## Validação executada neste pacote

- migrations: **22/22**;
- segurança e isolamento: **17/17**;
- WhatsApp/campanhas: **35/35**;
- política de expediente profissional: **4/4**;
- auditoria estrutural de release: **73/73**;
- parse sintático TypeScript/TSX com TypeScript 5.8.3: **85/85 arquivos `.ts`/`.tsx` executáveis** (arquivos de declaração não entram nessa contagem);
- `bash -n` nos scripts de deploy shell;
- `node --check` nos scripts `.mjs` de deploy/release.

Neste ambiente o pacote fonte continua sem `node_modules`. O typecheck completo não pôde ser executado porque a dependência `vite/client` não está instalada localmente; por isso **não é registrado aqui um `npm ci`, `npm run check`, `npm test` via `tsx`, typecheck semântico/ESLint completo ou build Vite novo como se tivessem sido executados**. Esta microversão não altera arquivos TypeScript/TSX: as mudanças de runtime ficam restritas ao CSS do booking mobile, além do gate estrutural e metadados de release.

Antes de publicar, uma instalação limpa deve obrigatoriamente executar o gate oficial acima. Checkout InfinitePay, Evolution/WhatsApp, DNS/TLS, backup externo e restore permanecem no gate de staging por dependerem da infraestrutura real.

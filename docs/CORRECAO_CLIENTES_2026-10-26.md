# Correcao da tela Clientes - 2026-10-26

Ajuste pontual a partir da captura fornecida pelo usuario (`codex-clipboard-yfue4G.png`): havia dois controles de menu no desktop, busca sem respiro em relacao ao cabecalho e icone escuro pouco visivel no estado vazio. A identidade NaRégua e os dados de clientes permanecem no sistema existente; nao se introduziu nova direcao visual.

## Alteracoes

- O menu duplicado do topo fica oculto acima de 900px. O controle da propria barra lateral continua disponivel; a navegacao movel e o acesso "Mais" continuam pertencendo ao arranjo mobile.
- A busca recebe uma barra de ferramentas com 20px de preenchimento no desktop e ajuste proprio abaixo de 640px. Seu foco fica visivel usando `--brand-accent-strong`.
- O estado vazio usa o componente local `Users` com 48px, em uma base de 72px com `--surface-soft` e `--ink-body`. Substitui a imagem SVG escura fixa; acompanha os dois temas.
- A tabela e seus cabecalhos so aparecem quando existem linhas filtradas. Uma base ainda vazia recebe a mensagem de primeiro agendamento; busca sem correspondencias recebe mensagem especifica e acao "Limpar busca".
- O resumo mobile nao ocupa espaco quando nao ha clientes. A lista mobile preserva o resumo e os dados quando existem registros.
- `EmptyState` aceita um icone como alternativa a imagem; consumidores existentes com imagem continuam aceitos.

Fontes alteradas: `src/features/clients/AdminClients.tsx`, `src/components/SharedUi.tsx` e `src/naregua-integration.css`. Os ajustes de verificacao ficam nos scripts de QA; nao fazem parte de uma nova regra visual.

## Evidencias

Comparados PRODUCT.md, DESIGN.md, diff corrente, captura original e capturas locais em `.validation/clients-review/`. O conjunto possui estados vazio/com dados em claro/escuro nas larguras 1440px, 390px e 320px. Inspecao visual desta passagem: vazio escuro desktop e dados claros em 320px, incluindo busca e navegacao inferior.

Os logs `.validation/clients-check.log` e `.validation/clients-firefox.log` registram 14/14 verificacoes aprovadas em cada navegador, com fixtures locais e sem chamadas a provedores externos. Cobrem busca sem resultados, limpeza, erro de API e recuperacao por nova tentativa; nao foram observados erros de navegador nas execucoes registradas. `.validation/clients-build.log` registra build aprovado.

Revisor independente: disposition ship para os defeitos apontados e alteracoes desta tela, com capturas estabilizadas apos fontes e animacoes. Regressao de interacoes: 24/24 aprovada. Tipos e lint aprovados. Publicado na imagem naregua:3.0-ui-e55ee53 apos backup criptografado. Container healthy, zero reinicios, /api/ready publico com database ready. Login publico abriu no navegador apos a troca. O painel autenticado foi validado localmente com fixtures; nao houve alteracao de clientes reais.

## Sistema de design e limites

DESIGN.md e `.impeccable/design.json` foram preservados. Nenhum token documentado mudou: o ajuste reaplica neutros tematicos, tipografia, geometria e Hugeicons existentes a um estado de uso. Nao ha necessidade de sincronizacao do sistema de design para esta correcao.

A verificacao e restrita aos estados, navegadores e larguras exercitados, com dados de teste. Nao certifica todos os tenants, dados reais, fluxos de negocio ou conformidade global de acessibilidade. Nao promove metadados tenues ou ornamentos herdados a padrao aprovado nem aplica novas proibicoes visuais.

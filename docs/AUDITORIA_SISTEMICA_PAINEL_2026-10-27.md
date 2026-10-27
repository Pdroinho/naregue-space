# Auditoria sistemica do painel - 2026-10-27

Correcao compartilhada de componentes e estados operacionais, preservando a identidade NaRégua: petroleo, creme, cobre, Manrope, Hugeicons e geometria existente. Nao houve nova direcao visual nem alteracao de primitivas documentadas. Publicacao em producao ainda pendente.

## Alteracoes verificadas no diff

- O filtro compartilhado de equipe usa a classe real do gatilho: largura desktop limitada a 260px e largura disponivel no mobile. Carregamento desabilita o controle; falha de carregamento mostra erro e nova tentativa. Nomes longos permanecem limitados ao controle e ao menu.
- `ProductSelect` restaura o ponto de partida do foco ao gatilho antes de fechar pelo Tab, para continuar a ordem do formulario em vez da posicao do portal no fim da pagina.
- `EmptyState` converte referencias locais a Hugeicons em mascaras com `currentColor`, preservando imagens de outros tipos. O estado vazio de servicos passa pelo componente compartilhado.
- Aliases `--ld-color-*` recebem seletores com especificidade de tema escuro correspondente, para que componentes das duas geracoes acompanhem superficies, textos e estados canonicos. Texto de destaque e preenchimento de acao mantem papeis separados.
- Campos financeiros e de preco de servico recebem nomes acessiveis. O dashboard formata receita em BRL e informa falha real ao atualizar status, sem apresentar sucesso indevido.
- O botao de interromper o assistente usa ink/surface inversos. Cabecalhos e badges de tabela evitam quebra de palavras; tabelas rolaveis mantem largura minima de 720px. Cabecalhos de dialogo preservam o fechamento a direita sem quebra de linha.
- Em 320px, a marca redundante do topo e ocultada para preservar o titulo. O editor de equipe corrige "Novo profissional" e "Como se chama?". Ajustes de geometria revisitam fragmentacao de texto em tablet e controles de fechamento.

Fontes amostradas: `TeamScopeSelect.tsx`, `ProductSelect.tsx`, `SharedUi.tsx`, `AdminDashboard.tsx`, `AdminFinance.tsx`, `AdminServices.tsx`, `ProfessionalEditor.tsx`, estilos de equipe, suporte, assistente, controles e `naregua-integration.css`.

## Evidencias e reproducao

`npm run test:panel-ui` encadeia build, auditoria visual, estados, dialogos e interacoes. A matriz prevista inclui 96 combinacoes de tela/tema/largura, 36 estados vazio/erro, 12 dialogos e 24 verificacoes de interacao. A existencia do comando nao substitui os resultados de suas etapas.

- Matriz base: `.validation/panel-system-confirm.log` registra 96 combinacoes concluidas; relatorio preservado em `.validation/ui-audit/report-system-96.json`.
- Estados em Firefox: `.validation/panel-states-firefox.log` registra 36 estados sem falhas e 39/39 verificacoes, incluindo teclado e nomes longos.
- Dialogos em Firefox: `.validation/panel-dialogs-firefox.log` registra o conjunto de 12 dialogos e verificacao de navegador, 13/13 conforme a execucao coordenada.
- Geometria apos revisao: `.validation/panel-reviewed-geometry.log` registra 16 combinacoes concluidas sem os achados automatizados monitorados, incluindo fragmentacao, overflow e dimensao do filtro.

A confirmacao final registra estados 39/39, com 36 estados, requisicao do filtro por teclado e nomes longos (`.validation/panel-states-reviewed.log`); dialogos 13/13 (`.validation/panel-dialogs-reviewed.log`); interacoes Firefox 24/24 (`.validation/panel-interactions-final.log`); autenticacao 9/9 (`.validation/panel-auth-final.log`). A coordenacao confirmou tipos, lint, release e build aprovados. O revisor `panel_system_finish` concluiu "ship" para a correcao compartilhada e o pacote fornecido, sem correcao material restante nesse escopo. Isso nao certifica todas as plataformas nem declara ausencia universal de defeitos. A captura de erro do filtro aguarda o estado de erro efetivo, nao o carregamento inicial. Producao permanece pendente do commit funcional.

## Sincronizacao do sistema de design

PRODUCT.md e DESIGN.md continuam descrevendo a identidade aplicada. A unica alteracao em DESIGN.md corrige a frase antiga de precedencia dos aliases: os seletores da integracao agora igualam intencionalmente a especificidade escura para apontar ambas as geracoes aos neutros e estados canonicos. Nenhum valor de cor, fonte, espaco ou raio foi alterado na documentacao. `.impeccable/design.json` nao duplicava essa frase e foi preservado.

## Limites

Os testes usam fixtures e os contextos exercitados. Superficies fotograficas, opacidade composta, estados de integracoes externas, dados reais e combinacoes nao exercitadas exigem verificacao propria. Resultado automatizado sem achados nao equivale a certificacao WCAG global. Ornamentos herdados e textos tenues nao sao promovidos a padroes conformes por este registro. Nao houve deploy por esta passagem.

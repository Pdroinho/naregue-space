# Auditoria de interface - 2026-10-25

Registro local das correcoes de acessibilidade e uso da interface. A identidade NaRégua foi preservada: creme, petroleo e cobre, Manrope, monograma e fotografia existentes. Lote funcional publicado em producao no commit 3adfe6d.

## Escopo implementado

- `src/naregua-identity.css`: texto secundario claro (`--ink-soft`) passa de `#687980` para `#50636b`; texto tenue claro (`--ink-faint`) de `#89969a` para `#566870`; texto tenue escuro de `#71878d` para `#a3b5b9`. Sao correcoes de legibilidade dentro da familia neutra existente.
- Navegacao ativa, calendario, interfaces moveis, financeiro e WhatsApp usam `--brand-accent-strong` para texto de destaque antes ligado ao preenchimento `--brand-action`. As superficies de acao e estados semanticos conservam seus papeis.
- `src/styles.css`: cartao estatistico utiliza `--surface-raised` em vez de branco fixo; o atalho de pular navegacao combina `--ink-strong` e `--surface-canvas` para acompanhar o tema.
- Configuracoes e seletor de cor recebem nomes acessiveis para logo e valor hexadecimal; o campo hexadecimal informa invalidade. A moldura visual de "Outra cor" torna-se um elemento decorativo, preservando o seletor de cor real e removendo um botao duplicado sem acao.
- A explicacao de acesso da equipe corrige "Cado" para "Cada".

## Verificacao e evidencias

A matriz completa de 48 combinacoes terminou e identificou tres amostras com contraste residual: titulo H4 do dashboard claro em 1440px (4,46:1) e URL do dashboard escuro em 1440px e 390px (2,32:1). Portanto, essa primeira execucao nao passou sem achados; o log encerrou com erro de validacao. O relatorio original esta preservado em `.validation/ui-audit/report-48.json` e o log em `.validation/audit-confirm-final.log`.

Os achados foram corrigidos: o H4 usa `--ink-soft` e a URL usa `--brand-accent-strong`. O seletor de cor nativo tambem recebeu contorno visivel de foco, com tokens existentes. A confirmacao posterior de oito combinacoes (dashboard e configuracoes, claro/escuro, 1440px/390px) registrou zero achados de contraste, controles sem nome, overflow e imagens quebradas. Evidencias: `.validation/audit-review-verdict.log` e `.validation/ui-audit/report-48.json` (matriz anterior). Essa confirmacao dirigida cobre os contextos alterados; nao e uma segunda matriz completa de 48.

Interacoes Chromium 24/24 e Firefox 24/24; configuracoes 14/14 em cada navegador, incluindo foco e alteracao real do valor de cor; autenticacao 9/9 sem requisicoes externas. Configuracoes: `.validation/audit-settings-final.log` e `.validation/audit-settings-firefox.log`; autenticacao: `.validation/audit-auth.log`. A coordenacao confirmou verificacoes de tipos, lint, release e build aprovadas. O revisor independente emitiu fix para tres pontos: foco do seletor, link de agendamento escuro e H4 claro. A etapa final do agente ficou indisponivel por limite de uso; a coordenacao aplicou o Verdict Pass degradado, conferindo as capturas atualizadas. Os tres pontos foram classificados resolved, sem regressao identificada nesse lote; disposition: ship apenas para os tres ajustes. Publicacao concluida na imagem naregua:3.0-ui-3adfe6d, com backup criptografado previo.

Cada linha da matriz registra contraste, controles sem nome, overflow horizontal e imagens quebradas no contexto exercitado. Ausencia de achados nessas amostras nao demonstra conformidade integral de todos os fluxos ou estados possiveis.

## Compatibilidade com o sistema de design

Foram comparados PRODUCT.md, DESIGN.md, `.impeccable/design.json`, a referencia document.md do Impeccable e o diff local dos componentes e estilos. A direcao visual, as superficies principais, a tipografia, a geometria e a regra de neutros do produto continuam validas.

Os valores de `--ink-soft` e `--ink-faint` alterados nao estao duplicados como primitivas em DESIGN.md ou no sidecar. Os exemplos que referenciam essas variaveis acompanham o CSS; nao exigem sincronizacao de valores. DESIGN.md foi preservado. O sidecar recebeu somente a sincronizacao autorizada do exemplo de navegacao ativa, sem alterar primitivas ou direcao visual.

O exemplo "Active Navigation" do sidecar foi sincronizado de `color:var(--brand-action)` para `color:var(--brand-accent-strong)`, acompanhando a navegacao atual. E uma correcao pontual da representacao do ajuste de contraste, sem criar nova regra de marca.

## Limites conhecidos

A passagem nao certifica WCAG global, integracoes externas, dados reais, pagamento, envio de mensagens ou todos os estados de tenant. Os resultados sao locais e condicionados a amostra, dados de verificacao e navegadores exercitados. Elementos decorativos herdados e qualquer texto tenue fora das combinacoes verificadas nao foram promovidos a regra de marca nem declarados conformes por este documento. O parecer cobre apenas os achados listados; nao e aprovacao geral de todas as telas.

## Conferencia em producao

Imagem naregua:3.0-ui-3adfe6d, container healthy, zero reinicios e nenhum HTTP 5xx nos logs do container novo durante a verificacao. /api/ready publico retornou database ready. Login do tenant abriu no navegador, sem erro de console, com os novos tokens claros e escuros confirmados por estilo computado e captura visual. Painel autenticado foi verificado localmente com API controlada; nenhum registro real, envio WhatsApp ou cobranca foi criado. Avisos do navegador sobre preload de fonte e campo de senha fora de form permanecem, sem erro de execucao observado.

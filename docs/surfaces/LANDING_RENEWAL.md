# Landing pública — reformulação

Modo: Persuade. Rota: `/`. Referência escolhida pelo usuário: https://www.abacatepay.com/ (inspecionada em desktop, incluindo controles e rolagem). A composição antiga foi rejeitada. Preservar assets oficiais, produto, identidade, planos e fluxos existentes. Não alterar a identidade do painel.

## Direction contract

THESIS: a barbearia entende a ferramenta experimentando a organização da própria rotina; a primeira tela demonstra o produto em vez de oferecer uma coleção de promessas.

OWN-WORLD: creme claro, petróleo e cobre do NaRégua, Manrope, monograma aprovado, Hugeicons e fotografia realista já existente. Grandes superfícies sólidas e cantos generosos na LP; sem verde da referência nem gradientes decorativos.

STORY: escolher uma área da operação, ver a interface atual com dados ilustrativos, entender agendamento/relacionamento/gestão, encontrar a faixa correta para a equipe e consultar o plano. Acesso e documentos legais permanecem disponíveis.

FIRST VIEWPORT: navegação flutuante clara dentro de uma superfície creme; título central de grande escala com seletor de agenda/equipe/gestão; CTA para planos e grande demonstração da interface. O produto continua após a dobra.

FORM: composição reference-led explicitamente escolhida pelo usuário, implementada em código no mundo de marca estabelecido. Não é uma rodada aberta de conceitos nem uma troca de identidade. Interação assinatura: escolha da área com transição da captura; fluxo de reserva acompanhado na rolagem; preço por faixa com dígitos animados. Todos operam por teclado e respeitam movimento reduzido.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Verdades e limites

- Planos e preços vêm do catálogo existente. Checkout, token de indicação e retorno de assinatura são preservados.
- Nenhuma métrica de crescimento, economia, depoimento ou número de clientes é inventado.
- Capturas: interface realmente renderizada pelo projeto, com dados sintéticos identificados como demonstração; não são imagens geradas de UI.
- Fotografias e logos: assets oficiais preexistentes de `public/naregua` e `public/brand`.
- A primeira hipótese de conversão é conhecer os planos, seguindo o fluxo já existente. A preferência opcional foi perguntada durante a análise.

## Referência observada

A AbacatePay demonstra o mecanismo já na frase de abertura, integra controles à tipografia, apresenta produto em escala, alterna seções claras e escuras e usa números animados em uma simulação. Serão adaptados esses princípios de composição e interação; textos, provas, imagens, promessas e identidade daquela empresa não serão transplantados.

## Express?o implementada

A abertura central combina seletor tipogr?fico e captura ampla; seguem capacidades, fotografia editorial, reserva em tr?s passos, financeiro, Mestre AI, pre?o por faixa, d?vidas e chamada final com fotografia. Navega??o flutuante e se??es s?lidas generosamente arredondadas pertencem apenas ? LP p?blica em modo Persuade. Tokens `lp-*` em DESIGN.md e extens?es de movimento/sombra no sidecar registram esta exce??o sem alterar o painel.

A sele??o agenda/equipe/gest?o troca capturas da interface renderizada. A hist?ria acompanha a rolagem ou a escolha expl?cita dos passos; confirmar o exemplo muda apenas estado local. A faixa de 1?15 profissionais resolve os planos reais de at? 3, 6 ou 15 vagas, com pre?os do cat?logo e erro/repeti??o de atualiza??o. Os d?gitos animados n?o representam economia ou c?lculo por profissional. Checkout existente preserva indica??o e retorno; acesso usa `/acessar`.

A navega??o contrai ap?s 32px de rolagem, vira menu abaixo de 900px e fecha por Escape com retorno de foco. H? link de salto, foco vis?vel e controles por teclado. Movimento reduzido desativa revela??es, transi??es, assentamento por rolagem e rolagem suave, sem ocultar conte?do. Demonstra??es permanecem legendadas; imagens sint?ticas s?o capturas reais com dados de teste e EXIF de origem, conforme LANDING_ASSETS.md, sem imagens de IA.

Evid?ncia visual: `.validation/lp-renewal/full-1440.png`, `full-390.png`, `hero-1440.png` e `hero-390.png`. A revis?o encontrou sobreposi??o da legenda no celular, alega??o de desconto de 0% e eyebrow no checkout; os tr?s pontos foram corrigidos. O veredito final do revisor ? ship no escopo desses tr?s ajustes. Valida??o final: 10/10 verifica??es da LP em Chromium e Firefox e 39/39 do painel. Registro: `docs/LP_REFORMULACAO_2026-10-27.md`.

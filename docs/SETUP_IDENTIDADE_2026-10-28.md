# Setup e identidade - 28/10/2026

O setup atelier usa o wordmark oficial, superfícies creme/cobre e a ilustração da cadeira, sem gradiente, eyebrow ou badge. A alternativa manual tem o texto neutro `Configurar por conta própria`; o produto não possui campo de gênero.

Os logs de produção mostraram três falhas de entrada de imagem não suportada. O assistente agora encaminha entradas com imagem ao `visionModel` configurado, enquanto texto usa `setupModel`. Chamadas que falham devolvem a cota consumida.

`extractLogoPalettes` extrai cores no servidor a partir de pixels locais via Sharp. Ignora pixels transparentes e neutros, prioriza cores saturadas e exige contraste mínimo de 4,5:1 com texto branco. A origem `IMAGE` e o fallback são informados com fidelidade ao caminho efetivamente usado.

Em `theme.ts`, a ausência da atribuição de `--brand-primary-on-light` mantinha o hover em cobre. A atualização agora define essa variável com o mesmo valor primary-700 e a limpa ao remover o tema.

Validação: 5/5 testes de backend para paleta, roteamento de visão e tema; fluxo de setup 5/5 nos dois modos em 1440px e 390px. Build, verificação de tipos e lint passaram. Este registro documenta a implementação e os resultados da revisão; não amplia a validação para outras superfícies.

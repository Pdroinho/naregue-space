# Correções de interação e tema — 25/10/2026

As cinco capturas enviadas pelo usuário mostraram defeitos que não estavam cobertos pela validação visual anterior. Esta entrega corrige essas causas e amplia a verificação de ações.

## Correções

- Ícones: os spans de máscara agora têm display e cor explícitos. Regras antigas para esconder textos de botões não escondem mais os ícones de anexar, enviar, nova conversa e outros controles. O histórico usa a mesma camada de ícones, incluindo no tema escuro.
- Menu: o botão do topo recolhe/expande a barra lateral no desktop e abre a navegação no mobile. O estado e o rótulo acessível acompanham a ação.
- Notificações: o clique no botão não conflita mais com o fechamento por clique externo, que fazia o popover reabrir.
- Mestre AI: o controlador do drawer fica fora do carregamento suspenso das telas; a abertura não perde eventos durante a troca/carregamento das áreas. O layout do chat tem classe própria, evitando colisão com a grade legada. O campo de mensagem e as ações permanecem na área visível, inclusive ao abrir compras de créditos.
- Mensagens: Enter durante uma resposta não apaga o rascunho seguinte. A repetição de uma mensagem com falha preserva sua imagem. Falha ao consultar a disponibilidade aparece com erro e tentativa novamente, em vez de deixar todos os controles silenciosamente desativados.
- Tema: os componentes antigos e novos usam os mesmos tokens de superfície, texto e estado. Título, campos, valores preenchidos, links e rodapé do login têm tratamento coerente no tema escuro, com ajuste de autofill. O nome visível da assistente foi corrigido para Mestre AI.
- Indicações: a fotografia deixa de ser lavada por uma sobreposição quase opaca. Enquanto o checkout da plataforma estiver desativado, a tela informa a dependência e preserva o histórico, sem apresentar convite utilizável ou percentuais antigos como benefício atual. Criar/copiar link continua funcionando quando o programa está habilitado.
- Controles de navegação durante carregamento ficam desativados; o item de agendamentos do cliente retorna à sua seção. Corrigida a expressão “Cada profissional” no editor de equipe.

## Validação

O gate completo passou com Node 22: 265 testes principais, 22 de migração, 16 de segurança e 35 de WhatsApp — 338 ao todo — além de tipos, lint, contratos de release e build.

A interface passou por 24 verificações de interação no Chromium e as mesmas 24 no Firefox: menu altera a largura real; notificações abrem/fecham; drawer e histórico respondem; anexos são selecionados/removidos; envio, interrupção e repetição são visíveis; imagem e rascunho são preservados; cadastro de serviço atualiza a lista; etapas da equipe preservam os campos; financeiro envia valores; agenda muda de período; suporte abre o compositor. São APIs controladas e SQLite nos testes de backend, sem cadastros, movimentações financeiras ou envios de WhatsApp de teste em produção.

Os 70 checks gerais, 12 de agendamento, quatro da landing e três da recuperação DEV também passaram. Total desta rodada: 137 verificações automatizadas de interface, contando os dois navegadores. Nas amostras do login, o contraste medido ficou acima de 4,5:1.

Uma revisão independente comparou as cinco capturas originais com a correção e aprovou o resultado nesse escopo. A documentação do sistema visual foi conferida e preservada, pois as alterações restauram o contrato de identidade existente. Isso não equivale a uma garantia de ausência de qualquer defeito em toda a aplicação.

## Limite operacional

AbacatePay live permanece sem credenciais no ambiente publicado. Nenhuma configuração financeira foi inventada ou habilitada para esconder a indisponibilidade. A ativação de pagamentos e de benefícios de indicação continua dependendo das chaves e da homologação do provedor.

## Publicação

Código funcional `54788c9`, imagem `naregua:3.0-ui-54788c9`, diretório `/opt/lashdesigner/releases/3.0-ui-54788c9`. O apontamento operacional `/opt/lashdesigner/app` foi atualizado somente depois de a nova imagem responder à readiness pública. A imagem anterior foi preservada como `naregua:before-ui-54788c9`, com backup criptografado antes da troca. Banco e segredos existentes foram mantidos.

Depois da publicação, health/readiness e estado saudável do container foram confirmados. O navegador abriu o login real do espaço, aplicou o tema escuro apenas naquela página e confirmou texto claro, campo escuro, ícone visível, ausência de overflow e zero erros de console. Uma consulta mínima separada ao provedor de IA, contendo apenas um pedido para responder “OK”, retornou HTTP 200 com resposta; não incluiu dados da barbearia. As ações autenticadas descritas acima foram verificadas no ambiente controlado, não por uma sessão de usuário de produção.

### Contraste do botão Mestre AI

Após nova captura do usuário, o botão do cabeçalho ganhou estilo próprio: fundo creme, texto petróleo, borda cobre e marca de 24px. As classes genéricas de botão transparente foram removidas desse controle, pois suas regras com `!important` anulavam o fundo necessário para a marca. O contraste de texto medido foi 17,97:1 nos dois temas, com o fundo claro confirmado e as 24 verificações de interação novamente aprovadas. Hover e foco usam a mesma paleta; a revisão visual restrita ao controle foi aprovada. Imagem atual publicada: `naregua:3.0-ui-c360689`, diretório `/opt/lashdesigner/releases/3.0-ui-c360689`.

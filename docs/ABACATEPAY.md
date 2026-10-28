# AbacatePay no NaRégua

## Retorno do checkout — correção de 28/10/2026

O retorno dos novos checkouts de equipe passa por `/api/public/onboarding/checkout-return?intent=UUID`. O servidor localiza a intenção, consulta o pagamento pelo adaptador e redireciona somente ao login do tenant persistido, com `welcome=1`. Nenhum parâmetro do navegador concede acesso; confirmação exige valor, identidade e ambiente corretos na API. Falha/pendência continua sendo conciliada pelo worker. Após login autenticado, o onboarding pendente segue o fluxo normal. O painel dev atualiza os tenants ao receber foco e a cada 30 segundos para não manter status anterior à conciliação.

O teste reportado pelo usuário já estava confirmado pelo provedor, com intenção PAID e assinatura ACTIVE; não foi necessário criar assinatura manualmente. O problema de navegação era a completionUrl genérica sem vínculo com o espaço. Regressões cobrem URL vinculada, redirecionamento para o tenant correto, UUID inválido e ausência de assinatura duplicada.

## Validação de credencial — 28/10/2026

A credencial fornecida é de desenvolvimento. Foi armazenada somente em arquivo privado na VPS, com permissão 0600, separado do ambiente de produção e fora do repositório. Autenticação v2 validada nas consultas de loja e checkouts (HTTP 200). O adaptador publicado criou e consultou um checkout sandbox de R$74,90 usando banco SQLite em memória; a consulta retornou pendente, sem conceder acesso ou alterar o banco de produção. Cinco testes automatizados de adaptador, conciliação, assinatura de webhook e idempotência passaram. Não houve pagamento real nem validação de entrega de webhook pelo provedor. Para habilitar vendas, faltam credencial live e cadastro/homologação do webhook de produção. Por autorização do usuário, o checkout sandbox será ativado no site publicado enquanto o KYC estiver pendente; isso não habilita cobranças reais. O diagnóstico inicial de webhook via Python foi corrigido: o HTTP 403 não comprovava falta de permissão. O webhook sandbox foi cadastrado com sucesso usando o cliente HTTP da aplicação; o worker continua consultando os checkouts a cada 60 segundos como contingência. A entrega de webhook pelo provedor permanece não homologada.

A implementação usa a [API v2 oficial](https://docs.abacatepay.com/llms.txt), com produtos e checkout hospedado. Há cobrança de planos por equipe e pacotes de mensagens do Mestre AI. Os valores são sempre em centavos.

## Configuração

Configure no ambiente, sem colocar chaves no frontend:

```dotenv
ABACATEPAY_CHECKOUT_ENABLED=true
ABACATEPAY_DEV_MODE=true
ABACATEPAY_API_KEY=chave-da-conta-de-teste
ABACATEPAY_WEBHOOK_SECRET=segredo-aleatorio-de-pelo-menos-32-caracteres
```

Para cobranças reais em produção, use `ABACATEPAY_DEV_MODE=false` e uma chave do ambiente live. A exceção sandbox no site publicado exige `ABACATEPAY_DEV_MODE=true` e a flag explícita `ABACATEPAY_ALLOW_SANDBOX_IN_PRODUCTION=true`, cujo padrão é `false`. Credenciais permanecem exclusivamente no ambiente privado. Referências externas de teste usam o prefixo `naregua-sandbox`. O catálogo expõe somente o indicador `checkoutSandbox`, usado para exibir o aviso de modo de teste nas duas etapas do checkout: nenhum valor real será cobrado. O código recusa respostas e eventos de outro ambiente. Permissões necessárias: criação de produtos/checkouts e consulta de checkouts. O webhook pode ser cadastrado pelo dashboard do provedor; não é cadastrado automaticamente durante o startup.

Cadastre a URL `https://naregua.space/api/webhooks/abacatepay` com o segredo acima e os eventos `checkout.completed`, `checkout.refunded`, `checkout.disputed` e `checkout.lost`. O provedor acrescenta `webhookSecret` na consulta. O aplicativo também valida `X-Webhook-Signature` contra os bytes originais. A chave pública de HMAC não substitui o segredo privado da instalação.

As referências são [criação de checkout](https://docs.abacatepay.com/pages/payment/create), [consulta](https://docs.abacatepay.com/pages/payment/one) e [segurança/entrega de webhooks](https://docs.abacatepay.com/pages/webhooks).

## Comportamento

1. A regra comercial grava uma intenção com cotação e desconto reservados.
2. O adaptador grava a referência, reutiliza o produto do catálogo por plano e preço exato e solicita o checkout, retornando somente a URL HTTPS do domínio oficial.
3. O webhook autenticado é persistido antes da resposta. O worker consulta a API e exige identidade, valor e ambiente correspondentes.
4. A concessão acontece em transação condicionada ao estado pendente. Uma entrega repetida não gera outro período ou outro crédito.
5. Reembolso e disputa autenticados ficam registrados e seguem a conciliação/restrição de acesso. Uma compra mais recente não é suspensa por um estorno antigo.

O ID `bill_...` é armazenado como string em `abacatepay_checkouts.provider_id`. Os números usados entre os serviços são IDs locais, não uma conversão do identificador da AbacatePay.

## Homologação obrigatória

Testar conta dev e depois uma compra live controlada: checkout de cada faixa, indicação, crédito extra, webhook duplicado, segredo/assinatura inválidos, valor divergente, retorno do navegador antes do webhook, timeout, reembolso e disputa. Verificar que o pedido certo concede exatamente uma vez e que o outro tenant permanece isolado.

Se houver timeout após envio ao provedor, não repetir a cobrança cegamente. A intenção pode ficar em `CREATING`; conferir a referência no painel e na tabela de checkouts, documentar a resolução e conciliar. Não transformar um timeout em pagamento recusado nem liberar assinatura por captura de tela.

Até a migração 116, os planos eram de renovação manual. Os novos checkouts a partir da migração 117 usam assinatura mensal automática no cartão. Assinaturas antigas preservam o período já pago; não se abre outra cobrança de migração enquanto estiverem ativas sem uma política comercial definida. Pedidos InfinitePay antigos continuam conciliáveis; nenhuma nova contratação usa Appmax ou InfinitePay.

## Checkout: dados e catálogo compartilhado (28/10/2026)

A migração 116 adiciona o nome de cobrança do responsável em `users.billing_name`, um registro persistente de produtos e um cache de identificadores de clientes. O checkout público preserva o nome preenchido e envia nome, e-mail e telefone via `POST /customers/create`, vinculando o `customerId` ao checkout. CPF/CNPJ e endereço não são solicitados no cadastro NaRégua: o provedor ainda pode pedi-los. Dados pessoais não são enviados em query strings nem em metadados.

A chave precisa de `CUSTOMER:CREATE`. A chave sandbox instalada foi validada com sucesso via `fetch` nativo do Node, dentro do container da aplicação: HTTP 200, cliente criado no ambiente de teste. O primeiro diagnóstico em Python retornou HTTP 403 com corpo não JSON e erro 1010; isso era um bloqueio do cliente HTTP de diagnóstico, não ausência de permissão. Não é necessário trocar a chave atual. O fallback para preenchimento no provedor só se aplica quando a API responde explicitamente `Insufficient permissions`; um HTTP 403 genérico não é tratado como prova de permissão ausente. Nunca registrar chaves neste documento.

Produtos recebem nomes comerciais do NaRégua, não o nome de cada comprador. A chave de reutilização considera plano/pacote, valor em centavos, moeda e ambiente/credencial. Preços com desconto geram variantes reutilizáveis; o preço de um produto compartilhado nunca é alterado para atender outro pedido. O mesmo vale para pacotes de mensagens. Reservas persistentes impedem criação concorrente duplicada; um timeout de produto deixa a reserva para revisão pela referência externa, sem repetir a criação cegamente. Nenhum produto antigo foi excluído ou modificado e os pagamentos anteriores continuam conciliáveis.

Reutilizar produtos é diferente de ativar recorrência. O comportamento atual continua sendo um mês com renovação manual. Uma assinatura automática exige produto com ciclo, checkout de assinatura, conciliação dos eventos `subscription.*`, cancelamento e tratamento de falhas de renovação; não basta mudar o nome do produto. Esse comportamento foi substituído pela migração 117 descrita abaixo: o usuário solicitou assinatura mensal automática para novas contratações.

## Webhook sandbox cadastrado (28/10/2026)

- Nome: `NaRegua sandbox - pagamentos`.
- Versão: v2.
- Endpoint: `https://naregua.space/api/webhooks/abacatepay`.
- Eventos: `checkout.completed`, `checkout.refunded`, `checkout.disputed`, `checkout.lost`.
- Segredo: o mesmo `ABACATEPAY_WEBHOOK_SECRET` privado do servidor, enviado diretamente à API, sem exposição no Git.

A consulta inicial não encontrou webhook nesse endpoint; a criação pela API retornou sucesso e confirmou endpoint/eventos. O endpoint HTTPS foi verificado com uma notificação sintética de saúde, sem efeito em pagamentos: assinatura inválida retornou 401 e assinatura válida retornou 200 com `ignored:true`. Isso verifica alcance e autenticação da aplicação, mas ainda não comprova entrega de evento real pela AbacatePay. Essa confirmação requer concluir um pagamento sandbox e verificar a entrega e a conciliação. Não cadastrar outro webhook idêntico pelo painel.

## Assinatura mensal e cadastro revisado (migração 117)

Os novos planos usam produto `cycle: MONTHLY`, `POST /subscriptions/create` e método `CARD`. Pacotes de mensagens continuam avulsos. Assinaturas e checkouts avulsos antigos preservam sua conciliação e o período pago; não se cria autorização recorrente retroativa.

Na verificação real do sandbox, `customerId` sem CPF/CNPJ não bastou: a página hospedada devolveu todos os dados pessoais vazios. Com documento válido, os mesmos dados foram aproveitados e a página avançou direto ao endereço. O cadastro passa a pedir CPF/CNPJ, validado no cliente e servidor; o valor persistido fica criptografado com AES-GCM e contexto do tenant em `users.billing_tax_id_enc`. Não fica em logs, URLs ou metadados. A confirmação do cadastro informa e registra o aceite de renovação mensal.

O produto mensal normal é compartilhado por faixa/preço. Se a primeira mensalidade tiver desconto, usa uma variante mensal pelo valor exato e agenda a troca para o produto normal após a ativação; essa troca só deve valer para o ciclo seguinte, como no contrato da API. Uma falha nessa chamada continua pendente para nova conciliação, sem repetir cobrança. Não alterar produtos de outros pedidos.

A concessão inicial exige checkout pago no valor exato e assinatura do mesmo checkout/cliente/ambiente. O worker busca assinaturas por `checkoutId`, preserva os IDs `subs_...` como strings e processa uma caixa de eventos durável para `subscription.completed`, `subscription.renewed`, `subscription.cancelled`, `subscription.payment_failed` e `subscription.plan_changed`. Renovação verificada usa a âncora mensal da assinatura e a data do ciclo no evento; reenviar com outro ID não amplia o mesmo ciclo novamente. Evento de renovação sem data de ciclo confiável fica `NEEDS_REVIEW`, em vez de conceder acesso sem evidência. A API de assinaturas ativa, sozinha, não comprova pagamento de um novo ciclo. Homologar o payload da primeira renovação real antes de habilitar live.

Cancelamento pelo painel chama a API, confirma o estado e impede cobranças futuras, preservando o acesso já pago. A existência de uma renovação ativa impede contratar outra assinatura mesmo quando o acesso local expirou. Falhas de API não revogam um período já pago. Estorno/disputa suspende apenas o pedido correspondente e cancela sua recorrência.

O endereço do espaço fica sempre visível no cadastro. `GET /api/public/onboarding/slug-availability` tem limite próprio, resposta sem cache e sugestões disponíveis. O cliente consulta com debounce, cancela respostas antigas e impede avançar até a confirmação. O servidor verifica novamente na criação; essa consulta não reserva o endereço.

Validação local: `npm run check` aprovado, 275 testes principais, 22 de migração, 16 de segurança e 35 de WhatsApp; desktop 9/9, mobile Chromium 8/8 e Firefox 8/8. O ensaio separado na AbacatePay criou uma assinatura sandbox `ACTIVE` com produto mensal compartilhado. A renovação futura é coberta por testes de conciliação e replay, sem alegar que um mês real já transcorreu.

## Ensaio completo no site publicado (28/10/2026)

O ensaio no navegador usou exclusivamente dados fictícios e pagamento simulado. O cadastro mostrou endereço ocupado, exibiu sugestões livres e permitiu escolher outro. A AbacatePay aproveitou os dados pessoais completos e avançou direto ao endereço. O checkout exibiu mensalidade recorrente e, após a simulação, criou assinatura `ACTIVE`, voltou ao login do espaço correto e concedeu um período no NaRégua.

A entrega real do webhook sandbox `subscription.completed` ficou persistida como `APPLIED`. O cancelamento da assinatura de teste também gerou `subscription.cancelled` aplicado, sem alterar o fim do período pago. A listagem de assinaturas do provedor mostrou estado antigo após o cancelamento; por isso, o adaptador usa a consulta individual e a resposta confirmada da operação de cancelamento. O webhook cadastrado foi substituído por uma única configuração com os quatro eventos de checkout e os cinco eventos de assinatura tratados.

A renovação da assinatura de teste foi cancelada. O espaço QA foi removido com escopo estrito e registro de auditoria; nenhuma conta de usuário real foi removida. Os produtos compartilhados e os registros de conciliação foram preservados. Nenhum pagamento real foi realizado. Código publicado: `9ba2dbb`; documentação e regressões posteriores não alteram a aplicação.

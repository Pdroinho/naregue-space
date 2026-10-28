# AbacatePay no NaRégua

## Retorno do checkout — correção de 28/10/2026

O retorno dos novos checkouts de equipe passa por `/api/public/onboarding/checkout-return?intent=UUID`. O servidor localiza a intenção, consulta o pagamento pelo adaptador e redireciona somente ao login do tenant persistido, com `welcome=1`. Nenhum parâmetro do navegador concede acesso; confirmação exige valor, identidade e ambiente corretos na API. Falha/pendência continua sendo conciliada pelo worker. Após login autenticado, o onboarding pendente segue o fluxo normal. O painel dev atualiza os tenants ao receber foco e a cada 30 segundos para não manter status anterior à conciliação.

O teste reportado pelo usuário já estava confirmado pelo provedor, com intenção PAID e assinatura ACTIVE; não foi necessário criar assinatura manualmente. O problema de navegação era a completionUrl genérica sem vínculo com o espaço. Regressões cobrem URL vinculada, redirecionamento para o tenant correto, UUID inválido e ausência de assinatura duplicada.

## Validação de credencial — 28/10/2026

A credencial fornecida é de desenvolvimento. Foi armazenada somente em arquivo privado na VPS, com permissão 0600, separado do ambiente de produção e fora do repositório. Autenticação v2 validada nas consultas de loja e checkouts (HTTP 200). O adaptador publicado criou e consultou um checkout sandbox de R$74,90 usando banco SQLite em memória; a consulta retornou pendente, sem conceder acesso ou alterar o banco de produção. Cinco testes automatizados de adaptador, conciliação, assinatura de webhook e idempotência passaram. Não houve pagamento real nem validação de entrega de webhook pelo provedor. Para habilitar vendas, faltam credencial live e cadastro/homologação do webhook de produção. Por autorização do usuário, o checkout sandbox será ativado no site publicado enquanto o KYC estiver pendente; isso não habilita cobranças reais. A criação de webhook retornou HTTP 403 por falta de permissão; o worker consulta os checkouts a cada 60 segundos. A entrega de webhook pelo provedor permanece não homologada.

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

Os planos continuam de renovação manual por mês, como na referência. Assinaturas antigas preservam o período já pago; não se abre outra cobrança de migração enquanto estiverem ativas sem uma política comercial definida. Pedidos InfinitePay antigos continuam conciliáveis; nenhuma nova contratação usa Appmax ou InfinitePay.

## Checkout: dados e catálogo compartilhado (28/10/2026)

A migração 116 adiciona o nome de cobrança do responsável em `users.billing_name`, um registro persistente de produtos e um cache de identificadores de clientes. O checkout público preserva o nome preenchido e envia nome, e-mail e telefone via `POST /customers/create`, vinculando o `customerId` ao checkout. CPF/CNPJ e endereço não são solicitados no cadastro NaRégua: o provedor ainda pode pedi-los. Dados pessoais não são enviados em query strings nem em metadados.

A chave precisa de `CUSTOMER:CREATE`. A chave sandbox instalada respondeu HTTP 403 na verificação dessa rota; nenhum cliente de teste foi criado. Enquanto faltar essa permissão, o checkout continua disponível com a etapa de dados no provedor e um aviso sem dados pessoais no log. O pré-preenchimento está implementado e testado com API simulada, mas depende da troca da chave para funcionar na conta atual. Nunca registrar chaves neste documento.

Produtos recebem nomes comerciais do NaRégua, não o nome de cada comprador. A chave de reutilização considera plano/pacote, valor em centavos, moeda e ambiente/credencial. Preços com desconto geram variantes reutilizáveis; o preço de um produto compartilhado nunca é alterado para atender outro pedido. O mesmo vale para pacotes de mensagens. Reservas persistentes impedem criação concorrente duplicada; um timeout de produto deixa a reserva para revisão pela referência externa, sem repetir a criação cegamente. Nenhum produto antigo foi excluído ou modificado e os pagamentos anteriores continuam conciliáveis.

Reutilizar produtos é diferente de ativar recorrência. O comportamento atual continua sendo um mês com renovação manual. Uma assinatura automática exige produto com ciclo, checkout de assinatura, conciliação dos eventos `subscription.*`, cancelamento e tratamento de falhas de renovação; não basta mudar o nome do produto. A escolha comercial de migrar os novos planos permanece pendente de confirmação.

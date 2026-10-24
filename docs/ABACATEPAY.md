# AbacatePay no NaRégua

A implementação usa a [API v2 oficial](https://docs.abacatepay.com/llms.txt), com produtos e checkout hospedado. Há cobrança de planos por equipe e pacotes de mensagens do Mestre AI. Os valores são sempre em centavos.

## Configuração

Configure no ambiente, sem colocar chaves no frontend:

```dotenv
ABACATEPAY_CHECKOUT_ENABLED=true
ABACATEPAY_DEV_MODE=true
ABACATEPAY_API_KEY=chave-da-conta-de-teste
ABACATEPAY_WEBHOOK_SECRET=segredo-aleatorio-de-pelo-menos-32-caracteres
```

Em produção `ABACATEPAY_DEV_MODE=false` e a chave deve pertencer ao ambiente live. O código recusa respostas e eventos de outro ambiente. Permissões necessárias: criação de produtos/checkouts e consulta de checkouts. O webhook pode ser cadastrado pelo dashboard do provedor; não é cadastrado automaticamente durante o startup.

Cadastre a URL `https://naregua.space/api/webhooks/abacatepay` com o segredo acima e os eventos `checkout.completed`, `checkout.refunded`, `checkout.disputed` e `checkout.lost`. O provedor acrescenta `webhookSecret` na consulta. O aplicativo também valida `X-Webhook-Signature` contra os bytes originais. A chave pública de HMAC não substitui o segredo privado da instalação.

As referências são [criação de checkout](https://docs.abacatepay.com/pages/payment/create), [consulta](https://docs.abacatepay.com/pages/payment/one) e [segurança/entrega de webhooks](https://docs.abacatepay.com/pages/webhooks).

## Comportamento

1. A regra comercial grava uma intenção com cotação e desconto reservados.
2. O adaptador grava a referência, cria o produto com preço exato e solicita o checkout, retornando somente a URL HTTPS do domínio oficial.
3. O webhook autenticado é persistido antes da resposta. O worker consulta a API e exige identidade, valor e ambiente correspondentes.
4. A concessão acontece em transação condicionada ao estado pendente. Uma entrega repetida não gera outro período ou outro crédito.
5. Reembolso e disputa autenticados ficam registrados e seguem a conciliação/restrição de acesso. Uma compra mais recente não é suspensa por um estorno antigo.

O ID `bill_...` é armazenado como string em `abacatepay_checkouts.provider_id`. Os números usados entre os serviços são IDs locais, não uma conversão do identificador da AbacatePay.

## Homologação obrigatória

Testar conta dev e depois uma compra live controlada: checkout de cada faixa, indicação, crédito extra, webhook duplicado, segredo/assinatura inválidos, valor divergente, retorno do navegador antes do webhook, timeout, reembolso e disputa. Verificar que o pedido certo concede exatamente uma vez e que o outro tenant permanece isolado.

Se houver timeout após envio ao provedor, não repetir a cobrança cegamente. A intenção pode ficar em `CREATING`; conferir a referência no painel e na tabela de checkouts, documentar a resolução e conciliar. Não transformar um timeout em pagamento recusado nem liberar assinatura por captura de tela.

Os planos continuam de renovação manual por mês, como na referência. Assinaturas antigas preservam o período já pago; não se abre outra cobrança de migração enquanto estiverem ativas sem uma política comercial definida. Pedidos InfinitePay antigos continuam conciliáveis; nenhuma nova contratação usa Appmax ou InfinitePay.

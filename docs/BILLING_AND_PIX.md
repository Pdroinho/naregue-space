# Billing, cartão e Pix

## Modelo adotado

O usuário escolhe o ciclo dentro do NaRégua e segue para o checkout seguro hospedado pela InfinitePay. O retorno e o webhook ativam o período comprado automaticamente. O fluxo não usa WhatsApp e a plataforma não recebe nem armazena o número completo do cartão.

O catálogo comercial tem **uma única fonte de verdade** em `server/pricing.ts`. A API `/api/public/billing/plans` entrega os ciclos e a promoção vigente para landing e checkout; o navegador não possui fallback de preços compilado.

Ciclos disponíveis: mensal, trimestral, semestral e anual. A interface mostra o equivalente mensal e a economia em relação ao mensal usando os valores recebidos do servidor.

## Pix recorrente

O release usa **períodos pré-pagos**: Pix ou cartão quita o ciclo escolhido e o webhook acrescenta 1, 3, 6 ou 12 meses. Não é anunciado como débito automático via Pix.

Pix Automático só deve ser habilitado quando a InfinitePay disponibilizar e documentar uma API pública adequada para autorização, cobrança futura, cancelamento, retentativa e conciliação. Até lá, renovação exige novo checkout e pode receber lembretes no produto.

## Idempotência e segurança

- pedido interno criado antes do checkout;
- `order_nsu` único;
- valor, pedido e pagamento confirmados servidor-a-servidor;
- atualização de pedido protegida contra dupla ativação;
- período restante é preservado na renovação;
- checkout precisa ser HTTPS;
- cartão permanece no ambiente do provedor.

## Estratégia comercial

No lançamento, usar um único produto funcional, **NaRégua Pro**, com quatro ciclos. A diferença inicial é prazo e desconto, não recursos arbitrariamente bloqueados. Qualquer mudança de preço deve ser feita no catálogo oficial do servidor e validada pelos testes de billing/plans antes do deploy.

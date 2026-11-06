# Indicações com recompensa em Pix

## Regras aprovadas em 06/11/2026

- Indicado: 15% de desconto na primeira mensalidade, sem acumular cupons.
- Indicador: comissão única de 50% do valor efetivamente pago nessa primeira mensalidade, após descontos, arredondada uma vez para centavos. Nada sobre renovações, cortesias ou créditos de IA.
- Prazo mínimo de 45 dias, segunda mensalidade confirmada pelo fluxo de assinatura, pagamento original revalidado, ausência de estorno e revisão humana de elegibilidade e disponibilidade financeira.
- Saque mínimo de R$100, solicitado pelo usuário, com senha atual. Chave Pix CPF/CNPJ igual ao documento de cobrança. A taxa vigente do processador é descontada do valor solicitado e registrada no comprovante.
- Cada solicitação passa por espera mínima de 48 horas e conferência de titularidade. Não há envio automático ao atingir o mínimo.
- Créditos anteriores continuam separados e não se tornam dinheiro. O aceite preserva versão, snapshot e hash. Um link padrão existente pode ser aproveitado; somente novos pedidos iniciados após a ativação geram dinheiro. Pedidos e benefícios já existentes não são reinterpretados.
- A expiração da assinatura não bloqueia a consulta e solicitação do saldo adquirido. Criar novo link exige conta fora da recuperação de pagamento.

A exclusão permanente pelo painel dev é bloqueada quando há uma recompensa originada de pagamento vinculada ao espaço, para preservar prova financeira e conciliação de estornos. Desative o espaço quando necessário.

O texto apresentado ao usuário está em `server/referralCashPolicy.ts`; os aceites são registrados em `referral_cash_links`. Nunca alterar as regras de uma versão já aceita sem criar outra versão e definir a transição.

## Estrutura e segurança

Migração 118 cria `referral_cash_links`, `referral_cash_rewards`, `referral_cash_claims`, `referral_cash_withdrawals` e `referral_cash_audit`. Valores são inteiros em centavos. Uma compra só gera uma recompensa e não gera simultaneamente crédito antigo.

Documentos de compradores são vinculados por HMAC estável. Identidades pagantes anteriores são consideradas na inicialização; a exclusão futura de um espaço não apaga a marca de elegibilidade. Documentos, e-mails e telefones iguais ajudam a detectar autoindicação, mas documentos de CPF/CNPJ distintos não provam independência de negócios: a revisão humana continua necessária. Não há promessa de detecção universal de fraude nem bloqueio automático por IP compartilhado.

A chave Pix é criptografada com contexto da solicitação. O painel dev só revela o destino após reautenticação, e a consulta é auditada. A senha não é persistida. O operador deve conferir a identidade real, titularidade bancária, vínculos entre os negócios, pagamentos e disponibilidade de caixa, registrando o fundamento. Documento com dígitos válidos e checkbox de revisão não substituem essa conferência.

Saques reservam o saldo numa transação imediata; apenas um saque aberto por espaço. O envio exige DEV no host correto, senha, justificativa e confirmação `ENVIAR PIX REAL`. O saldo da AbacatePay é consultado antes do envio. A mudança de documento após o pedido bloqueia o envio e exige nova solicitação após revisão.

O estado `SENDING` é persistido antes de chamar o provedor. Timeout, erro ou resposta divergente ficam em `UNCERTAIN`; não existe reenvio automático. Falha de processo após o envio também exige conciliação. O operador localiza o identificador `tran_...` no painel da AbacatePay e concilia por consulta individual. São conferidos referência, valor e ambiente. Resultado `FAILED` confirmado devolve o saldo reservado; `COMPLETE` registra taxa e comprovante. A referência externa não é tratada como garantia de idempotência do provedor.

Estorno revoga recompensa pendente/disponível. Se já houve saque, gera saldo compensável por futuras comissões, sem debitar a conta bancária do participante. Estorno enquanto o Pix já estiver em trânsito não garante recuperação do dinheiro; os 45 dias não eliminam chargebacks posteriores.

## Operação e limites

O piloto depende de revisão manual de todas as liberações e saques. Não há KYC bancário automatizado, análise automática de vínculos societários, orçamento automático de campanha, comissão recorrente ou conversão dos créditos anteriores. Antes de escalar, definir orçamento e capacidade de revisão e medir aquisição, retenção, chargebacks e margem. Com desconto de 15% e comissão de 50% sobre o restante, os incentivos consomem 57,5% do preço cheio da primeira mensalidade, antes das taxas e custos operacionais.

Se houver falha de renovação sem evento com data confiável, a recompensa não é liberada por suposição: a conciliação anterior de assinatura conserva o evento para revisão. Pendências de identidade também não são liberadas automaticamente.

## Homologação

- Testes locais usam o esquema real e cobrem comissão, repetição, autoindicação, documento, mínimo, saldo, revisão, concorrência, timeout, estorno, autenticação e isolamento.
- Navegador: desktop 1440px e mobile 390/320px, claro/escuro, adesão, estados vazio/pendente/disponível, formulário e histórico, sem chamadas externas.
- API sandbox real: a tentativa inicial retornou `Saldo insuficiente`. Foi criada e paga uma cobrança transparente de teste sem produto, sem efeito no NaRégua; nova tentativa retornou `Serviço temporariamente indisponível`. O Pix de saída sandbox ainda não foi confirmado de ponta a ponta.
- Produção: consultas de transação inexistente e requisição propositalmente incompleta, sem valor e sem destinatário, chegaram às validações da API sem `Insufficient permissions`. Nenhuma cobrança, comissão ou transferência real foi criada nesses diagnósticos. Isso não substitui a homologação de um repasse real autorizado.
- Eventos de transferência não são conciliados por webhook nesta primeira versão; a resposta síncrona e a conciliação manual por ID são a fonte para os saques. Eventos de pagamento/assinatura já existentes alimentam as condições de elegibilidade.

Fontes: https://docs.abacatepay.com/pages/pix/create, https://docs.abacatepay.com/pages/pix/get e https://docs.abacatepay.com/pages/pix/reference. Atenção à documentação contraditória de `/pix/list`: não depender dela para buscar uma transferência por referência externa. Taxas: https://www.abacatepay.com/pricing.

# NaRégua 3.0 — arquitetura

O NaRégua preserva sua identidade de barbearia e incorpora os fluxos operacionais da referência 5.14.2. A referência original está fora da árvore de implantação; não se distribui o ZIP dentro da imagem.

## Composição

- `src/app/AppRoutes.tsx`: rotas por host, carregamento separado das áreas e compatibilidade de URLs.
- `src/features/`: autenticação, dashboard, agenda, clientes, serviços, financeiro, equipe, acesso individual, suporte e ferramentas do Mestre AI.
- `src/components/`: formulários, marca, overlays, billing, WhatsApp e assistente compartilhados.
- `server/index.ts`: composição de serviços, routers e workers. Não concentra mais a implementação de todos os endpoints.
- `server/routes/`: contratos HTTP por domínio; registro ordenado em três compositores.
- `server/support/`: tickets, protocolo, notas internas, anexos, versões concorrentes, idempotência e notificações.
- `server/payment.ts`: adaptador exclusivo AbacatePay v2; IDs externos permanecem strings. Os IDs numéricos usados pelos serviços são chaves locais.
- `server/paymentBillingService.ts`, `paymentReferralService.ts`, `assistantPaymentCredits.ts`: regras de assinatura, indicação e créditos, separadas do transporte.
- `server/abacatepayWebhook.ts`: autenticação, HMAC sobre bytes originais, deduplicação e registro durável; o worker confere a cobrança pela API.
- `server/nareguaUpgrade.ts`: ponte entre as duas linhagens de banco e proteção de preço histórico.
- `server/professionalReadScope.ts`: projeções de leitura por profissional, locais à requisição, sem criar views globais ou interpolar valores do usuário.
- `src/naregua-identity.css`: identidade aprovada; `BRANDING.md` continua sendo a autoridade de marca.

## Banco e compatibilidade

As migrações 1–40 do NaRégua permanecem autoritativas. Não executar as migrações 39/40 do Lash sobre o banco publicado: possuem outro significado. A atualização usa 101–115 para criar a ponte e os recursos novos.

IDs de tenants, contas, profissionais, serviços e agendamentos são mantidos. O papel persistido `PROFESSIONAL` passa a `STAFF`; as contas continuam vinculadas ao mesmo profissional. Convites antigos válidos são copiados por hash, e as URLs antigas de equipe/profissional continuam aceitas. Convites revogados não são reativados. Convites antigos sem telefone pedem o WhatsApp durante o aceite.

O salt de `secretCryptoCore.ts` permanece compatível com a produção. Nunca rotacionar a chave de aplicação apagando ou recriando o banco para resolver um erro de descriptografia.

Novos agendamentos capturam o preço do serviço. Registros anteriores recebem o preço disponível na migração com `price_source=MIGRATED_CATALOG`: esse valor estabiliza o histórico, mas não recupera mudanças de preço anteriores sem evidência externa.

## Pagamentos e acesso

Os novos checkouts usam AbacatePay. O código de InfinitePay permanece para conciliar pedidos anteriores, sem oferecer uma nova contratação pelo endpoint legado. Não há implementação Appmax ativa.

Os três planos herdados da referência são mensais por capacidade: 1–3, 4–6 e 7–15 profissionais. A compra concede um mês, com renovação manual. Não há débito recorrente automático disfarçado de assinatura. Os períodos já pagos continuam válidos; a transição de uma assinatura ativa para o novo catálogo permanece bloqueada para evitar sobreposição sem política comercial aprovada.

Pagamento precisa corresponder ao ID externo, referência local, valor e ambiente. Eventos de estorno/disputa autenticados são persistidos; o acesso não é concedido pelo retorno do navegador. O serviço de negócio impede duplicidade de concessão e protege uma assinatura mais recente contra um estorno de pedido anterior. Ambiguidade após timeout fica para conciliação, sem tentar cobrar outra vez às cegas.

## Limites operacionais

Uma instância de aplicação escreve no SQLite local. Os workers compartilham esse processo e mantêm estado durável no banco. Escala horizontal exige redesenhar coordenação, armazenamento e limites. Notificações usam consultas periódicas, sem promessa de push instantâneo.

As chaves reais e a homologação de AbacatePay, Evolution e IA são responsabilidade da configuração do ambiente. Aprovação em simuladores não é evidência de uma transação real nesses serviços.

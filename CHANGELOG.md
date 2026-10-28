# Changelog

As versões seguem [Semantic Versioning](https://semver.org/). Releases usam tags anotadas `vMAJOR.MINOR.PATCH`; `package.json`, `package-lock.json` e a tag devem concordar.

## Não lançado

- Novas contratações por equipe usam assinatura mensal automática no cartão, com eventos de assinatura e cancelamento pelo painel. Períodos anteriores são preservados.
- CPF/CNPJ permite aproveitar os dados pessoais no checkout hospedado; documento validado e persistido com criptografia por tenant.
- Endereço do espaço sempre visível, disponibilidade em tempo de preenchimento, sugestões e recuperação de conflito junto ao campo.

- Checkout AbacatePay reutiliza produtos por plano/pacote e preço; nomes de compradores deixam de virar produtos.
- Nome, e-mail e telefone seguem para pré-preenchimento via cliente do provedor quando a chave permite `CUSTOMER:CREATE`; HTTP 403 preserva o fluxo hospedado.
- Migração 116 preserva o nome de cobrança e os identificadores de catálogo/clientes. Planos existentes e renovação manual permanecem preservados.

## [3.0.0] — 2026-10-28

Primeira entrega consolidada neste repositório GitHub. Inclui a integração funcional da referência 5.14.2 e as correções realizadas sobre a base NaRégua 2.2.2.

### Adicionado

- Equipes, agenda individual, serviços por profissional, convites e controle de vagas por faixa.
- AbacatePay v2: checkout por equipe, indicação, créditos extras e conciliação idempotente.
- WhatsApp com Evolution, central de conversas, campanhas e lembretes.
- Mestre AI com ferramentas, confirmação de ações e análise visual de marca.
- Landing mobile independente com três ilustrações originais, navegação por toque e contratação integrada.
- Exclusão permanente de espaços no painel DEV com confirmação exata e auditoria.
- CI para qualidade, navegadores e varredura de segredos no histórico completo.

### Corrigido

- Recuperação de acesso DEV quando a conexão global do WhatsApp não está disponível.
- Retorno do checkout com consulta ao provedor e encaminhamento ao login do espaço correto.
- Modelo visual para análise de logos, extração local de cores e devolução de tentativas que falham.
- Hover e foco derivados da cor do tenant, logos com proporção preservada e áreas que crescem com sua altura.
- Adaptações de financeiro, equipe, clientes, configurações e navegação do painel.
- Hierarquia dos preços mobile e faixa indevida no topo da landing desktop.

### Operação e limites

- SQLite preserva a linhagem de migrações NaRégua 1–40 e acrescenta 101–115.
- Backups criptografados, configuração externa ao Git e rollback por imagem.
- Pagamentos publicados estão em **sandbox por autorização do responsável**. KYC, chave live e homologação dos webhooks são necessários antes de cobrar valores reais.
- A chave de teste utilizada não possui permissão para cadastrar webhooks. A conciliação periódica permanece ativa; entrega de webhook pelo provedor ainda não foi homologada.
- Navegadores automatizados não substituem validação em Safari e aparelhos físicos. Não há afirmação de aumento medido de conversão.

Detalhes: [release 3.0.0](docs/RELEASE_3.0.0.md), [validação](VALIDATION.md) e [produção](docs/PRODUCAO_3_0.md).

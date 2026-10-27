# Reformulação da LP — 27/10/2026

Referência fornecida pelo usuário: AbacatePay. A composição pública anterior foi substituída, mantendo identidade e assets do NaRégua. A nova página demonstra agenda, equipe e gestão com seletor no título, explica o agendamento com estágio acompanhado na rolagem e apresenta as faixas de profissionais com preços animados. Fotografias, interface, paleta, texto e oferta pertencem ao NaRégua.

Implementação em `src/features/marketing`; checkout e catálogo existentes preservados. A rota `/acessar` agora aponta explicitamente para o formulário de acesso, em vez de cair no redirecionamento de tenant. O foco do ProductSelect é aplicado depois da montagem do menu, corrigindo navegação por teclado também no painel.

## Validação

- Build, TypeScript e ESLint aprovados.
- LP: 10/10 em Chromium e 10/10 em Firefox. Larguras 320, 390, 768, 1024, 1280 e 1440 px.
- Controles, teclado, catálogo com erro e recuperação, faixas e preços reais, token de indicação, modal, FAQ, acesso, movimento reduzido e retorno sem falsa confirmação de pagamento.
- Regressão do painel: 39/39, incluindo estados claros/escuros, filtro por teclado e nomes longos.
- Revisão independente: direção e composição atingidas; três correções solicitadas e depois pontuadas como resolvidas, com disposition `ship` no escopo dessas correções. Legenda de demonstração sem sobreposição, cotação sem desconto com linguagem neutra e etapa do checkout independente do título.
- Capturas de produto usam dados sintéticos, com origem nos metadados EXIF e em `docs/surfaces/LANDING_ASSETS.md`.

Nenhum pedido, conta, mensagem ou cobrança real foi criado nos testes. O checkout respeita a configuração de disponibilidade existente. A publicação desta LP não ativa pagamentos. Safari e dispositivos físicos não foram validados nesta entrega.

# Régua de qualidade do produto

Este documento transforma o feedback visual da versão publicada em critérios verificáveis para o NaRégua 2.1.

## Critérios P0

- nenhuma cor rosa, magenta, vinho ou lilás fora de conteúdo histórico permitido;
- tipografia única, limpa e previsível em todos os ambientes;
- modo claro completo e modo petróleo opcional;
- hierarquia que prioriza a ação principal e remove informação redundante;
- botões, campos, tabelas, diálogos e estados vazios com contrato único;
- fotografia com máscara de legibilidade quando recebe texto;
- nenhuma classe visível sem camada CSS correspondente;
- nenhuma tela presa em loading depois de erro de API;
- booking sem contador duplicado e com jornadas próprias para desktop e mobile;
- zero conteúdo, assets ou identidade da antiga base no frontend;
- estados de foco, teclado, toque e reduced motion preservados;
- nenhuma prova social, métrica ou depoimento inventado.
- equipe consolidada e individual sem misturar disponibilidade, produção ou movimentações;
- dupla reserva e referência cruzada entre espaços recusadas também no banco.

## Superfícies cobertas

- landing e checkout;
- login, bootstrap, MFA e acesso da cliente;
- shell, navegação e tour;
- dashboard, agenda, clientes e serviços;
- caixa, cobrança e indicações;
- WhatsApp e Mestre AI;
- configurações, domínio, segurança e console DEV;
- booking público e sucesso da reserva;
- mobile em 320, 390 e 430 px, além de desktop amplo.

## Evidência exigida

- `npm run check` aprovado;
- build Docker reproduzível;
- smoke test de staging com integrações reais;
- revisão visual em Chrome, Firefox, Safari e aparelhos móveis;
- screenshots do produto real, sem mocks gerados por imagem.

# Release v3.0.0

## Identificação

- Repositório: `git@github.com:Pdroinho/naregue-space.git`.
- Branch principal: `main`.
- Versão da aplicação: `3.0.0` em `package.json` e no lockfile.
- Tag anotada: `v3.0.0`.
- Base da aplicação publicada na preparação desta release: commit `79d4a3c`.

Esta publicação consolida o histórico de implementação. Commits posteriores à base publicada preparam documentação e CI; o envio ao GitHub não executa deploy automático na VPS.

A tag dispara a CI. A página de Release no GitHub é criada automaticamente somente depois de passarem qualidade, landing e varredura de segredos. O token efêmero da automação tem escrita apenas nesse job de release.

## Conteúdo

O resumo funcional e as correções estão no [CHANGELOG](../CHANGELOG.md). A landing tem composições distintas para desktop e celular, com artes e prompts versionados. O painel preserva o white label, a gestão por equipe e o escopo por tenant.

## Configuração externa

Copie `.env.example` para um arquivo local não versionado. Preencha os valores necessários usando credenciais próprias. Nunca copie o banco ou os segredos de produção para o repositório.

O checkout atual foi habilitado em sandbox enquanto a aprovação da conta de pagamentos está pendente. A CI não recebe credenciais reais e não publica a aplicação. Consulte [AbacatePay](ABACATEPAY.md) antes de alterar o ambiente de pagamentos.

## Validação da preparação

- `npm run check`: TypeScript, lint, 268 testes principais, 22 de migração, 16 de segurança, 35 de WhatsApp, auditoria de release e build passaram.
- Desktop: 9/9 verificações da landing; mobile: 8/8 em Chromium e 8/8 em Firefox, incluindo indicação, checkout sandbox, orientação e preservação de campos.
- Histórico Git e árvore atual inspecionados com Gitleaks. Os sete alertas históricos identificados eram placeholders ou fixtures; exceções foram limitadas aos fingerprints correspondentes.
- Nenhum `.env` real, banco, backup ou chave privada faz parte da entrega.

Relatórios locais em `.validation/` ficam fora do Git. Esta verificação não equivale a uma garantia absoluta de ausência de vulnerabilidades nem a testes em aparelhos físicos/Safari.

## Próximas versões

1. Trabalhe em uma branch e registre a mudança no changelog.
2. Atualize versão e lockfile juntos; ajuste o contrato de release quando a versão mudar.
3. Execute as validações e a varredura de segredos.
4. Crie uma tag anotada que corresponda à versão, sem mover tags já publicadas.
5. Faça deploy deliberado, com backup e rollback, seguindo [PRODUCAO_3_0.md](PRODUCAO_3_0.md).

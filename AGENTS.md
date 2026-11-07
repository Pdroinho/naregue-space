# Retomar o NaRégua

Antes de alterar o projeto, leia [docs/ESTADO_ATUAL.md](docs/ESTADO_ATUAL.md). Ele registra o estado publicado, decisões comerciais, pendências e o caminho para continuar sem o histórico do chat. Confira a data: o documento é um retrato, não substitui `git status`, código e estado real do servidor.

- Produto e interface: [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) e [BRANDING.md](BRANDING.md). A plataforma é NaRégua, para barbearias; caminhos internos herdados com `lashdesigner` não autorizam renomear dados ou infraestrutura.
- Pagamentos: [docs/ABACATEPAY.md](docs/ABACATEPAY.md) e [docs/REFERRAL_CASH.md](docs/REFERRAL_CASH.md). Consulte as limitações de homologação antes de afirmar que algo está 100% validado.
- Operação: [docs/CONTINUIDADE_OPERACIONAL.md](docs/CONTINUIDADE_OPERACIONAL.md). Push não faz deploy. Não restaurar banco de desenvolvimento, apagar volumes ou trocar chaves de criptografia.
- Não imprimir `.env`, credenciais, banco, dados de clientes ou segredos em logs/documentação. `.validation/` é privado e ignorado; não adicioná-lo ao Git.
- Não realizar cobranças, transferências reais, disparos de WhatsApp/e-mail ou alterações financeiras para testar sem autorização específica para a operação. Testes locais usam fixtures e bancos isolados.
- Os commits deste repositório usam a identidade local `Pdroinho`. Preserve o histórico; não fazer force-push ou reescrever autores/tags sem solicitação explícita.
- Validar proporcionalmente ao que mudou. Mudanças funcionais usam `npm run check` e os testes de navegador pertinentes; alterações apenas documentais não exigem novos testes financeiros nem deploy.

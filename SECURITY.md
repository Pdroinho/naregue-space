# Segurança

Nunca publique credenciais, `.env`, chaves SSH/TLS, bancos, backups, mídia de clientes ou logs de produção. A configuração de exemplo contém somente placeholders. Credenciais ficam no servidor ou em um gerenciador de segredos.

## Antes de enviar mudanças

```bash
npm run check
gitleaks git . --redact=100 --log-opts=--all
```

A CI executa a varredura completa do histórico. `.gitleaksignore` contém apenas fingerprints auditados de placeholders e fixtures históricos; ele não ignora pastas inteiras nem permite credenciais reais em testes. Novos alertas devem ser investigados, sem copiar valores sensíveis em comentários ou logs.

Se uma credencial real entrar em um commit, revogue-a no provedor e remova-a do histórico antes de publicar. Apagar apenas o arquivo atual não remove versões antigas do Git. A revisão deve incluir arquivos binários, anexos e relatórios de ferramentas.

## Relatar uma falha

Use o canal privado do responsável pelo repositório ou o recurso **Report a vulnerability**, quando habilitado. Não abra uma issue pública com dados de clientes, tokens ou detalhes suficientes para explorar uma instalação.

## Limites operacionais

- Não habilite cobranças live usando chave `abc_dev_`.
- Não altere ou regenere a chave de criptografia de uma instalação existente sem plano de migração.
- Preserve isolamento entre tenants, verificações de acesso e assinatura/segredo dos webhooks.
- Um retorno de navegador ou uma captura de pagamento não comprova recebimento: a aplicação consulta o provedor antes da concessão de acesso.

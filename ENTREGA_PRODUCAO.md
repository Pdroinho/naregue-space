# Entrega de produção — NaRégua 2.2.2

A release 2.2.2 preserva o acesso individual de profissionais introduzido na 2.2.0, mantém a revisão visual da 2.2.1 e estabiliza o booking mobile: as cinco etapas permanecem em uma linha e a ação de voltar fica presa ao rodapé da viewport sem sobrepor o CTA de confirmação. A publicação comercial continua dependente de homologação no ambiente real porque checkout, WhatsApp, DNS, TLS, dados legais e recuperação exigem credenciais e infraestrutura do titular.

A atualização de uma instalação existente executa a migration 40 automaticamente. Faça backup antes do deploy e valide no staging:

- responsável vinculado ao profissional principal;
- criação manual de novos profissionais;
- geração, uso único, expiração e revogação de convite;
- profissional autenticado vendo somente `/profissional` e seus próprios atendimentos;
- responsável mantendo acesso consolidado à equipe, caixa e configurações.

## Gate técnico local

```bash
npm ci
npm run check
npm run preflight
```

## Gate de staging

1. subir pelo `DEPLOY_DOCKER.md`;
2. validar `/api/ready` e logs;
3. executar `docs/RELEASE_CHECKLIST.md`;
4. testar login + MFA do responsável e de um profissional convidado;
5. tentar acessar recursos de outro profissional e confirmar resposta negada/ausência de dados;
6. testar backup, restauração e rollback em ambiente separado;
7. registrar responsável, data, versão e hash do pacote publicado.

# Continuidade operacional e publicação

Referência conferida em 06/11/2026. Leia [ESTADO_ATUAL.md](ESTADO_ATUAL.md) para o contexto funcional. Este é um guia de continuidade; os comandos de mutação não devem ser executados apenas por estar lendo o documento.

## Onde está cada coisa

| Recurso | Localização/contrato |
| --- | --- |
| Repositório | `git@github.com:Pdroinho/naregue-space.git`, branch `main` |
| Workspace desta máquina | `D:\Projetos\naregua` |
| Host SSH configurado nesta máquina | alias `oracle_tunado`; depende da configuração SSH privada local |
| Aplicação pública | `https://naregua.space` |
| Acesso a um espaço | subdomínio do espaço, `/admin`; domínio personalizado quando configurado |
| Container da aplicação | `naregua-app` |
| Base operacional no host | `/opt/lashdesigner` — nome legado; não renomear por estética |
| Estado do deploy | `/opt/lashdesigner/deployment-state.json` |
| Link para a release corrente | `/opt/lashdesigner/app` |
| Releases e helper atual | `/opt/lashdesigner/releases/` |
| SQLite no container | `/data/db/app.db`, volume Compose `app_app-db` na implantação inspecionada |
| Mídia no container | `/data/media` |
| Backup criptografado no container | `/data/backups` |
| API HTTP da app no host | `127.0.0.1:3000`; HTTPS público via Caddy |
| Projeto Compose atual | `app`; rede externa `app_naregua-net` |

Há também Evolution, PostgreSQL e Redis. O backup SQLite não recupera sozinho esses serviços. Um alias SSH e as pastas privadas desta máquina não fazem parte de um clone Git.

## Configurações privadas

A release em execução usa `.env` privado na VPS. Há arquivos privados separados para credenciais de teste e de produção do provedor. Não os imprimir, colar em chat, anexar em issue/PR, copiar para o frontend ou versionar. O arquivo `.env.example` contém somente nomes e exemplos.

Variáveis importantes a localizar **sem revelar valores**:

- `APP_ENCRYPTION_KEY`: necessária para ler documentos, chaves Pix e outros segredos já criptografados. Não gerar outra para um banco existente.
- `BACKUP_ENCRYPTION_KEY`: preservada separadamente; necessária para restaurar backups.
- `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET`: apenas servidor; no estado atual, produção usa `ABACATEPAY_DEV_MODE=false`, `ABACATEPAY_ALLOW_SANDBOX_IN_PRODUCTION=false`, `ABACATEPAY_CHECKOUT_ENABLED=true`.
- Configurações de URL/host, cookies/sessões, autenticação, Evolution, IA, banco e mídias: seguir `.env.example` e o ambiente existente; não substituir o arquivo inteiro por um exemplo.
- `LEGAL_PROVIDER_*`, `LEGAL_CONTACT_EMAIL`, `PRIVACY_CONTACT_EMAIL`: fonte dos documentos públicos. Confirmar caixas de e-mail ativas antes de trocar contatos.

Evitar `docker inspect` completo, `docker compose config` sem `--quiet` e dumps de ambiente: esses comandos podem revelar segredos. Ler apenas campos necessários e tratar `.validation/` como material privado; ela pode conter dados de diagnóstico, screenshots e senhas sintéticas.

## Retomar localmente

```powershell
Set-Location D:\Projetos\naregua
git status --short
git log -5 --oneline
git remote -v
node --version
npm --version
```

Não sobrescrever alterações locais de outra pessoa. Em clone novo, instalar com Node 22 e `npm ci`; preparar `.env` com configuração de desenvolvimento. Não conectar desenvolvimento à base publicada nem usar a chave live em testes automatizados.

Para mudanças funcionais:

```powershell
npm run check
npx playwright install chromium firefox
```

Selecione os testes de navegador de acordo com a mudança, por exemplo:

```powershell
node scripts/check-product-ui.mjs --referral-cash
node scripts/check-product-ui.mjs --brand-height
node scripts/check-product-ui.mjs --sidebar-icons
node scripts/check-product-ui.mjs --dashboard-icon-contrast
node scripts/check-product-ui.mjs --settings-brand
```

Esses scripts usam o produto compilado; após editar o frontend, executar `npm run build` antes deles. Para landing: `check-landing-ui.mjs --desktop-only`, `check-mobile-landing.mjs` e a variante `--firefox`. Não executar todos os testes repetidamente sem alteração ou falha que justifique.

`npm run check` cobre tipos, lint, testes, migrações, segurança, WhatsApp, auditoria de release e build. Não comprova pagamento real, entrega de WhatsApp ou recuperação de backup. Mudança só de Markdown exige revisão de links, coerência e segredos, sem novos testes financeiros ou deploy.

## GitHub e autoria

Commits novos usam a identidade local `Pdroinho`. Conferir `git config user.name` e `git config user.email` sem alterar configuração global da máquina. Preservar autores anteriores; não reescrever histórico ou tags nem usar force-push sem solicitação específica.

O CI verifica código, landing e histórico de segredos. O job de release só roda em tag `v*`; push para `main` não cria release nem publica na VPS. `package.json` e lock continuam `3.0.0`; há mudanças não lançadas após `v3.0.0`. Um novo release precisa de versionamento e notas próprios, não de mover a tag existente.

Revisar os arquivos que entrarão no commit e executar a varredura de segredos com Gitleaks configurado pelo repositório. O executável local usado nesta máquina fica sob `.validation/tools/`; não presumir que exista em outro clone. O CI também faz a varredura. Não adicionar exceções amplas para esconder um resultado; separar falso positivo de segredo real.

## Publicar código na VPS

O fluxo usado nas últimas entregas usa o helper privado operacional `/opt/lashdesigner/releases/deploy-ui-release.py`. Apesar do nome `ui`, ele recompila e recria a aplicação completa, incluindo servidor e migrações. A cópia local estava em `.validation/deploy-ui-release.py` e **não é rastreada no Git**. Em outra máquina, conferir a versão existente no host antes de reutilizar; não inventar um substituto que sobrescreva configurações ou volumes.

O helper atual verifica o arquivo de release, preserva `.env` e Compose existentes, guarda imagem de rollback, executa o backup criptografado, faz build, recria somente a aplicação, verifica readiness local/público e atualiza symlink/estado. Em caso de falha de prontidão, tenta voltar a imagem anterior. Isso não equivale a restaurar automaticamente o banco.

Depois de concluir e validar uma alteração cuja publicação esteja autorizada, o fluxo de referência é:

```powershell
$releaseCommit = (git rev-parse --short HEAD).Trim()
if ($releaseCommit -notmatch '^[0-9a-f]{7,40}$') { throw 'Commit inválido' }
New-Item -ItemType Directory -Force .validation | Out-Null
git archive --format=zip --prefix=naregua/ --output=.validation/naregua-ui-$releaseCommit.zip HEAD
scp .validation/naregua-ui-$releaseCommit.zip oracle_tunado:/opt/lashdesigner/releases/
ssh oracle_tunado "python3 /opt/lashdesigner/releases/deploy-ui-release.py $releaseCommit"
```

O Git deve conter somente código e documentação revisados. O archive vem de `HEAD`; arquivos locais não commitados não são enviados. Não arquivar a pasta de trabalho inteira com `.env`, banco e diagnósticos. O helper deriva nomes de release/imagem do commit; conferir sucesso, não apenas término do upload.

Após publicar:

```powershell
Invoke-RestMethod https://naregua.space/api/ready
git status --short
```

Conferir também o estado do deploy, a migração esperada, as telas alteradas e o modo live/sandbox sem revelar segredos. Nenhum teste automático deve escolher um destinatário e enviar Pix real ou criar cobrança real como parte de “verificar deploy”.

## Backup e rollback

- Preservar banco, mídias, configurações privadas e chaves. Exportar e testar restauração em staging; um arquivo criptografado gerado não prova recuperação completa.
- Não executar `docker compose down -v`, apagar volumes ou copiar o banco de desenvolvimento sobre produção.
- Usar as rotinas versionadas de `deploy/` e [PRODUCAO_3_0.md](PRODUCAO_3_0.md) para referência de backup/restore, conferindo contratos com a instalação real. Não mudar nome do projeto Compose/rede sem mapear volumes e proxy.
- Rollback de código não desfaz migrações nem obrigações financeiras. Depois de existirem indicações em dinheiro, voltar a uma versão que ignora essas tabelas pode interromper registro/conciliação de recompensas. Avaliar dados e pagamentos antes de fazê-lo.
- Restaurar banco antigo pode perder eventos ou pagamentos ocorridos desde o backup. Exige plano e autorização adequados, não uma tentativa automática de resolver aparência da interface.

## Homologação financeira pendente

Para a primeira transferência real de teste, registrar previamente autorização, valor e destinatário. Não usar cliente de produção como cobaia nem “tentar de novo” após timeout.

No fluxo normal, o DEV faz revisão e confirma o Pix pela interface; a API executa. Se houver resultado incerto ou falha após o início do envio, não abrir outra solicitação nem repetir pelo banco. Localizar a transferência na AbacatePay e usar conciliação por ID, conferindo referência, valor, ambiente, taxa e comprovante. Ausência de resposta não prova ausência de transferência.

Scripts ignorados de QA usados neste ambiente incluíram pagamento simulado, remoção de espaços sintéticos e tentativas de Pix sandbox. Não são parte do runbook de produção e não devem ser reexecutados por nome sem ler o conteúdo. Para evidências atuais e limitações: [REFERRAL_CASH.md](REFERRAL_CASH.md) e [ABACATEPAY.md](ABACATEPAY.md).

# Revisão técnica — NaRégua 2.0

## Resultado

A aplicação usa um único contrato visual e operacional. Não existem folhas CSS versionadas ativas, nomenclatura da antiga base no frontend, overlays paralelos ou dependência de fonte licenciada ausente.

## Compatibilidade preservada

Três strings históricas continuam isoladas no servidor:

- salt criptográfico em `server/secretCryptoCore.ts`;
- versão de consentimento em `server/legal.ts`;
- registro DNS anterior em `server/domains.ts`.

Renomeá-las quebraria dados e evidências já persistidos. Novos dados usam a identidade NaRégua.

## Limites conscientes

- SQLite pressupõe uma instância gravadora;
- integrações externas exigem homologação real;
- campanhas em massa permanecem bloqueadas por padrão;
- a revisão visual automatizada não substitui teste em navegadores e aparelhos reais.

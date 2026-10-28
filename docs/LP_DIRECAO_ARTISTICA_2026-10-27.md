# LP — direção artística após revisão do usuário

O usuário aprovou a estrutura e pediu mais caráter, cor, contraste, ilustração e movimento. Substituídas as fotografias e capturas ampliadas da LP por nove assets originais gerados com o ImageGen integrado: mãos com tesoura e pente, busto de mármore com fade, celular físico com tela conceitual, agenda, equipe, financeiro, fitas de conversa e fundo abstrato de papel/cobre.

A primeira dobra usa cítrico com petróleo/cobre, recortes ilustrados e reação ao ponteiro com mola amortecida. O código para o movimento roda apenas durante o deslocamento e para ao estabilizar; ponteiro grosso e movimento reduzido recebem composição estática. Os controles permanecem HTML e a narrativa mantém seu funcionamento por teclado.

O agendamento passa a uma seção petróleo. Financeiro e Mestre AI ganham composições próprias. Planos têm hierarquia e espaçamento compactos, com altura desktop validada abaixo de 850 px. Encerramento em colagem integra um rodapé petróleo com grupos de links legíveis. O painel operacional não muda.

Os mockups são fictícios e sinalizados como conceituais; não prometem uma interface idêntica nem métricas de resultado. Valores comerciais continuam vindos do catálogo. Nenhum pagamento, mensagem ou conta foi criado.

## Evidência

- Build, TypeScript e ESLint aprovados.
- Chromium e Firefox: 10/10 verificações em cada, de 320 a 1440 px, sem achados do verificador visual.
- Verificados controles, teclado, ponteiro com mola, movimento reduzido, faixas/preços reais, catálogo/recuperação, indicação, checkout, FAQ e acesso.
- Revisão visual independente completa: **ship**, após comparar a nova composição desktop/mobile com o feedback e as referências do usuário. Documentação reconciliada com a nova direção.
- Nove WebPs em `public/landing/art`; alpha nativo validado nos cinco recortes. Prompts exatos em EXIF, sidecars e `docs/assets/landing-art-prompts.json`. Scanner de origem: nove rasters, zero ausentes.
- Safari e aparelhos físicos não fizeram parte desta verificação.

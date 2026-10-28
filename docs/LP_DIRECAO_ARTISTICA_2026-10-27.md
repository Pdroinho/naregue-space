# LP — revisão de identidade e assets

A revisão art-v2 atende à correção explícita do usuário: AbacatePay é referência de composição, ilustração e movimento, sem transferir sua paleta. O NaRégua permanece em petróleo, cobre e creme, com detalhes pêssego. Verde fica restrito a estados semânticos de confirmação.

Sete assets gerados com o ImageGen integrado substituem integralmente o conjunto rejeitado: mãos com tesoura e pente, cadeira de barbeiro, mãos escrevendo no caderno, celular e três demonstrações conceituais de agenda, equipe e financeiro. As ilustrações usam tinta, hachura e aquarela. Capturas reais e o logo oficial orientaram as demonstrações; o PNG oficial também é aplicado em HTML nos mockups desktop. Legendas identificam conteúdo conceitual e dados fictícios.

Assets em public/landing/art-v2; prompts exatos em docs/assets/landing-art-v2-prompts.json, EXIF e sidecars. Quatro recortes têm alpha nativo. Scanner: sete rasters, zero origens ausentes. Os assets rejeitados foram removidos da entrega.

## Validação art-v2

- Build, TypeScript e ESLint passaram.
- Chromium e Firefox: 10/10 verificações cada, entre 320 e 1440 px; nenhum achado do verificador visual.
- Marca oficial, paleta e preservação das colunas do financeiro têm verificações específicas.
- Controles, teclado, movimento reduzido, preços reais, recuperação do catálogo, checkout informativo, FAQ e acesso preservados. Nenhum pedido, pagamento ou mensagem criado pelos testes.
- Revisão visual independente: sem bloqueios materiais após corrigir o recorte do financeiro no celular. Isso não representa aprovação estética do usuário.
- Safari e aparelhos físicos não foram testados.

O painel operacional e a disponibilidade do checkout não foram alterados.

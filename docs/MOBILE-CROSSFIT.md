# CrossFit e revisão para celular

A área antes chamada “Pense WOD” passou a se chamar “CrossFit” na navegação, nos títulos e nos atalhos. WOD continua sendo o nome dos treinos dentro dessa área.

O cabeçalho em telas menores ganhou um botão “Menu” com acesso às 16 áreas. A navegação inferior continua disponível. Os ajustes incluem campos com fonte de 16 px, alvos de toque maiores nas abas e ações, formulários limitados à tela e ações fixadas no rodapé dos diálogos durante a rolagem.

## Validação

- Suíte completa aprovada: 27 testes de domínio/provedor e 52 testes de navegador.
- Navegação por toque nas larguras de 320, 360, 390 e 430 px, sem transbordamento horizontal nas 16 áreas.
- Abas internas, cadastro e personalização em formulários pequenos.
- 20 cenários em navegador móvel com backend real: autenticação, 70 demonstrações de exercícios, treinos e séries persistidos, alimentação, compras, medidas, recuperação, calendário, PDF, corrida, integrações, fotos privadas, CrossFit e logout.
- Os mesmos 20 cenários passaram no Vercel, sem falhas ou erros de JavaScript. O hash do aplicativo publicado coincidiu com a compilação local. As contas e arquivos temporários foram removidos.

Os testes usam emulação de celular no Chrome e contas descartáveis. Não substituem a validação de GPS em campo, teclado virtual, Safari/iOS ou comportamento com a tela bloqueada em um aparelho físico.

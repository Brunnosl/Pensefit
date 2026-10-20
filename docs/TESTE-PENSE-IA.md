# Validação do Pense AI — 19/10/2026

Os testes foram executados no site publicado, com contas descartáveis, dados sintéticos e chamadas ao provedor real. A configuração em execução respondeu como Gemini, modelo `gemini-3.5-flash-lite`.

## Backend e provedor

- Status da configuração e teste real de conexão responderam com sucesso.
- Conversa retornou texto no formato esperado.
- Receita retornou proposta estruturada com ingredientes e preparo.
- PDF fictício foi extraído; o original permaneceu privado durante o teste e foi removido ao final.
- WOD e plano de corrida retornaram propostas válidas, sem aplicação automática.
- A tentativa de ler o segredo do provedor com uma conta comum foi bloqueada.

Scripts usados: `tests/live-gemini.cjs`, `tests/live-gemini-modules.cjs` e `tests/live-ai-plans.cjs`.

## Interface publicada

Os nove cenários de `tests/live-ai-browser.cjs` passaram:

1. Status e conexão real pela interface.
2. Conversa em Personal trainer.
3. Conversa em Pense Nutri.
4. Conversa em CrossFit.
5. Conversa em Pense Run AI.
6. Histórico preservado após recarregar e continuação da conversa.
7. Proposta de receita sem criação automática de registro; revisão e salvamento explícitos; receita disponível no catálogo pessoal.
8. Envio e resposta em emulação de celular de 390 px, sem transbordamento horizontal.
9. Exclusão de uma conversa e remoção do histórico na interface.

Nenhum erro de JavaScript foi observado. Não foi necessária alteração funcional no app. O script de teste e este registro foram adicionados ao repositório.

As quatro contas temporárias tiveram suas sessões e registros removidos ao final. A consulta de conferência não encontrou arquivos privados desses testes. Os testes demonstram funcionamento no momento da execução; não comprovam a qualidade de todas as respostas possíveis do modelo nem disponibilidade futura do provedor.

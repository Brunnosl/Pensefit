# Demonstrações dos exercícios

O catálogo contém **70 exercícios e habilidades**, com **164 posições de referência**: 108 fotografias locais e 50 diagramas SVG distintos, reutilizados onde a variação é a mesma. Todos têm instruções em português, equipamento identificado e demonstração no próprio aplicativo.

## Onde consultar

- Biblioteca geral e biblioteca de movimentos do Pense WOD.
- Modo treino, pelo botão da imagem ou “Técnica e alternativas”.
- Plano anterior, ao tocar na demonstração de um exercício.
- Movimentos do WOD e habilidades como muscle-up na barra, muscle-up nas argolas e handstand.
- Modelos de corrida, pelo botão “Ver técnica de corrida”.

Os arquivos públicos consultados podem ser guardados pelo service worker para abrir novamente sem conexão. Fotos de evolução e documentos privados continuam fora desse cache.

## Origem e manutenção

- Fotos: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), revisão `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`, publicada sob Unlicense. Cópia da licença: `dist/assets/exercises/Free-Exercise-DB-LICENSE.txt`.
- Diagramas: SVGs originais e editáveis, gerados por `scripts/exercise-diagrams.cjs`. São identificados como ilustrações no aplicativo.
- Instruções: adaptações em português associadas à variante exata. Referências técnicas complementares: [CrossFit Movements](https://www.crossfit.com/crossfit-movements) e [SkiErg Technique — Concept2](https://www.concept2.com/blog/skierg-technique).
- O mapeamento foi feito explicitamente por exercício, sem associar fotos apenas por semelhança de nomes. Por exemplo, “Air Bike” da fonte é um abdominal; por isso não foi usado como imagem da bicicleta.
- Algumas sequências fotográficas mostram apenas o início do levantamento. Foram acrescentadas ilustrações da recepção e finalização de snatch, clean, jerk e muscle-up.

`src/platform/exercise-media.json` guarda o manifesto. `scripts/exercise-media-source.cjs` guarda o mapeamento revisável, as instruções e os equipamentos. `scripts/fetch-exercise-media.cjs` é a etapa manual de aquisição; a compilação normal usa os arquivos já presentes no repositório e não baixa imagens.

```powershell
npm.cmd run build
npm.cmd test
node scripts/exercise-inventory.cjs
```

A compilação falha se algum exercício não tiver demonstração ou apontar para um arquivo ausente. Os testes abrem os 70 detalhes no navegador e verificam o carregamento de todas as imagens, o celular, os filtros, as habilidades e o cache offline.

## Verificação funcional desta alteração

- 27 testes de domínio/provedor e 46 testes de navegador aprovados.
- 20 cenários de interface com backend real, incluindo todas as demonstrações e os fluxos de treino, alimentação, evolução, corrida, WOD, exportação e logout.
- Revalidados no backend real: autenticação, 23 entidades da plataforma, 12 entidades de corrida, estoque, compras, arquivos privados, isolamento entre contas e consentimento de Box/Coach.
- Revalidados com o provedor real: conversa, receita, PDF sintético, conexão, proposta de WOD e proposta de corrida.
- Exclusão de conta verificada com usuário e arquivo temporários.
- Verificação final no Vercel: 20 cenários aprovados, sem falhas ou erros de JavaScript; as 70 demonstrações foram abertas no domínio público. O hash do bundle publicado coincidiu com o arquivo compilado localmente.
- O catálogo de exercícios usado pelo servidor foi comparado ao manifesto: nenhuma entrada ficou sem correspondência visual.
- Limpeza concluída: nenhuma conta temporária ou arquivo privado desses testes permaneceu no Supabase.

Os testes reais usam contas descartáveis e dados sintéticos. A verificação em navegador não comprova entrega em caixas de e-mail, precisão de GPS em campo ou comportamento nativo com tela bloqueada. Exercícios personalizados com nomes livres precisam ter sua técnica associada pelo autor do plano; a demonstração automática cobre o catálogo interno.

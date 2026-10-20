# Catálogo de receitas e sugestões por objetivo

O catálogo passou de 4 para 28 receitas, com café da manhã, almoço, jantar e lanches. Há opções com frango, peixe, ovos, laticínios e opções vegetais com feijão, lentilha e grão-de-bico. As quatro receitas anteriores mantêm os mesmos IDs e ingredientes.

Na área de receitas, o filtro inicial considera o objetivo principal informado na personalização do perfil. É possível escolher ganho de massa, emagrecimento/definição, manutenção ou todos os objetivos, além de filtrar por refeição e buscar nomes ou ingredientes. Sem objetivo informado, a seleção inicial é manutenção. Os grupos são sugestões editoriais; uma receita pode aparecer em mais de um grupo. Não há promessa de resultado nem alteração automática de porções ou do plano profissional.

O planejamento semanal permite selecionar objetivo e tipo de refeição e alterna receitas compatíveis com essa seleção e com as restrições registradas. A lista de compras e o registro alimentar usam os ingredientes e quantidades das receitas selecionadas. Favoritar uma receita do catálogo não cria um segundo cartão.

## Composição e preparo

As estimativas são calculadas com 20 alimentos do [USDA FoodData Central, SR Legacy](https://fdc.nal.usda.gov/download-datasets/), incluindo 12 ingredientes novos. Cada alimento registra o ID, a descrição original, a base de 100 g e o endereço da fonte. Os cartões mostram valores por porção e os detalhes mostram a receita inteira. As 28 receitas do catálogo rendem uma porção; os valores não incluem temperos ou ingredientes opcionais que o usuário adicionar.

O peso corresponde ao estado indicado no ingrediente: arroz, leguminosas, ovos e legumes cozidos; frango e peixe assados; batata-doce assada sem casca; frutas na parte comestível; aveia seca. Algumas receitas partem de alimentos já preparados, como informado nos passos.

Os dados incorporados foram extraídos do ZIP público oficial `FoodData_Central_sr_legacy_food_json_2018-04.zip`. Para reproduzir a importação dos ingredientes novos, baixe esse arquivo na página do USDA e execute:

```powershell
python scripts/import-recipe-foods.py CAMINHO_DO_ZIP
```

O arquivo grande de origem não integra o repositório. `scripts/food-catalog.mjs` também contempla os 20 IDs para atualização pela API oficial.

As imagens existentes pertencem às quatro receitas anteriores. As novas receitas usam o ícone de alimentação, sem fotografias que representem incorretamente os pratos.

## Verificação

- 29 testes de domínio/provedor e 56 cenários de navegador cobrem a plataforma após a ampliação. Os quatro testes novos de receitas foram reexecutados após os ajustes finais.
- Os testes abrem os detalhes das 28 receitas, verificam filtros no computador e no celular, seleção inicial pelo perfil, busca por ingrediente, estado sem resultados e favoritos sem duplicação.
- O planejamento semanal foi verificado com objetivo de ganho de massa, café da manhã e perfil vegano com restrição a amêndoas; todas as sugestões respeitaram essa seleção.
- A composição dos ingredientes é validada contra os IDs locais da fonte oficial, com quantidades e estado de preparo explícitos.
- Os quatro testes de receitas passaram também no site publicado no Vercel, com backend simulado para não criar registros em contas reais. O JavaScript publicado corresponde ao compilado local; o CSS corresponde após normalizar as quebras de linha do Git.

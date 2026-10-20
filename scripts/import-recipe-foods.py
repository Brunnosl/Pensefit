"""Import verified SR Legacy ingredients from the official USDA JSON ZIP."""
import json
import sys
import zipfile
from pathlib import Path

ids = {173424, 173735, 172421, 170440, 168483, 169967, 170394,
       170457, 170894, 171688, 173757, 171413}
with zipfile.ZipFile(sys.argv[1]) as archive:
    data = json.loads(archive.read(next(n for n in archive.namelist() if n.endswith('.json'))))
path = Path('src/platform/foods-usda.json')
existing = json.loads(path.read_text(encoding='utf-8'))
selected = []
for food in data['SRLegacyFoods']:
    if food['fdcId'] not in ids:
        continue
    nutrients = {r['nutrient']['id']: r.get('amount') for r in food['foodNutrients']}
    row = dict(id=str(food['fdcId']), originalName=food['description'],
               **{k: nutrients.get(n) for k, n in [('calories', 1008), ('protein', 1003),
                   ('carbs', 1005), ('fat', 1004), ('fiber', 1079)]},
               source='USDA FoodData Central — SR Legacy',
               sourceURL=f"https://fdc.nal.usda.gov/food-details/{food['fdcId']}/nutrients",
               basis='100 g', dataType='SR Legacy')
    if any(row[k] is None for k in ['calories', 'protein', 'carbs', 'fat', 'fiber']):
        raise ValueError('Incomplete composition: ' + row['id'])
    selected.append(row)
if {int(r['id']) for r in selected} != ids:
    raise ValueError('Missing USDA foods')
merged = [r for r in existing if int(r['id']) not in ids] + sorted(selected, key=lambda r: r['id'])
path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Imported {len(selected)} foods; {len(merged)} total.')

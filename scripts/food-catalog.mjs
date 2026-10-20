import fs from 'node:fs';
const ids=[168878,171477,171077,173904,173944,169414,173718,170567];
const response=await fetch('https://api.nal.usda.gov/fdc/v1/foods?api_key=DEMO_KEY',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fdcIds:ids})});
if(!response.ok)throw new Error('USDA: '+response.status);
const data=await response.json();
const selected=data.map(food=>{const nutrient=id=>food.foodNutrients.find(n=>n.nutrient.id===id)?.amount??null;return{id:String(food.fdcId),originalName:food.description,calories:nutrient(1008),protein:nutrient(1003),carbs:nutrient(1005),fat:nutrient(1004),fiber:nutrient(1079),source:'USDA FoodData Central — SR Legacy',sourceURL:`https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`,basis:'100 g',dataType:food.dataType}});
fs.mkdirSync('src/platform',{recursive:true});fs.writeFileSync('src/platform/foods-usda.json',JSON.stringify(selected,null,2));console.log(JSON.stringify(selected));

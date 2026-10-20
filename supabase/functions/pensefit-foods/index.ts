import {authenticate,body,reply,failure,headers,fetchTimed} from '../_shared/runtime.ts';
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(req.method!=='POST')return reply(req,405,{message:'Use POST.'});
 try{
  await authenticate(req);const params=await body(req,2000),query=String(params.query||'').trim();if(query.length<2||query.length>120)return reply(req,400,{message:'Informe nome ou código válido.'});
  const fields='code,product_name,product_name_pt,brands,nutriments';
  const barcode=/^\d{8,14}$/.test(query);
  const url=barcode?`https://world.openfoodfacts.org/api/v2/product/${query}?fields=${fields}`:`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=${fields}`;
  const response=await fetchTimed(url,{headers:{'User-Agent':'PENSEFIT/2.0 (personal nutrition app)'}},15000);
  if(!response.ok)return reply(req,503,{message:'Base externa indisponível. Use o catálogo local ou registre o rótulo.'});const data=await response.json();const products=barcode?(data.status===1?[data.product]:[]):data.products||[];
  const foods=products.filter((p:any)=>p.product_name_pt||p.product_name).map((p:any)=>{const n=p.nutriments||{},amount=(key:string)=>typeof n[key]==='number'&&Number.isFinite(n[key])&&n[key]>=0?n[key]:null;const code=String(p.code||'');return{id:'off-'+code,name:String(p.product_name_pt||p.product_name).slice(0,120)+(p.brands?' · '+String(p.brands).slice(0,50):''),calories:amount('energy-kcal_100g'),protein:amount('proteins_100g'),carbs:amount('carbohydrates_100g'),fat:amount('fat_100g'),fiber:amount('fiber_100g'),source:'Open Food Facts — dados colaborativos de rótulos',sourceURL:/^\d{8,14}$/.test(code)?'https://world.openfoodfacts.org/product/'+code:'https://world.openfoodfacts.org',basis:'100 g',license:'Open Database License (ODbL)',category:'Outros'}});
  return reply(req,200,{foods});
 }catch(error){return failure(req,error)}
});

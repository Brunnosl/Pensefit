const crypto=require('node:crypto');
const fs=require('node:fs');
const id='11111111-1111-4111-8111-111111111111',otherId='22222222-2222-4222-8222-222222222222';
const baseProfile={fullName:'Brunno Teste',phone:'',birthDate:'1998-06-10',gender:'Não informar',age:28,height:1.87,weight:75,calKg:36,proteinKg:1.8,fatKg:.8,waterKg:35,goal:'Ganho de massa + definição'};
const fitness=()=>({profile:{...baseProfile},done:{},meals:{},loads:[],progress:{}});
function session(userId=id){const payload={sub:userId,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'};const access_token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify(payload)).toString('base64url'),'fake-test-signature'].join('.');return{access_token,refresh_token:'test-refresh-token',token_type:'bearer',expires_in:3600,expires_at:payload.exp,user:{id:userId,aud:'authenticated',role:'authenticated',email:userId===id?'brunno@example.test':'outro@example.test',app_metadata:{provider:'email',providers:['email']},user_metadata:{pensefit_profile:{...baseProfile}},created_at:new Date().toISOString()}}}
async function backend(page,{signedIn=false,account=fitness(),failedWrite=false,conflicted=false,entities={}}={}){
 const server={account:structuredClone(account),revision:0,failedWrite,conflicted,entities:structuredClone(entities),signups:[],passwordChanges:[],recovery:[],writes:[],userId:id,files:new Map(),functions:[]};
 if(signedIn)await page.addInitScript(({session})=>localStorage.setItem('pensefit-auth-v2',JSON.stringify(session)),{session:session()});
 await page.route('https://dulligfgabrmxghfgmjl.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url()),method=request.method();
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'X-Supabase-Api-Version','X-Supabase-Api-Version':'2024-01-01'};
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{...cors,'Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
  const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:cors,body:JSON.stringify(data)});
  if(url.pathname.endsWith('/token')){const body=request.postDataJSON();if(body.password==='wrong-pass')return json({code:'invalid_credentials',msg:'Invalid login credentials'},400);server.userId=body.email==='outro@example.test'?otherId:id;return json(session(server.userId))}
  if(url.pathname.endsWith('/user')){if(method==='PUT'){server.passwordChanges.push(request.postDataJSON());return json(session(server.userId).user)}return json(session(server.userId).user)}
  if(url.pathname.endsWith('/signup')){server.signups.push(request.postDataJSON());return json(session().user)}
  if(url.pathname.endsWith('/recover')){server.recovery.push(request.postDataJSON());return json({})}
  if(url.pathname.endsWith('/resend'))return json({});
  if(url.pathname.endsWith('/logout'))return route.fulfill({status:204,headers:cors});
  if(url.pathname.includes('/functions/v1/')){const body=request.postDataJSON();server.functions.push({name:url.pathname.split('/').at(-1),body});if(body.action==='status')return json({configured:false});if(url.pathname.endsWith('/pensefit-ai'))return json({code:'ai_not_configured',message:'A chave de IA ainda não foi configurada. Configure OPENAI_API_KEY nos segredos das Edge Functions.'},503);if(url.pathname.endsWith('/pensefit-foods'))return json({foods:[]});return json({deleted:true})}
  if(url.pathname.includes('/storage/v1/object/sign/'))return json({signedURL:'/object/sign/'+url.pathname.split('/sign/')[1]+'?token=test'});
  if(url.pathname.includes('/storage/v1/object/')){if(method==='POST'){server.files.set(url.pathname,true);return json({Key:url.pathname.split('/object/')[1]})}if(method==='DELETE')return json([]);if(method==='GET')return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')})}
  if(url.pathname.includes('/rest/v1/rpc/')){
   const name=url.pathname.split('/').at(-1),body=request.postDataJSON(),rows=kind=>server.entities[kind]||=[];
   if(name==='pensefit_activate_nutrition_plan'){rows('nutrition_plans').forEach(r=>{r.data.active=r.id===body.plan_id;r.revision++});return json(null)}
   if(name==='pensefit_transfer_shopping'){const list=rows('shopping_lists').find(r=>r.id===body.list_id),item=list.data.items.find(i=>i.id===body.item_id);if(!item.transferred){rows('pantry').push({id:crypto.randomUUID(),user_id:server.userId,date:new Date().toISOString().slice(0,10),revision:0,data:{name:item.name,quantity:item.quantity,unit:item.unit,category:item.category,expires:null}});item.transferred=true;list.revision++}return json(list.data)}
   if(name==='pensefit_consume_ingredients'){for(const i of body.ingredients){let remaining=i.quantity*(i.unit==='kg'||i.unit==='l'?1000:1);const available=rows('pantry').filter(r=>r.data.name.toLowerCase()===i.name.toLowerCase());for(const p of available){const factor=p.data.unit==='kg'||p.data.unit==='l'?1000:1,take=Math.min(remaining,p.data.quantity*factor);p.data.quantity-=take/factor;remaining-=take}if(remaining>0)return json({message:'Quantidade insuficiente'},400)}return json(null)}
   if(name==='pensefit_create_box'){const boxId=crypto.randomUUID();rows('boxes').push({id:boxId,owner_id:server.userId,name:body.box_name,join_code:'0123456789abcdefab'});rows('box_members').push({box_id:boxId,user_id:server.userId,alias:body.display_alias,role:'owner',share_training:false});return json(boxId)}
   if(name==='pensefit_join_box'){const box=rows('boxes').find(b=>b.join_code===body.code);if(!box)return json({message:'Inválido'},400);rows('box_members').push({box_id:box.id,user_id:server.userId,alias:body.display_alias,role:'athlete',share_training:false});return json(box.id)}
   if(name==='pensefit_box_coach'){const m=rows('box_members').find(m=>m.user_id===body.member&&m.box_id===body.box);m.role=body.enabled?'coach':'athlete';return json(null)}
   return json(null);
  }
  if(url.pathname.endsWith('/pensefit_accounts')){const single=request.headers()['accept']?.includes('object+json'),data=server.account?{state:server.account,revision:server.revision}:null;if(method==='GET')return json(single?data:data?[data]:[]);if(method==='POST'){server.account=request.postDataJSON().state;return json({state:server.account,revision:0})}if(method==='PATCH'){server.writes.push(request.postDataJSON());if(server.failedWrite)return json({code:'network_error',message:'Offline'},503);if(server.conflicted)return json(null);server.account=request.postDataJSON().state;server.revision++;return json(single?{revision:server.revision}:[{revision:server.revision}])}}
  if(url.pathname.includes('/rest/v1/pensefit_')){
   const kind=url.pathname.split('/').at(-1).replace('pensefit_','');let rows=server.entities[kind]||=[];const single=request.headers()['accept']?.includes('object+json');
   const matches=row=>[...url.searchParams].filter(([k,v])=>!['order','select','offset','limit'].includes(k)&&v.startsWith('eq.')).every(([k,v])=>String(row[k])===v.slice(3));
   if(method==='GET'){const filtered=rows.filter(matches);return json(single?filtered[0]||null:filtered)}
   if(method==='POST'){const raw=request.postDataJSON();const inserted=Array.isArray(raw)?raw:[raw];const created=inserted.map(row=>({id:crypto.randomUUID(),user_id:server.userId,date:new Date().toISOString().slice(0,10),revision:0,created_at:new Date().toISOString(),...row}));rows.push(...created);return json(single?created[0]:created)}
   if(method==='PATCH'){const found=rows.filter(matches);for(const row of found)Object.assign(row,request.postDataJSON(),{revision:(row.revision||0)+1});return json(single?found[0]||null:found)}
   if(method==='DELETE'){const removed=rows.filter(matches);server.entities[kind]=rows.filter(row=>!matches(row));if(kind==='sessions')server.entities.sets=(server.entities.sets||[]).filter(s=>!removed.some(r=>r.id===s.session_id));return json(removed.map(r=>({id:r.id}))) }
  }
  return json({message:'Unhandled test route'},404);
 });
 return server;
}
async function login(page,email='brunno@example.test',password='StrongPass123'){await page.locator('#loginEmail').fill(email);await page.locator('#loginPassword').fill(password);await page.locator('#loginForm [type="submit"]').click()}
async function signup(page){await page.locator('#authTabs [data-auth-view="signup"]').click();await page.locator('#signupName').fill('Brunno Teste');await page.locator('#signupEmail').fill('brunno@example.test');await page.locator('#signupBirthDate').fill('1998-06-10');await page.locator('#signupHeight').fill('187');await page.locator('#signupWeight').fill('75');await page.locator('#signupPassword').fill('StrongPass123');await page.locator('#signupPasswordConfirm').fill('StrongPass123')}
module.exports={backend,login,signup,session,id,otherId,fitness,baseProfile};

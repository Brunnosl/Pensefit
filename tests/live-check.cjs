// Executado manualmente com contas descartáveis criadas no projeto de teste.
// Este arquivo não faz parte da suíte de navegador e não envia e-mails.
const { createClient } = require('@supabase/supabase-js');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const configContext = { window: {} };
vm.runInNewContext(fs.readFileSync('dist/config.js','utf8'),configContext);
const config = configContext.window.PENSEFIT_CONFIG;
const fixtures = JSON.parse(fs.readFileSync('.live-fixtures.json','utf8')).slice(0,2);
const clients = fixtures.map(()=>createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}}));
const state = name => ({profile:{fullName:name,age:28,height:1.87,weight:75,calKg:36,proteinKg:1.8,fatKg:.8,waterKg:35,goal:'Ganho de massa'},done:{},meals:{},loads:[],progress:{}});
(async()=>{
 try{
  for(let i=0;i<clients.length;i++){
   const login=await clients[i].auth.signInWithPassword({email:fixtures[i].email,password:fixtures[i].password});
   assert.equal(login.error,null,login.error?.message);assert.equal(login.data.user.id,fixtures[i].id);
   const inserted=await clients[i].from('pensefit_accounts').insert({user_id:fixtures[i].id,state:state('Teste '+i)}).select('user_id,revision').single();
   assert.equal(inserted.error,null,inserted.error?.message);assert.equal(Number(inserted.data.revision),0);
  }
  const own=await clients[0].from('pensefit_accounts').select('user_id,state,revision');
  assert.equal(own.error,null);assert.equal(own.data.length,1);assert.equal(own.data[0].user_id,fixtures[0].id);
  const other=await clients[0].from('pensefit_accounts').select('user_id').eq('user_id',fixtures[1].id);assert.equal(other.error,null);assert.equal(other.data.length,0);
  const attack=await clients[0].from('pensefit_accounts').update({state:state('Ataque')}).eq('user_id',fixtures[1].id).select();assert.equal(attack.error,null);assert.equal(attack.data.length,0);
  const spoof=await clients[0].from('pensefit_accounts').insert({user_id:fixtures[1].id,state:state('Ataque')});assert.equal(spoof.error?.code,'42501');
  const updated=await clients[0].from('pensefit_accounts').update({state:state('Atualizado')}).eq('user_id',fixtures[0].id).eq('revision',0).select('revision').single();
  assert.equal(updated.error,null,updated.error?.message);assert.equal(Number(updated.data.revision),1);
  const stale=await clients[0].from('pensefit_accounts').update({state:state('Desatualizado')}).eq('user_id',fixtures[0].id).eq('revision',0).select();assert.equal(stale.error,null);assert.equal(stale.data.length,0);
  const anon=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});const publicRead=await anon.from('pensefit_accounts').select();assert.equal(publicRead.error?.code,'42501');
  console.log('OK no Supabase real: login, criação e atualização de perfil, revisão, bloqueio de acesso anônimo e isolamento entre duas contas.');
 }finally{for(const client of clients)await client.auth.signOut({scope:'local'});}
})().catch(error=>{console.error(error.message);process.exitCode=1});

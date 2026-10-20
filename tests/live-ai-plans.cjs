// Manual real-provider smoke tests with disposable accounts and synthetic context.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createClient}=require('@supabase/supabase-js');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('dist/config.js','utf8'),ctx);
const config=ctx.window.PENSEFIT_CONFIG,f=JSON.parse(fs.readFileSync('.live-fixtures.json','utf8'))[1];
(async()=>{
 const client=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(120000)})}});
 try{
  assert.ifError((await client.auth.signInWithPassword({email:f.email,password:f.password})).error);
  for(const params of [{action:'connection-test'},{action:'wod',minutes:10,level:'Iniciante',mode:'AMRAP',equipment:['Colchonete'],contextConsent:false},{action:'run-plan',consent:true,prompt:'Teste técnico com dados sintéticos. Proponha somente uma semana com duas sessões fáceis de caminhada e corrida de 15 minutos, nos dias 0 e 3, sem metas de velocidade. Inclua aquecimento e recuperação.'}]){
   if(process.env.PENSEFIT_AI_ACTION&&params.action!==process.env.PENSEFIT_AI_ACTION)continue;
   const result=await client.functions.invoke('pensefit-ai',{body:params});
   if(result.error){const detail=await result.error.context?.json();throw new Error(params.action+': '+(detail?.message||result.error.message))}
   if(params.action==='connection-test')assert.equal(result.data.connected,true);
   else if(params.action==='wod')assert.ok(result.data.proposal.movements.length>0);
   else assert.ok(result.data.proposal.weeks.length>0);
   console.log('OK: IA real '+params.action+', proposta validada sem aplicação automática.');
  }
 }finally{await client.auth.signOut({scope:'local'})}
})().catch(e=>{console.error(e.message);process.exitCode=1});

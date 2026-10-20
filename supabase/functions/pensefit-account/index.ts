import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {authenticate,body,reply,failure,headers} from '../_shared/runtime.ts';
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(req.method!=='POST')return reply(req,405,{message:'Use POST.'});
 try{
  const {user,token}=await authenticate(req),params=await body(req,2000);
  if(params.action!=='delete'||params.confirmation!=='EXCLUIR MINHA CONTA')return reply(req,400,{message:'Confirme a exclusão da sua própria conta.'});
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  async function filesBelow(prefix:string,depth=0):Promise<string[]>{
   if(!prefix.startsWith(user.id)||depth>30)throw new Error('Prefixo privado inválido.');
   let offset=0,found:string[]=[];
   for(;;){const listed=await admin.storage.from('pensefit-private').list(prefix,{limit:100,offset});if(listed.error)throw listed.error;for(const entry of listed.data){if(entry.name==='.'||entry.name==='..'||entry.name.includes('/'))throw new Error('Nome de arquivo inválido.');const path=prefix+'/'+entry.name;if(entry.id)found.push(path);else found.push(...await filesBelow(path,depth+1))}if(listed.data.length<100)break;offset+=100}
   return found;
  }
  const paths=await filesBelow(user.id);for(let i=0;i<paths.length;i+=100){const deleted=await admin.storage.from('pensefit-private').remove(paths.slice(i,i+100));if(deleted.error)throw deleted.error}
  // Revoga as sessões antes da exclusão. O ID vem exclusivamente de getUser(token).
  const revoked=await admin.auth.admin.signOut(token,'global');if(revoked.error)throw revoked.error;
  const removed=await admin.auth.admin.deleteUser(user.id);if(removed.error)throw removed.error;
  return reply(req,200,{deleted:true});
 }catch(error){return failure(req,error)}
});

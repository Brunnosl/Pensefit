import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
const allowed = () => ['http://localhost:3000','http://127.0.0.1:3000','https://pensefit-rose.vercel.app',...(Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(v => v.trim()).filter(Boolean)];
export function headers(req: Request) {
  const origin=req.headers.get('Origin');
  return { 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin', ...(origin&&allowed().includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS' };
}
export function reply(req:Request,status:number,data:unknown){return new Response(JSON.stringify(data),{status,headers:headers(req)})}
export async function authenticate(req:Request){
  const origin=req.headers.get('Origin');
  if(origin&&!allowed().includes(origin))throw Object.assign(new Error('Origem não autorizada.'),{status:403});
  const authorization=req.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))throw Object.assign(new Error('Entre na sua conta para continuar.'),{status:401});
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const token=authorization.slice(7);
  const {data,error}=await client.auth.getUser(token);
  if(error||!data.user)throw Object.assign(new Error('Sessão inválida ou expirada.'),{status:401});
  return{client,user:data.user,token};
}
export async function body(req:Request,max=30000){const raw=await req.text();if(raw.length>max)throw Object.assign(new Error('Solicitação muito grande.'),{status:413});try{return JSON.parse(raw)}catch{throw Object.assign(new Error('Solicitação inválida.'),{status:400})}}
export function failure(req:Request,error:any){const status=Number(error?.status)||500;return reply(req,status,{code:error?.code||'request_failed',message:status===500?'Não foi possível concluir agora. Tente novamente.':error.message})}
export async function fetchTimed(url:string,options:RequestInit={},timeout=45000){return fetch(url,{...options,signal:AbortSignal.timeout(timeout)})}

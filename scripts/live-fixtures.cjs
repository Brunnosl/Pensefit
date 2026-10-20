const crypto=require('node:crypto'),fs=require('node:fs');
const marker=crypto.randomUUID();
const fixtures=Array.from({length:4},()=>({id:crypto.randomUUID(),email:'pensefit-test-'+crypto.randomUUID()+'@example.invalid',password:'Pf'+crypto.randomBytes(20).toString('hex')+'9',marker}));
fs.writeFileSync('.live-fixtures.json',JSON.stringify(fixtures));
const quote=value=>"'"+String(value).replace(/'/g,"''")+"'";
const sql=fixtures.map(f=>`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,raw_app_meta_data,raw_user_meta_data,is_super_admin,created_at,updated_at) values('00000000-0000-0000-0000-000000000000',${quote(f.id)},'authenticated','authenticated',${quote(f.email)},extensions.crypt(${quote(f.password)},extensions.gen_salt('bf')),now(),'','','','','{"provider":"email","providers":["email"]}'::jsonb,${quote(JSON.stringify({pensefit_test:marker,pensefit_profile:{fullName:'Teste PenseFit',age:28,height:1.87,weight:75,birthDate:'1998-06-10',goal:'Ganho de massa'}}))}::jsonb,false,now(),now());\ninsert into auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at) values(${quote(f.id)},${quote(f.id)},jsonb_build_object('sub',${quote(f.id)},'email',${quote(f.email)},'email_verified',true),'email',now(),now(),now());`).join('\n');
fs.writeFileSync('.live-fixtures.sql','begin;\n'+sql+'\ncommit;\nselect 4 as temporary_users_created;');
console.log('Fixtures descartáveis preparadas.');

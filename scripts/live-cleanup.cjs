const fs=require('node:fs');const fixtures=JSON.parse(fs.readFileSync('.live-fixtures.json','utf8'));const ids=fixtures.map(f=>"'"+f.id+"'").join(',');const marker=fixtures[0].marker;
fs.writeFileSync('.live-cleanup.sql',`begin; delete from auth.sessions where user_id in (${ids}); delete from auth.users where id in (${ids}) and raw_user_meta_data->>'pensefit_test'='${marker}'; commit; select jsonb_build_object('temporary_users_remaining',(select count(*) from auth.users where id in (${ids}))) as cleanup;`);
console.log('Limpeza restrita aos IDs e ao marcador de teste preparada.');

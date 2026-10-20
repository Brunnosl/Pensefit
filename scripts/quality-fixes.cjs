const fs=require('node:fs');
let s=fs.readFileSync('src/platform/wod.mjs','utf8');
s=s.replace('id="wodTimerPhase">Pronto para começar','id="wodTimerPhase">${esc(wod.timer.state().phase)}').replace('id="wodTimerDisplay">${time(wod.timer.config.duration)}','id="wodTimerDisplay">${time(Math.max(0,wod.timer.state().remaining))}');
s=s.replace('signature:sessionSignature(d),variant:d.variant,scoreType:d.scoreType','signature:sessionSignature({...d,timerConfig:wod.timer.config})+JSON.stringify(wod.timer.config),variant:d.variant,scoreType:[\'AMRAP\',\'EMOM\',\'Tabata\',\'Intervalos\'].includes(wod.timer.config.mode)?\'reps\':\'time\'');
fs.writeFileSync('src/platform/wod.mjs',s);
s=fs.readFileSync('tests/platform.spec.cjs','utf8');s=s.replace("await action(page,'photo-delete');await submit(page);expect(server.entities.photos).toHaveLength(0);", "await action(page,'photo-delete');await submit(page);await expect.poll(()=>server.entities.photos.length).toBe(0);");fs.writeFileSync('tests/platform.spec.cjs',s);
s=fs.readFileSync('src/platform/nutri.mjs','utf8');s=s.replace("field('Nome da refeição',`plan-meal-name-${index}`,{value:m.name||'',required:true})", "field('Nome da refeição',`plan-meal-name-${index}`,{value:m.name||''})");
s=s.replace("[...form.querySelectorAll('[data-meal-row]')].map(element=>", "[...form.querySelectorAll('[data-meal-row]')].filter(element=>{const i=element.dataset.mealRow;return ['name','time','ingredients','notes'].some(k=>(values['plan-meal-'+k+'-'+i]||'').trim())}).map(element=>");
fs.writeFileSync('src/platform/nutri.mjs',s);

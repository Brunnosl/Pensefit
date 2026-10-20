export const MODALITIES = ['Musculação','CrossFit','Calistenia','Corrida','Treinos em casa','Treinamento híbrido'];
export const UNITS = ['g','kg','ml','l','un'];
export const MEAL_STATES = ['conforme','alterada','nao-realizada','pendente'];
export const TIMER_MODES = ['AMRAP','EMOM','For Time','Tabata','Intervalos','Stopwatch','Countdown'];
export const dateKey = (date=new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const uid = () => crypto.randomUUID();
export function finite(value,min=0,max=1e6){const n=Number(value);if(value===''||value===null||!Number.isFinite(n)||n<min||n>max)throw new Error(`Informe um valor entre ${min} e ${max}.`);return n}
export function integer(value,min=0,max=10000){const n=finite(value,min,max);if(!Number.isInteger(n))throw new Error('Informe um número inteiro.');return n}
export function text(value,max=1000,min=0){const s=String(value??'').trim();if(s.length<min||s.length>max)throw new Error(`O texto precisa ter de ${min} a ${max} caracteres.`);return s}
export function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Informe uma data válida.');const d=new Date(value+'T12:00:00');if(dateKey(d)!==value)throw new Error('Informe uma data válida.');return value}
export const fold = value => String(value??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
export const sameFood=(a,b)=>fold(a)===fold(b);
export function baseQuantity(amount,unit){const n=finite(amount);if(unit==='kg')return{amount:n*1000,unit:'g'};if(unit==='l')return{amount:n*1000,unit:'ml'};if(!UNITS.includes(unit))throw new Error('Unidade inválida.');return{amount:n,unit}}
export function shortage(ingredients,pantry,today=dateKey()){
  const available=new Map();
  for(const row of pantry){const p=row.data??row;if(p.expires&&p.expires<today)continue;const q=baseQuantity(p.quantity,p.unit),key=fold(p.name)+'|'+q.unit;available.set(key,(available.get(key)||0)+q.amount)}
  const required=new Map();
  for(const ingredient of ingredients){if(ingredient.quantity===null||ingredient.quantity===undefined||ingredient.quantity===''||!UNITS.includes(ingredient.unit)){required.set(fold(ingredient.name)+'|unknown',{...ingredient,missing:null,available:null});continue}const q=baseQuantity(ingredient.quantity,ingredient.unit),key=fold(ingredient.name)+'|'+q.unit;const previous=required.get(key);required.set(key,{...ingredient,quantity:(previous?.quantity||0)+q.amount,unit:q.unit})}
  return [...required.entries()].map(([key,p])=>p.missing===null?p:{...p,available:available.get(key)||0,missing:Math.max(0,p.quantity-(available.get(key)||0))});
}
export function mergeShopping(existing,missing){
 const result=structuredClone(existing);
 for(const i of missing){if(i.missing===null)continue;if(i.missing<=0)continue;const match=result.find(x=>sameFood(x.name,i.name)&&x.unit===i.unit&&!x.bought);if(match)match.quantity=Math.max(match.quantity,i.missing);else result.push({id:uid(),name:i.name,quantity:i.missing,unit:i.unit,category:i.category||'Outros',priority:'normal',price:null,bought:false,transferred:false})}
 return result;
}
export function nutritionFor(food,grams){const ratio=finite(grams,0,10000)/100;return Object.fromEntries(['calories','protein','carbs','fat','fiber'].map(k=>[k,food[k]===null||food[k]===undefined?null:Math.round(finite(food[k])*ratio*10)/10]))}
export function sumNutrition(items){const values={calories:0,protein:0,carbs:0,fat:0,fiber:0};for(const item of items){const n=item.nutrition??item;for(const k of Object.keys(values))values[k]+=Number(n[k])||0}return values}
export function sessionVolume(sets){return sets.reduce((sum,s)=>sum+(s.data??s).weight*(s.data??s).reps,0)}
export function estimate1RM(weight,reps){finite(weight,0,1000);integer(reps,1,20);return reps===1?weight:Math.round(weight*(1+reps/30)*10)/10}
export function estimateEnergy({weight,height,age,sex,activity=1.2,adjustment=0}){finite(weight,30,250);finite(height,.5,2.5);integer(age,18,120);finite(activity,1,2.5);finite(adjustment,-1000,1000);if(!['Masculino','Feminino'].includes(sex))throw new Error('Escolha a versão da equação ou mantenha suas metas manuais.');const basal=10*weight+6.25*(height*100)-5*age+(sex==='Masculino'?5:-161);return{basal:Math.round(basal),daily:Math.round(basal*activity),target:Math.round(basal*activity+adjustment),bmi:Math.round(weight/(height*height)*10)/10}}
export function timerState(config,elapsed){
 const mode=config.mode,duration=config.duration??600,work=config.work??20,rest=config.rest??10,rounds=config.rounds??8;
 const total=['Tabata','Intervalos'].includes(mode)?(work+rest)*rounds:duration;
 if(elapsed<0)return{phase:'Prepare-se',remaining:Math.ceil(-elapsed),round:0,finished:false};
 if(['Stopwatch','For Time'].includes(mode))return{phase:'Em andamento',remaining:Math.floor(elapsed),round:1,finished:mode==='For Time'&&duration>0&&elapsed>=duration};
 if(elapsed>=total)return{phase:'Concluído',remaining:0,round:rounds,finished:true};
 if(['Tabata','Intervalos'].includes(mode)){const position=elapsed%(work+rest),working=position<work;return{phase:working?'Trabalho':'Descanso',remaining:Math.ceil((working?work:work+rest)-position),round:Math.floor(elapsed/(work+rest))+1,finished:false}}
 if(mode==='EMOM')return{phase:'Minuto '+(Math.floor(elapsed/60)+1),remaining:Math.ceil(60-elapsed%60),round:Math.floor(elapsed/60)+1,finished:false};
 return{phase:mode,remaining:Math.max(0,Math.ceil(total-elapsed)),round:1,finished:false};
}
export function rankingScore(result){const d=result.data??result;if(d.scoreType==='time')return d.seconds+(d.penaltySeconds||0);if(d.scoreType==='reps')return d.rounds*(d.repsPerRound||0)+(d.extraReps||0);return d.weight||0}
export function comparable(a,b){return a.wodKey===b.wodKey&&a.variant===b.variant&&a.signature===b.signature&&a.scoreType===b.scoreType}
export function streak(dates,today=dateKey()){const all=new Set(dates);let count=0,d=new Date(today+'T12:00:00');if(!all.has(dateKey(d)))d.setDate(d.getDate()-1);while(all.has(dateKey(d))){count++;d.setDate(d.getDate()-1)}return count}
export function achievements(sessions,results,sets){const completed=sessions.filter(s=>s.data.status==='completed').length+results.length;const xp=completed*100+sets.length*10;return{xp,level:1+Math.floor(xp/500),badges:[completed>=1&&'Primeiro treino',completed>=10&&'10 treinos realizados',completed>=50&&'50 treinos realizados',sets.length>=100&&'100 séries registradas'].filter(Boolean)}}
export function validateRecord(kind,data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Registro inválido.');
 const d=structuredClone(data);
 if(kind==='pantry'){d.name=text(d.name,120,1);d.quantity=finite(d.quantity,0,100000);baseQuantity(d.quantity,d.unit);if(d.expires)validDate(d.expires)}
 if(kind==='hydration')d.ml=integer(d.ml,1,10000);
 if(kind==='sets'){d.weight=finite(d.weight,0,1000);d.reps=integer(d.reps,1,1000);d.rir=finite(d.rir,0,10);d.exercise=text(d.exercise,150,1)}
 if(kind==='recovery'){d.sleep=finite(d.sleep,0,24);for(const k of ['quality','energy','fatigue','soreness','readiness'])d[k]=integer(d[k],1,5)}
 if(kind==='measurements'){d.weight=finite(d.weight,30,250);for(const k of ['waist','arm','chest','abdomen','hip','thigh','calf'])if(d[k]!==null&&d[k]!==undefined&&d[k]!=='')d[k]=finite(d[k],1,250)}
 if(kind==='meal_logs'){if(!MEAL_STATES.includes(d.status))throw new Error('Situação da refeição inválida.');for(const k of ['calories','protein','carbs','fat','fiber'])d[k]=finite(d[k]??0,0,50000)}
 if(kind==='foods'){d.name=text(d.name,120,1);for(const k of ['calories','protein','carbs','fat'])d[k]=finite(d[k],0,2000);if(d.fiber!==null)d.fiber=finite(d.fiber??0,0,1000);d.source=text(d.source||'Informado pelo usuário',300,1)}
 if(kind==='wod_results'){if(!['RX','Scaled','Beginner'].includes(d.variant))throw new Error('Versão inválida.');d.seconds=finite(d.seconds,0,86400);d.rounds=integer(d.rounds,0,10000);d.extraReps=integer(d.extraReps,0,100000);d.penaltySeconds=finite(d.penaltySeconds??0,0,3600)}
 if(kind==='pr_records'){d.weight=finite(d.weight,0,1000);d.reps=integer(d.reps,1,20)}
 return d;
}
export class ReliableTimer{
 constructor(config){this.config=config;this.startedAt=null;this.pausedElapsed=0;this.preparation=3;this.running=false}
 start(now=Date.now()){if(this.running)return;this.startedAt=now;this.running=true}
 elapsed(now=Date.now()){return this.pausedElapsed+(this.running?(now-this.startedAt)/1000:0)-this.preparation}
 pause(now=Date.now()){if(this.running)this.pausedElapsed+=(now-this.startedAt)/1000;this.running=false;this.startedAt=null}
 reset(){this.startedAt=null;this.pausedElapsed=0;this.running=false}
 add(seconds){this.config.duration+=seconds}
 state(now=Date.now()){if(!this.running&&this.pausedElapsed===0){const mode=this.config.mode,total=['Tabata','Intervalos'].includes(mode)?(this.config.work+this.config.rest)*this.config.rounds:this.config.duration;return{phase:'Pronto para começar',remaining:['Stopwatch','For Time'].includes(mode)?0:total,round:0,finished:false}}return timerState(this.config,this.elapsed(now))}
}

import {finite,text,validDate} from './domain.mjs';
import {parseRunGPX} from './run-domain.mjs';

export function importedActivity(raw,source){
 if(!raw||typeof raw!=='object')throw new Error('Atividade inválida.');
 return {date:validDate(raw.date),data:{externalId:text(raw.externalId,180,1),name:text(raw.name,180,1),distanceMeters:finite(raw.distanceMeters,0,1e7),durationSeconds:finite(raw.durationSeconds,0,864000),source:text(source,120,1),importedAt:new Date().toISOString(),mode:'manual'}};
}

export function parseActivityGPX(content){
 const parsed=parseRunGPX(content);
 if(!parsed.date||!Number.isFinite(parsed.durationSeconds)||parsed.durationSeconds<=0||parsed.points.some(p=>!Number.isFinite(p.timestamp)))throw new Error('O GPX precisa de data e horários válidos para importar uma atividade. Use Percursos no Pense Run para arquivos sem horários.');
 return [{externalId:'gpx-'+parsed.points[0].timestamp+'-'+Math.round(parsed.distanceMeters),name:parsed.name,date:parsed.date,distanceMeters:parsed.distanceMeters,durationSeconds:parsed.durationSeconds}];
}

import {esc} from './ui.mjs';

export function exercisePreview(exercise){
 const frame=exercise?.media?.frames?.[0];
 if(!frame)return '<p class="pf-subtitle">Exercício personalizado: consulte as orientações do seu plano.</p>';
 return `<button type="button" class="exercise-preview" data-action="exercise-detail" data-id="${esc(exercise.id)}" aria-label="Ver execução de ${esc(exercise.name)}"><img src="${esc(frame.src)}" alt="${esc(exercise.name)} — ${esc(frame.label)}" loading="lazy" decoding="async" width="320" height="240" data-exercise-image><span>Ver execução</span></button>`;
}

export function exerciseGallery(exercise){
 const media=exercise.media;
 if(!media?.frames?.length)return '<p>Este exercício ainda não tem demonstração cadastrada.</p>';
 return `<section class="exercise-demonstration" aria-label="Demonstração de ${esc(exercise.name)}"><p class="pf-subtitle">${media.schematic?'Sequência ilustrada':media.mixed?'Fotos e etapas ilustradas':'Posições de referência'} · ${media.frames.length===1?'sustentação':media.frames.length+' etapas'}</p><div class="exercise-frames">${media.frames.map((frame,index)=>`<figure><img src="${esc(frame.src)}" alt="${esc(exercise.name)} — ${esc(frame.label)}" width="320" height="310" decoding="async" data-exercise-image><figcaption><b>${index+1}</b> ${esc(frame.label)}</figcaption></figure>`).join('')}</div><small class="media-credit">${esc(media.credit)} <a class="source-link" href="${esc(media.reference)}" target="_blank" rel="noopener noreferrer">Fonte da demonstração</a></small></section>`;
}

if(typeof document!=='undefined')document.addEventListener('error',event=>{const image=event.target;if(!image.matches?.('[data-exercise-image]'))return;image.hidden=true;const message=document.createElement('p');message.className='exercise-image-error';message.textContent='Não foi possível carregar esta imagem. Recarregue a página para tentar novamente.';image.after(message)},true);

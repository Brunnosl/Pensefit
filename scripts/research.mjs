const response=await fetch('https://nepa.unicamp.br/arquivo/uploads/taco-2/');
const content=await response.text();
console.log([...content.matchAll(/href=["']([^"']+\.pdf[^"']*)/g)].map(match=>match[1]).join('\n'));

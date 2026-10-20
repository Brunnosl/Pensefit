const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
(async()=>{
 const {exercises}=await require('./exercise-inventory.cjs')();
 const mediaFiles=new Set();for(const exercise of exercises){if(!exercise.media?.frames?.length)throw new Error('Exercício sem demonstração: '+exercise.name);for(const frame of exercise.media.frames){if(!/^assets\/exercises\/[a-zA-Z0-9_.-]+\.(jpg|svg)$/.test(frame.src)||!fs.existsSync(path.join('dist',frame.src)))throw new Error('Imagem inválida ou ausente: '+frame.src);mediaFiles.add(frame.src)}}
 fs.writeFileSync('dist/exercise-media-files.js','self.PENSEFIT_EXERCISE_FILES='+JSON.stringify([...mediaFiles].sort())+';\n');
 await esbuild.build({entryPoints:['src/supabase-client.js'],bundle:true,minify:true,format:'iife',outfile:'dist/vendor/supabase.js'});
 await esbuild.build({entryPoints:['src/platform/app.mjs'],bundle:true,minify:true,format:'iife',outfile:'dist/platform.js',target:['es2022']});
 for(const weight of [400,600,800]){const name=`inter-latin-${weight}-normal.woff2`;fs.copyFileSync(path.join('node_modules/@fontsource/inter/files',name),path.join('dist/assets',name))}
 fs.copyFileSync('node_modules/@fontsource/inter/LICENSE','dist/assets/Inter-LICENSE.txt');
 fs.copyFileSync('node_modules/leaflet/dist/leaflet.css','dist/leaflet.css');fs.copyFileSync('node_modules/leaflet/LICENSE','dist/assets/Leaflet-LICENSE.txt');require('./pwa-icons.cjs');
 console.log('SDK, plataforma e fontes locais gerados.');
})().catch(error=>{console.error(error.message);process.exitCode=1});

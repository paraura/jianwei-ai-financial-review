import fs from 'node:fs';
const core=fs.readFileSync('src/core.js','utf8');
let html=fs.readFileSync('src/index.html','utf8').replace('/* CORE */',core.replaceAll('export ',''));
const server=fs.readFileSync('src/server.js','utf8');
fs.mkdirSync('worker',{recursive:true});
fs.writeFileSync('worker/index.js',core+'\nconst HTML='+JSON.stringify(html)+';\n'+server);

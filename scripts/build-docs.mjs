import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const source = process.env.DOCS_SRC_DIR ?? 'docs';
const output = process.env.DOCS_OUT_DIR ?? 'docs/site';
const files = fs.readdirSync(source).filter(name => name.endsWith('.md')).sort();
const toc = [], anchors = new Set(), pictures = new Set();
const sections = files.map(file => {
  const md = fs.readFileSync(path.join(source,file),'utf8');
  let html = marked.parse(md,{async:false});
  for (const [,name] of html.matchAll(/src="screenshots\/([^"/]+\.png)"/g)) pictures.add(name);
  html = html.replace(/src="screenshots\/([^"/]+\.png)"/g, (original, name) => {
    const file = path.join(source,'screenshots',name);
    if (!fs.existsSync(file)) return original;
    return 'data-shot="'+name+'" src="data:image/png;base64,'+fs.readFileSync(file,'base64')+'"';
  });
  html = html.replace(/<p>(<img [^>]+>)<\/p>\s*<p><em>([^<]+)<\/em><\/p>/g,
    '<figure><button class="zoom" type="button" aria-label="Powiększ zrzut ekranu">$1</button><figcaption>$2</figcaption></figure>');
  return '<section class="chapter">'+html.replace(/<h([12])>(.*?)<\/h\1>/g, (_,level,title) => {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'sekcja';
    let id=base, n=2;
    while (anchors.has(id)) id=base+'-'+n++;
    anchors.add(id);
    toc.push('<a class="lvl'+level+'" href="#'+id+'">'+title+'</a>');
    return '<h'+level+' id="'+id+'">'+title+'</h'+level+'>';
  })+'</section>';
});
fs.mkdirSync(path.join(output,'screenshots'),{recursive:true});
let copied=0;
for(const name of pictures) {
  const from=path.join(source,'screenshots',name);
  if(fs.existsSync(from)) {fs.copyFileSync(from,path.join(output,'screenshots',name)); copied++;}
  else console.warn('warn: missing docs/screenshots/'+name+' - run npm run docs:screenshots');
}
const template=fs.readFileSync(new URL('./docs-template.html',import.meta.url),'utf8');
fs.writeFileSync(path.join(output,'index.html'),template.replace('{{TITLE}}','Piccart · Podręcznik').replace('{{TOC}}',()=>toc.join('\n')).replace('{{CONTENT}}',()=>sections.join('\n')));
console.log('docs built → '+path.join(output,'index.html')+' ('+files.length+' sections, '+copied+' screenshots)');

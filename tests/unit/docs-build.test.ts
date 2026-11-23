import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'piccart-guide-'));
afterAll(()=>fs.rmSync(temp,{recursive:true,force:true}));
function build(source:string,output:string) {
  execFileSync(process.execPath,['scripts/build-docs.mjs'],{env:{...process.env,DOCS_SRC_DIR:source,DOCS_OUT_DIR:output}});
  return fs.readFileSync(path.join(output,'index.html'),'utf8');
}
test('U-DOCS-01 guide has linked sections and unique anchors',()=>{
  const html=build('docs',path.join(temp,'guide'));
  expect(html).toContain('Piccart');
  const images = Array.from(html.matchAll(/data-shot="([^"]+)" src="data:image\/png;base64,([^"]+)"/g));
  expect(new Set(images.map(image => image[1])).size).toBe(14);
  for (const [,name,data] of images) {
    expect(Buffer.from(data,'base64').equals(fs.readFileSync(path.join('docs/screenshots',name)))).toBe(true);
  }
  const links=Array.from(html.matchAll(/href="#([^"]+)"/g),m=>m[1]);
  expect(links.length).toBeGreaterThanOrEqual(10);
  for(const link of links) expect(html.split('id="'+link+'"').length).toBe(2);
});
test('U-DOCS-02 missing screenshot preserves readable guide',()=>{
  const source=path.join(temp,'source'); fs.mkdirSync(source);
  fs.writeFileSync(path.join(source,'01-test.md'),'# Pomoc\n\n![Przykład](screenshots/missing.png)');
  const html=build(source,path.join(temp,'missing'));
  expect(html).toContain('src="screenshots/missing.png"'); expect(html).toContain('</html>');
});

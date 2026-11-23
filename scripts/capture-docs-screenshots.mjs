import {chromium,expect} from '@playwright/test';
import {browserChannel} from './browser-channel.mjs';
import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const baseURL='http://localhost:3311';
const env={...process.env,PORT:'3311',DATABASE_PATH:'.data/docs.db',ADMIN_PASSWORD:'Docs-Admin-1',NEXT_TELEMETRY_DISABLED:'1'};
if(await fetch(baseURL).then(()=>true,()=>false)) throw new Error('Port 3311 jest zajęty.');
for(const suffix of ['','-wal','-shm']) fs.rmSync(env.DATABASE_PATH+suffix,{force:true});
execFileSync(process.execPath,['scripts/seed-demo.mjs'],{env,stdio:'inherit'});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev'],{env,stdio:'inherit',windowsHide:true});
let browser;
try {
  let ready=false;
  for(let i=0;i<120;i++){
    if(server.exitCode!==null) throw new Error('Serwer zakończył pracę.');
    if(await fetch(baseURL).then(r=>r.ok,()=>false)){ready=true;break;}
    await delay(500);
  }
  if(!ready) throw new Error('Serwer nie odpowiada.');
  browser=await chromium.launch({channel:browserChannel()});
  async function pageFor(email,password){
    const context=await browser.newContext({baseURL,viewport:{width:1280,height:800}});
    const p=await context.newPage();
    if(email){
      await p.goto('/login'); await p.getByTestId('login-email').fill(email);
      await p.getByTestId('login-password').fill(password); await p.getByTestId('login-submit').click();
      await expect(p.getByTestId('nav-username')).toBeVisible();
    }
    return p;
  }
  fs.mkdirSync('docs/screenshots',{recursive:true});
  const shopper=await pageFor('shopper@piccart.test',env.DEMO_USER_PASSWORD??'Shopper-Docs-1'), guest=await pageFor(), admin=await pageFor('admin@piccart.local',env.ADMIN_PASSWORD);
  async function shot(page,name,url,marker){
    if(url) await page.goto(url,{waitUntil:'domcontentloaded'});
    await expect(page.getByTestId(marker).first()).toBeVisible();
    await page.waitForLoadState('networkidle',{timeout:5000}).catch(()=>{});
    await page.locator('img').evaluateAll(async images => {
      await Promise.all(images.map(async image => {
        image.loading = 'eager';
        await image.decode();
        if (!image.naturalWidth) throw new Error('Brak obrazu: ' + image.src);
      }));
    });
    await page.screenshot({path:'docs/screenshots/'+name+'.png',animations:'disabled'});
  }
  await shot(shopper,'catalog','/','product-grid'); await shopper.setViewportSize({width:390,height:844});
  await shot(shopper,'catalog-mobile',null,'product-grid'); await shopper.setViewportSize({width:1280,height:800});
  await shot(shopper,'product-detail','/products/1','product-title');
  await shopper.getByTestId('photo-thumb').nth(1).click(); await shot(shopper,'product-detail-gallery',null,'photo-main');
  await shot(guest,'register','/register','register-submit'); await shot(guest,'login','/login','login-submit');
  for(const [productId,qty] of [[1,2],[5,1]]){
    const response=await shopper.request.post('/api/cart/items',{data:{productId,qty}});
    if(!response.ok()) throw new Error(await response.text());
  }
  await shot(shopper,'cart','/cart','cart-subtotal'); await shot(shopper,'checkout','/checkout','checkout-summary');
  const response=await shopper.request.post('/api/orders',{data:{fullName:'Jan Nowak',addressLine1:'Lipowa 12',addressLine2:'',city:'Warszawa',postalCode:'00-001',country:'Polska'}});
  if(!response.ok()) throw new Error(await response.text());
  const url='/orders/'+(await response.json()).order.id;
  await shot(shopper,'order-placed',url+'?placed=1','order-placed-banner'); await shot(shopper,'orders','/orders','order-row');
  await shot(shopper,'order-detail',url,'order-detail'); await shot(admin,'admin-products','/admin/products','admin-table');
  await shot(admin,'admin-product-new','/admin/products/new','admin-save'); await shot(admin,'admin-product-edit','/admin/products/1','admin-delete');
  console.log('Zapisano 14 zrzutów ekranu.');
} finally {
  await browser?.close();
  server.kill();
}

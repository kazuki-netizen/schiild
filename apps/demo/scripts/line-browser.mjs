import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {RESET_KEY,RESET_VERSION} from '../src/browser-reset.ts';
const origin=process.env.DEMO_URL||'http://localhost:8085',browser=await chromium.launch({headless:true,...(process.env.DEMO_BROWSER?{executablePath:process.env.DEMO_BROWSER}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[],calls=[];let signed=false,deleting=false,exists=false,intent='login';
 page.on('pageerror',error=>errors.push(error.message));
 const account={username:'line_browser',name:'LINE Browser',since:'2026-10-15',lineLinked:true,hasPassword:false,canDelete:true,ateliers:[],custody:[]};
 await context.addInitScript(({key,version})=>{localStorage.setItem(key,version);},{key:RESET_KEY,version:RESET_VERSION});
 await context.route('**/.netlify/functions/atelier',async route=>{
  const body=route.request().postDataJSON();calls.push(body);let result;
  if(body.action==='account.line.config')result={enabled:true};
  else if(body.action==='account.google.start')result={enabled:false};
  else if(body.action==='account.me')result={account:signed?account:null};
  else if(body.action==='area')result={global:{pixels:0,days:0},atelier:{pixels:0,days:0},ateliers:[]};
  else if(body.action==='push.config')result={enabled:false,publicKey:null,preferences:{atelierReady:true,globalReady:true,post:true}};
  else if(body.action==='account.line.start'){intent=body.intent;deleting=intent==='delete';if(deleting)assert.equal(body.confirmUsername,account.username);const state=(deleting?'b':'a').repeat(64);result={enabled:true,intent:body.intent,state,url:'https://access.line.me/oauth2/v2.1/authorize?state='+state};}
  else if(body.action==='account.line'){assert.equal(body.state,(deleting?'b':'a').repeat(64));assert.equal(body.code,'browser-test-code');if(!deleting&&intent==='login'&&!exists){await route.fulfill({status:401,json:{error:'line_not_registered'}});return;}if(!deleting&&intent==='register'&&exists){await route.fulfill({status:409,json:{error:'line_registered'}});return;}exists=!deleting;signed=exists;result=deleting?{deleted:true}:{token:'c'.repeat(64),account};}
  else throw Error('Unexpected browser action '+body.action);
  await route.fulfill({json:result});
 });
 await context.route('https://access.line.me/**',async route=>{const state=new URL(route.request().url()).searchParams.get('state');await route.fulfill({contentType:'text/html',body:'<a href="'+origin+'/?auth=line&code=browser-test-code&state='+state+'">Return from LINE</a>'});});
 await page.goto(origin);await page.getByRole('button',{name:'Schiild',exact:true}).click();await page.getByTestId('auth-page').waitFor();
 const labels={ja:'LINEでログイン',en:'Sign in with LINE',ko:'LINE으로 로그인',fr:'Connexion avec LINE',nl:'Inloggen met LINE',es:'Iniciar sesión con LINE',it:'Accedi con LINE'};
 for(const [language,label] of Object.entries(labels)){await page.locator('.language-select select').selectOption(language);await page.getByRole('link',{name:label,exact:true}).waitFor();for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}}
 await page.locator('.language-select select').selectOption('ja');await page.getByRole('link',{name:'LINEで新規登録',exact:true}).click();await page.getByRole('link',{name:'Return from LINE'}).click();await page.getByTestId('profile-page').waitFor();assert(!page.url().includes('code='));assert(!page.url().includes('state='));assert.equal(await page.evaluate(()=>sessionStorage.getItem('schiild.line.pending')),null);await page.getByText('LINE連携済み',{exact:true}).waitFor();
 await page.getByRole('button',{name:'設定',exact:true}).click();await page.getByRole('button',{name:'アカウントを削除する',exact:true}).click();await page.getByTestId('delete-account').waitFor();assert.equal(await page.locator('input[type=password]').count(),0);await page.getByLabel('削除するアカウントIDを入力',{exact:true}).fill(account.username);await page.getByRole('button',{name:'削除内容を確認する',exact:true}).click();await page.getByRole('button',{name:'アカウントを完全に削除する',exact:true}).click();await page.getByRole('link',{name:'Return from LINE'}).click();await page.getByTestId('auth-page').waitFor();assert.equal(await page.getByTestId('profile-page').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('schiild.account.session.v2')),null);
 await page.getByRole('link',{name:labels.ja,exact:true}).click();await page.getByRole('link',{name:'Return from LINE'}).click();await page.getByText('このLINEアカウントは登録されていません。新規登録してください。',{exact:true}).waitFor();assert.equal(await page.getByTestId('profile-page').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('schiild.account.session.v2')),null);await page.getByRole('link',{name:'LINEで新規登録',exact:true}).waitFor();
 const before=calls.filter(body=>body.action==='account.line').length;await page.goto(origin+'/?auth=line&code=untrusted&state='+'f'.repeat(64));await page.getByTestId('auth-page').waitFor();assert(!page.url().includes('code='));assert.equal(calls.filter(body=>body.action==='account.line').length,before);assert.deepEqual(errors,[]);
 console.log('LINE seven-language login link, 320/390/768px layouts, OAuth return/session restore, URL scrubbing, cancellation/state rejection and passwordless deletion via LINE passed. All API/provider calls intercepted; no public data changed.');
}finally{await browser.close();}

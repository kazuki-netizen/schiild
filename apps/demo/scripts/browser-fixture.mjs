// Test-only legacy sample data. The published app always starts empty.
import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {partition,random,render,synthetic,shuffle} from '../src/engine.ts';
import {RESET_KEY,RESET_VERSION} from '../src/browser-reset.ts';
export async function seedDemo(context){
 const day=new Date().toISOString().slice(0,10),seed=4100,works=await Promise.all(Array.from({length:30},async(_,n)=>{const artSeed=4100+n*137,rects=partition(12,random(artSeed)),count=7+n%6,pixels=render(rects,rects.map((_,k)=>k<count?synthetic(artSeed+k*33):null),artSeed),image='data:image/png;base64,'+(await sharp(Buffer.from(pixels.data),{raw:{width:128,height:128,channels:4}}).png().toBuffer()).toString('base64');return {day:new Date(Date.parse(day+'T00:00:00Z')-(n+1)*86400000).toISOString().slice(0,10),image,rects,order:shuffle(rects.map(r=>r.slot),random(artSeed)),count,index:30-n,custody:n%4?'other':'self',opened:true};}));
 await context.addInitScript(({day,seed,works,resetKey,resetVersion})=>{if(localStorage.getItem('__schiild_fixture_ready'))return;localStorage.setItem('__schiild_fixture_ready','1');localStorage.setItem(resetKey,resetVersion);localStorage.setItem('schiild.demo.ateliers.v3',JSON.stringify({version:3,device:crypto.randomUUID(),selected:'ASADEMO1',ateliers:[{code:'ASADEMO1',name:'あさ',capacity:12,creator:null,activeFrom:day,state:{version:1,day,seed,rects:works[0].rects,photo:null,count:2,works,winner:'self',ready:null}}]}));},{day,seed,works,resetKey:RESET_KEY,resetVersion:RESET_VERSION});
}
export const fixtureChromium={async launch(options){const browser=await chromium.launch(options),create=browser.newContext.bind(browser);browser.newContext=async options=>{const context=await create(options);await seedDemo(context);return context;};return browser;}};
// Explicitly exercise GLOBAL selection where existing end-to-end scenarios need it.
export async function optInGlobal(page){
 await page.locator('.reuse-photo').waitFor();const checkbox=page.locator('.global-target input');
 if(await checkbox.isEnabled()){await checkbox.check();await page.locator('.daily-posts>.button:not(.secondary)').click();await page.getByRole('dialog').locator('.button').first().click();await page.waitForFunction(()=>document.querySelector('.global-target input')?.disabled===true&&document.querySelector('.reuse-results'));}
}

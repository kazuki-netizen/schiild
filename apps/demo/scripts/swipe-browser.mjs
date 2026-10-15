import {fixtureChromium as chromium} from './browser-fixture.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {shiftMonth} from '../src/calendar.ts';
const origin='http://localhost:8085';
const browser=await chromium.launch({headless:true,...(process.env.DEMO_BROWSER?{executablePath:process.env.DEMO_BROWSER}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const nav=page.locator('.nav'),calendar=page.getByTestId('archive-calendar');
const active=()=>nav.locator('.active').innerText();
const month=()=>calendar.getAttribute('data-month');
const cdp=await context.newCDPSession(page);
async function swipe(selector,dx,dy=0,cancel=false){
 const element=page.locator(selector).first();await element.scrollIntoViewIfNeeded();
 const box=await element.boundingBox(),x=dx<0?Math.min(310,box.x+box.width-25):Math.max(80,box.x+25),y=box.y+Math.min(40,box.height/2);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,'id':31}]});
 for(let n=1;n<=6;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*n/6,y:y+dy*n/6,'id':31}]});await page.waitForTimeout(20);}
 await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await page.waitForTimeout(450);
}
try{
 await mkdir('test-results',{recursive:true});await page.goto(origin);await page.getByTestId('today-board').waitFor();
 // Keep the fixture deterministic across month boundaries, including the first day of a month.
 await page.evaluate(()=>{const key='schiild.demo.ateliers.v3',collection=JSON.parse(localStorage.getItem(key)),state=collection.ateliers[0].state,first=Date.parse(state.day.slice(0,7)+'-01T00:00:00Z');state.works=state.works.map((work,n)=>({...work,day:new Date(first-n*2*86400000).toISOString().slice(0,10)}));localStorage.setItem(key,JSON.stringify(collection));});
 await page.reload();await page.getByTestId('today-board').waitFor();
 await swipe('.eyebrow',170);assert.equal(await active(),'アトリエ');
 await swipe('.eyebrow',-170);await page.getByTestId('global-page').waitFor();assert.equal(await active(),'GLOBAL SCHIILD');
 await swipe('.global-page h1',-170);await calendar.waitFor();assert.equal(await active(),'アーカイブ');
 const latest=await month();assert.equal(await page.locator('.calendar-month h2').innerText(),new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(latest+'-01T00:00:00Z')));
 const font=await page.locator('.calendar-month h2').evaluate(node=>({font:getComputedStyle(node).fontFamily,style:getComputedStyle(node).fontStyle}));assert(!font.font.includes('Georgia'));assert.equal(font.style,'normal');
 await swipe('.calendar-grid',170);assert((await month())<latest);assert.equal(await active(),'アーカイブ');assert.equal(await page.getByRole('dialog').count(),0);
 await swipe('.calendar-grid',-170);assert.equal(await month(),latest);assert.equal(await page.getByRole('dialog').count(),0);
 await swipe('.calendar-grid',-170);assert.equal(await month(),shiftMonth(latest,1));assert.equal(await active(),'アーカイブ');assert.equal(await calendar.locator('.archive-work').count(),0);
 await swipe('.calendar-grid',170);assert.equal(await month(),latest);
 // Continue beyond the earliest record instead of silently clamping to its month.
 for(let n=0;n<3;n++)await swipe('.calendar-grid',170);
 assert.equal(await month(),shiftMonth(latest,-3));assert.equal(await calendar.locator('.archive-work').count(),0);assert.equal(await active(),'アーカイブ');
 for(let n=0;n<3;n++)await swipe('.calendar-grid',-170);
 await swipe('.calendar-grid',25);assert.equal(await month(),latest);assert.equal(await page.getByRole('dialog').count(),0);
 await swipe('.calendar-grid',170,0,true);assert.equal(await month(),latest);
 await calendar.locator('.archive-work').first().tap();await page.getByRole('dialog').waitFor();await swipe('.calendar-detail-heading',-160);assert.equal(await month(),latest);assert.equal(await page.getByRole('dialog').count(),1);
 await page.getByRole('dialog').getByRole('button',{name:'戻る',exact:true}).tap();assert.equal(await page.getByRole('dialog').count(),0);
 await calendar.locator('.archive-work').first().tap();await page.locator('.calendar-open').tap();await page.getByTestId('reveal').waitFor();await swipe('.nav',170);assert.equal(await page.getByTestId('reveal').count(),1);
 await nav.getByRole('button',{name:'アーカイブ',exact:true}).tap();await calendar.waitFor();await swipe('.nav',-170);await page.getByTestId('discover-page').waitFor();assert.equal(await active(),'見つける');await swipe('.nav',-170);assert.equal(await active(),'見つける');await swipe('.nav',170);await calendar.waitFor();
 await swipe('.nav',170);await page.getByTestId('global-page').waitFor();await swipe('.nav',170);await page.getByTestId('today-board').waitFor();
 // Internally opened archive pages must also use the real current screen.
 await page.locator('.section-heading button').tap();await calendar.waitFor();await page.waitForFunction(()=>document.querySelector('.nav .active')?.textContent==='アーカイブ');await swipe('.nav',170);await page.getByTestId('global-page').waitFor();
 await nav.getByRole('button',{name:'アトリエ',exact:true}).tap();await page.getByRole('button',{name:'今日のシールを記録',exact:true}).tap();await page.locator('.camera-page').waitFor();await swipe('.nav',-170);assert.equal(await page.locator('.camera-page').count(),1);
 await page.locator('.camera-page').getByRole('button',{name:'戻る',exact:true}).tap();await page.getByTestId('today-board').waitFor();
 // Two fingers must never switch a page.
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:260,y:270,'id':41},{x:300,y:270,'id':42}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:270,'id':41},{x:140,y:270,'id':42}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.getByTestId('today-board').count(),1);
 // Mouse dragging blank space follows the same tab order.
 const heading=await page.locator('.eyebrow').boundingBox(),mouseY=heading.y+heading.height/2;await page.mouse.move(290,mouseY);await page.mouse.down();await page.mouse.move(100,mouseY,{steps:8});await page.mouse.up();await page.getByTestId('global-page').waitFor();
 await nav.getByRole('button',{name:'アーカイブ',exact:true}).tap();await calendar.waitFor();await page.evaluate(()=>scrollTo(0,0));
 await swipe('.calendar-grid',0,-170);await page.waitForFunction(()=>scrollY>20);assert.equal(await month(),latest);await page.evaluate(()=>scrollTo(0,0));
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/calendar-swipe-phone.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Native touch and mouse tab swipes, nested month priority and empty months, taps, modal/camera/reveal protection, cancel/multiple fingers, vertical scrolling and calendar typography: passed');
}catch(error){await page.screenshot({path:'test-results/swipe-failure.png',fullPage:true});throw error;}finally{await browser.close();}

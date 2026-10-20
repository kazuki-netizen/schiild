// Verify only the silent opening and isolated fictional browser session.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const origin=process.env.DEMO_URL||'http://localhost:8085';
const browser=await chromium.launch({headless:true,...(process.env.DEMO_BROWSER?{executablePath:process.env.DEMO_BROWSER}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
 page.on('pageerror',cause=>errors.push(cause.message));await page.goto(origin+'/week/');await page.getByTestId('brand-opening').waitFor();assert.equal(await page.locator('.opening-symbol i').count(),3);assert.equal(await page.locator('.opening-lockup h1').innerText(),'Schiild');assert.equal(await page.locator('audio,video').count(),0);
 await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByTestId('brand-opening').waitFor({state:'detached'});await page.getByTestId('today-board').waitFor();assert.equal(await page.locator('[inert]').count(),0);
 await page.reload();await page.getByTestId('brand-opening').waitFor();const timing=await page.locator('.opening-symbol i').evaluateAll(nodes=>nodes.map(node=>{const style=getComputedStyle(node,'::after');return [style.animationDuration,style.animationDelay];}));assert.deepEqual(timing,[['0.3s','0.1s'],['0.3s','0.4s'],['0.3s','0.7s']]);await page.getByTestId('brand-opening').waitFor({state:'detached',timeout:2600});await page.getByTestId('today-board').waitFor();assert.equal(await page.locator('[inert]').count(),0);
 await page.goto(origin+'/week/?opening=assemble');await page.locator('.brand-opening.assemble').waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByTestId('today-board').waitFor();
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.getByTestId('today-board').waitFor();await page.getByTestId('brand-opening').waitFor({state:'detached',timeout:2000});assert.deepEqual(errors,[]);console.log('Silent double-speed fill logo, wordmark, close, two-second automatic entry, preserved assembly variant and reduced motion: passed');
}finally{await browser.close();}

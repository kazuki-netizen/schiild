// Verify only the silent opening and isolated fictional browser session.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const origin=process.env.DEMO_URL||'http://localhost:8085';
const browser=await chromium.launch({headless:true,...(process.env.DEMO_BROWSER?{executablePath:process.env.DEMO_BROWSER}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
 page.on('pageerror',cause=>errors.push(cause.message));await page.goto(origin+'/week/');await page.getByTestId('brand-opening').waitFor();assert.equal(await page.locator('.opening-symbol i').count(),3);assert.equal(await page.locator('.opening-lockup h1').innerText(),'Schiild');assert.equal(await page.locator('audio,video').count(),0);
 await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByTestId('brand-opening').waitFor({state:'detached'});await page.getByTestId('today-board').waitFor();assert.equal(await page.locator('[inert]').count(),0);
 await page.reload();await page.getByTestId('brand-opening').waitFor();await page.getByTestId('brand-opening').waitFor({state:'detached',timeout:5000});await page.getByTestId('today-board').waitFor();
 await page.goto(origin+'/week/?opening=assemble');await page.locator('.brand-opening.assemble').waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByTestId('today-board').waitFor();
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.getByTestId('today-board').waitFor();await page.getByTestId('brand-opening').waitFor({state:'detached',timeout:2000});assert.deepEqual(errors,[]);console.log('Silent three-part logo, wordmark, close, automatic entry and reduced motion: passed');
}finally{await browser.close();}

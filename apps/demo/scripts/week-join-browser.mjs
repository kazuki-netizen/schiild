// DEMO ONLY. Participation stays inside the fictional browser session, even on the public site.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const origin=process.env.DEMO_URL||'http://localhost:8085';
const browser=await chromium.launch({headless:true,...(process.env.DEMO_BROWSER?{executablePath:process.env.DEMO_BROWSER}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),posts=[],errors=[];
 page.on('pageerror',cause=>errors.push(cause.message));await page.route('**/*',async route=>{if(route.request().method()==='POST'){posts.push(route.request().url());await route.abort();}else await route.continue();});
 await page.goto(origin+'/metadata.json');await page.evaluate(()=>localStorage.setItem('unrelated.application','preserve'));const before=await page.evaluate(()=>({...localStorage}));
 await page.goto(origin+'/week/');await page.getByTestId('today-board').waitFor();await page.locator('.header .text-button').first().click();assert.equal(await page.locator('.atelier-row').count(),3);
 await page.getByRole('button',{name:'公開アトリエに参加',exact:true}).click();const search=page.getByRole('searchbox');await search.fill('WK000002');const card=page.locator('.discover-card[data-code=WK000002]');await card.waitFor();assert.equal(await card.getAttribute('data-joined'),'false');await card.click();await page.locator('.join-preview').waitFor();const submit=page.getByRole('button',{name:'参加する',exact:true});assert(await submit.isEnabled());await submit.click();await page.getByTestId('today-board').waitFor();await page.getByRole('heading',{name:'窓際のひととき',exact:true}).waitFor();
 await page.locator('.header .text-button').first().click();assert.equal(await page.locator('.atelier-row').count(),4);assert.equal(await page.locator('.atelier-row[data-code=WK000002]').getAttribute('data-selected'),'true');
 // The code route still allows an invitation to a private atelier.
 await page.getByRole('button',{name:'公開アトリエに参加',exact:true}).click();await page.getByPlaceholder('8文字のコード').fill('WK000010');await page.getByRole('button',{name:'コードで参加する',exact:true}).click();await page.locator('.join-preview').waitFor();await page.getByRole('button',{name:'参加する',exact:true}).click();await page.getByTestId('today-board').waitFor();await page.getByRole('heading',{name:'いつもの仲間',exact:true}).waitFor();
 await page.locator('.header .text-button').first().click();assert.equal(await page.locator('.atelier-row').count(),5);await page.getByRole('button',{name:'公開アトリエに参加',exact:true}).click();await search.fill('WK000002');await card.waitFor();assert.equal(await card.getAttribute('data-joined'),'true');await card.click();await page.getByTestId('today-board').waitFor();
 // Joining never borrows a source participant's submitted photo or historical area.
 assert.equal(await page.locator('.posted').count(),0);await page.getByRole('button',{name:'Schiild',exact:true}).click();await page.getByTestId('profile-page').waitFor();assert.equal(await page.locator('.account-page .stats b').first().innerText(),'5');
 await page.reload();await page.getByTestId('today-board').waitFor();await page.locator('.header .text-button').first().click();assert.equal(await page.locator('.atelier-row').count(),3);assert.equal(await page.locator('.atelier-row[data-code=WK000002]').count(),0);
 assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);assert.deepEqual(posts,[]);assert.deepEqual(errors,[]);console.log('Public and invitation-code participation enabled, selected atelier and profile updated, duplicates avoided, reload reset and real storage/API isolated: passed');
}finally{await browser.close();}

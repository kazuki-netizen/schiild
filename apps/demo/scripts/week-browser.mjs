// Reads only the fictional static example, including in published verification.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const origin=process.env.DEMO_URL||'http://localhost:8085';
const browser=await chromium.launch({headless:true,...(process.env.DEMO_BROWSER?{executablePath:process.env.DEMO_BROWSER}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],posts=[];
 page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',async route=>{if(route.request().method()==='POST'){posts.push(route.request().url());await route.abort();}else await route.continue();});
 await mkdir('test-results',{recursive:true});
 // The example must not read or erase normal browser records, even an existing account.
 await page.goto(origin+'/metadata.json');await page.evaluate(()=>{localStorage.setItem('schiild.account.session.v2','a'.repeat(64));localStorage.setItem('schiild.demo.ateliers.v3','private-atelier-record');localStorage.setItem('schiild.language.v1','fr');localStorage.setItem('unrelated.application','keep');});
 const before=await page.evaluate(()=>({...localStorage}));
 await page.goto(origin+'/week/');await page.getByTestId('today-board').waitFor();await page.locator('.week-notice option').last().waitFor({state:'attached'});
 assert.equal(await page.locator('.week-notice option').count(),40);await page.getByRole('heading',{name:'日々のかけら',exact:true}).waitFor();
 assert.equal(await page.locator('.week-notice').innerText().then(text=>text.includes('架空の記録')),true);
 await page.screenshot({path:'test-results/week-today.png',fullPage:true});
 const nav=page.locator('.nav');await nav.getByRole('button',{name:'アーカイブ',exact:true}).click();const calendar=page.getByTestId('archive-calendar');await calendar.waitFor();assert.equal(await calendar.getAttribute('data-total'),'6');await calendar.locator('.archive-work img').first().waitFor();await page.screenshot({path:'test-results/week-archive.png',fullPage:true});
 await calendar.locator('.archive-work').first().click();await page.locator('.calendar-open').click();await page.getByTestId('reveal').waitFor();await page.getByRole('button',{name:'ひらく',exact:true}).last().click();await page.waitForFunction(()=>document.querySelector('[data-testid=reveal]')?.getAttribute('data-custody')==='true');
 await nav.getByRole('button',{name:'GLOBAL SCHIILD',exact:true}).click();const global=page.getByTestId('global-page');await global.waitFor();await page.getByTestId('global-explorer').waitFor();assert.equal(await page.getByTestId('global-explorer').getAttribute('data-resolution'),'5');await page.screenshot({path:'test-results/week-global.png',fullPage:true});
 await nav.getByRole('button',{name:'見つける',exact:true}).click();await page.locator('.discover-card').first().waitFor();assert.equal(await page.locator('.discover-card').count(),7);await page.getByRole('searchbox').fill('緑');await page.waitForFunction(()=>document.querySelectorAll('.discover-card').length===1);await page.getByRole('heading',{name:'見つける',exact:true}).waitFor();await page.screenshot({path:'test-results/week-discover.png',fullPage:true});
 await page.getByRole('button',{name:'Schiild',exact:true}).click();await page.getByTestId('profile-page').waitFor();await page.getByText(/@example_01/).waitFor();await page.screenshot({path:'test-results/week-profile.png',fullPage:true});
 await page.getByRole('button',{name:'設定',exact:true}).click();const language=page.locator('.settings-page select');await language.selectOption('en');await page.getByText('Fictional records · view only',{exact:true}).waitFor();await language.selectOption('ja');
 await page.getByRole('combobox',{name:'見る人',exact:true}).selectOption('example_13');await page.getByTestId('today-board').waitFor();await page.getByRole('heading',{name:'小さな机',exact:true}).waitFor();await nav.getByRole('button',{name:'アーカイブ',exact:true}).click();await calendar.waitFor();assert.equal(await calendar.getAttribute('data-total'),'7');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===1440)await page.screenshot({path:'test-results/week-desktop.png',fullPage:true});}
 assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);assert.deepEqual(posts,[]);assert.deepEqual(errors,[]);
 console.log('40 viewpoints, real weekly artifacts, six/seven-day archives, reveal, 5×5 GLOBAL, public search, profile, translations, responsive layout and untouched real browser/API data: passed');
}catch(error){throw error;}finally{await browser.close();}

// Regression: a fresh browser and a single recorded month must still browse adjacent months.
import {chromium} from '@playwright/test';
import {seedDemo} from './browser-fixture.mjs';
import {shiftMonth} from '../src/calendar.ts';
import assert from 'node:assert/strict';
const origin='http://localhost:8085';
const browser=await chromium.launch({headless:true,...(process.env.DEMO_BROWSER?{executablePath:process.env.DEMO_BROWSER}:{})});
try{
 for(const scenario of ['empty','single-month']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));if(scenario==='single-month')await seedDemo(context);
  await page.goto(origin);await page.locator('.nav').waitFor();
  if(scenario==='single-month'){
   await page.getByTestId('today-board').waitFor();
   await page.evaluate(()=>{const key='schiild.demo.ateliers.v3',collection=JSON.parse(localStorage.getItem(key)),state=collection.ateliers[0].state;state.day='2026-01-15';state.works=[{...state.works[0],day:'2026-01-10'}];localStorage.setItem(key,JSON.stringify(collection));});
   await page.reload();await page.getByTestId('today-board').waitFor();
  }
  await page.locator('.nav button').nth(2).tap();const calendar=page.getByTestId('archive-calendar');await calendar.waitFor();
  const cdp=await context.newCDPSession(page),initial=await calendar.getAttribute('data-month'),total=scenario==='empty'?'0':'1';
  assert.equal(await calendar.getAttribute('data-total'),total);assert.equal(await calendar.locator('.calendar-paging button:disabled').count(),0);
  const originalImage=scenario==='single-month'?await calendar.locator('.archive-work img').first().getAttribute('src'):null;
  async function swipe(dx){const grid=calendar.locator('.calendar-grid');await grid.scrollIntoViewIfNeeded();const box=await grid.boundingBox(),x=dx<0?290:90,y=box.y+35;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,'id':51}]});for(let n=1;n<=6;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*n/6,y,'id':51}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(450);}
  await swipe(160);assert.equal(await calendar.getAttribute('data-month'),shiftMonth(initial,-1));assert.equal(await calendar.locator('.archive-work').count(),0);assert.equal(await page.locator('.nav .active').innerText(),'アーカイブ');
  await swipe(-160);assert.equal(await calendar.getAttribute('data-month'),initial);await swipe(-160);assert.equal(await calendar.getAttribute('data-month'),shiftMonth(initial,1));assert.equal(await calendar.locator('.archive-work').count(),0);
  await calendar.getByRole('button',{name:'前の月',exact:true}).tap();assert.equal(await calendar.getAttribute('data-month'),initial);
  await calendar.getByRole('button',{name:'次の月',exact:true}).tap();assert.equal(await calendar.getAttribute('data-month'),shiftMonth(initial,1));
  // PC dragging the empty calendar also moves to the previous month.
  const box=await calendar.locator('.calendar-grid').boundingBox();await page.mouse.move(90,box.y+35);await page.mouse.down();await page.mouse.move(250,box.y+35,{steps:8});await page.mouse.up();assert.equal(await calendar.getAttribute('data-month'),initial);
  assert.equal(await calendar.getAttribute('data-total'),total);assert.equal(await page.getByRole('dialog').count(),0);if(originalImage)assert.equal(await calendar.locator('.archive-work img').getAttribute('src'),originalImage);
  assert.deepEqual(errors,[]);console.log(`${scenario}: native swipes and mouse drag browse empty previous/next months, buttons work, records stay unchanged`);await context.close();
 }
}finally{await browser.close();}

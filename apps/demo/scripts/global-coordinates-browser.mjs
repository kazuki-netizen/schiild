// Read-only regression: every coordinate label stays beside the Schiil it describes.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {pinchToOverview} from './browser-gestures.mjs';
const origin=process.env.DEMO_URL||'http://localhost:8085',browser=await chromium.launch({headless:true,...(process.env.DEMO_BROWSER?{executablePath:process.env.DEMO_BROWSER}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],posts=[];
 page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',route=>{if(route.request().method()==='POST'){posts.push(route.request().url());return route.abort();}return route.continue();});
 for(const person of ['example_0001','example_0500','example_1000']){
  await page.goto(origin+'/week/?person='+person);await page.locator('.nav').getByRole('button',{name:'GLOBAL SCHIILD',exact:true}).click();const own=page.getByTestId('global-own-schiil'),coords=page.getByTestId('global-own-coordinates'),stage=page.getByTestId('global-explorer');await own.locator('img').waitFor();
  const day=await page.getByTestId('global-page').getAttribute('data-day'),record=await(await page.request.get(origin+'/week/globals/'+day+'.json')).json(),profile=await(await page.request.get(origin+'/week/people/'+person+'.json')).json(),mine=profile.globals[day],position=mine.y*record.outputSize+mine.x,expected=record.schiils.find(tile=>tile.position===position).image,label=`x ${mine.x+1} ／ y ${mine.y+1}`;
  assert.equal(await coords.innerText(),label);assert.equal(await own.locator('img').getAttribute('src'),expected);
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});await stage.scrollIntoViewIfNeeded();const other=record.schiils.find(tile=>tile.position!==position&&tile.image!==expected),pixel={x:other.position%record.outputSize,y:Math.floor(other.position/record.outputSize)},box=await stage.boundingBox();
   await page.touchscreen.tap(box.x+(pixel.x+.5)/record.outputSize*box.width,box.y+(pixel.y+.5)/record.outputSize*box.height);const inspection=page.getByTestId('global-pixel-inspection');await inspection.getByTestId('global-selected-schiil').locator('img').waitFor();assert.equal(await inspection.getAttribute('data-x'),String(pixel.x));assert.equal(await inspection.getAttribute('data-y'),String(pixel.y));assert.equal(await inspection.locator('.mono').innerText(),`x ${pixel.x+1} ／ y ${pixel.y+1}`);assert.equal(await inspection.locator('img').getAttribute('src'),other.image);assert.equal(await coords.innerText(),label);assert.equal(await own.locator('img').getAttribute('src'),expected);
   await own.click();const tile=stage.locator(`.explorer-schiil[data-position="${position}"]`);await tile.locator('img').waitFor();assert.equal(await tile.locator('img').getAttribute('src'),expected);assert.equal(await page.getByTestId('global-pixel-inspection').getAttribute('data-x'),String(mine.x));assert.equal(await page.getByTestId('global-pixel-inspection').getAttribute('data-y'),String(mine.y));const markerBox=await stage.locator('.mine').boundingBox(),tileBox=await tile.boundingBox();assert(Math.abs(markerBox.x-tileBox.x)<.1&&Math.abs(markerBox.y-tileBox.y)<.1);assert.equal(await page.getByTestId('global-selected-schiil').count(),0);await pinchToOverview(page);
  }
  await stage.scrollIntoViewIfNeeded();const corner=await stage.boundingBox();await page.touchscreen.tap(corner.x+corner.width*(1-.5/record.outputSize),corner.y+corner.height*(1-.5/record.outputSize));assert.equal(await page.getByTestId('global-pixel-inspection').locator('.mono').innerText(),`x ${record.outputSize} ／ y ${record.outputSize}`);assert.equal(await coords.innerText(),label);
 }
 await page.screenshot({path:'test-results/global-coordinate-labels.png',fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);console.log('One-based labels for own/other/empty cells, unchanged exact grid/photo/marker mapping, two phone widths: passed');
}finally{await browser.close();}

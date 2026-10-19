// Drive browser-native fingers, without calling application gesture handlers.
const sessions=new WeakMap();
export async function pinch(page,factor,selector='[data-testid=global-explorer]'){
 const target=page.locator(selector);await target.scrollIntoViewIfNeeded();const box=await target.boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2,half=factor>1?Math.min(45,box.width*.4/factor):box.width*.4;
 if(!sessions.has(page))sessions.set(page,await page.context().newCDPSession(page));const cdp=sessions.get(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-half,y:cy,'id':71},{x:cx+half,y:cy,'id':72}]});
 for(let n=1;n<=6;n++){const spread=half*(1+(factor-1)*n/6);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-spread,y:cy,'id':71},{x:cx+spread,y:cy,'id':72}]});}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
export async function pinchToOverview(page){
 const target=page.getByTestId('global-explorer'),scale=Number(await target.getAttribute('data-scale'));if(scale>1)await pinch(page,1/(scale*2));
}

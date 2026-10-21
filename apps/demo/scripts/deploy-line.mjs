// DEMO ONLY. Read the channel secret from the child process environment, never a file or argument.
import {readFile,writeFile} from 'node:fs/promises';
import {validLineConfig} from '../server/line-identity.mjs';
const mode=process.argv[2];
if(!['--check','--enable','--pause'].includes(mode))throw Error('Choose --check, --enable or --pause');
const filename=new URL('../.deploy-private/line-login.json',import.meta.url),saved=JSON.parse(await readFile(filename,'utf8'));
const config={channelId:saved.channelId,channelSecret:process.env.SCHIILD_LINE_SECRET,redirectUri:'https://schiild.app/?auth=line',paused:mode==='--pause'};
if(!validLineConfig({...config,paused:false}))throw Error('LINE connection settings are incomplete');
if(mode==='--check'){console.log({settingsFormatValid:true,redirectUri:config.redirectUri});}
else{
 const account=process.env.CLOUDFLARE_ACCOUNT_ID;if(!/^[a-f0-9]{32}$/.test(account??''))throw Error('Set CLOUDFLARE_ACCOUNT_ID');
 const token=process.env.CLOUDFLARE_API_TOKEN,key=process.env.CLOUDFLARE_API_KEY,email=process.env.CLOUDFLARE_EMAIL;
 if(!token&&!(key&&email))throw Error('Cloudflare credentials are unavailable');
 const headers={'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{'X-Auth-Key':key,'X-Auth-Email':email})};
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/schiild-demo-api/secrets`,{method:'PUT',headers,body:JSON.stringify({name:'LINE_LOGIN_CONFIG',text:JSON.stringify(config),type:'secret_text'}),signal:AbortSignal.timeout(30000)});
 const result=await response.json();if(!response.ok||!result.success)throw Error('Cloudflare could not update LINE settings ('+response.status+')');
 // Only public connection metadata is written back to disk.
 await writeFile(filename,JSON.stringify({channelId:config.channelId,redirectUri:config.redirectUri,updatedAt:new Date().toISOString()}));
 console.log({lineEnabled:!config.paused,redirectUri:config.redirectUri});
}

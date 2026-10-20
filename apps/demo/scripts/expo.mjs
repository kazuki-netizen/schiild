import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
const root=fileURLToPath(new URL('../',import.meta.url));
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/expo/bin/cli',import.meta.url)),...process.argv.slice(2)],{cwd:root,stdio:'inherit',env:{...process.env,EXPO_NO_TELEMETRY:'1',__UNSAFE_EXPO_HOME_DIRECTORY:fileURLToPath(new URL('../.expo-home',import.meta.url))}});
child.on('error',()=>{console.error('expo_start_failed');process.exitCode=1;});child.on('exit',async code=>{
 process.exitCode=code??1;
 if(code===0&&process.argv[2]==='export')try{const htmlFile=new URL('../dist/index.html',import.meta.url);let html=await readFile(htmlFile,'utf8');html=html.replace('</head>','<link rel="manifest" href="/manifest.webmanifest"/><link rel="apple-touch-icon" href="/app-icons/icon-192.png"/><meta name="theme-color" content="#ffffff"/></head>');await writeFile(htmlFile,html);await mkdir(new URL('../dist/week/',import.meta.url),{recursive:true});await copyFile(new URL('../dist/index.html',import.meta.url),new URL('../dist/week/index.html',import.meta.url));}catch{console.error('week_entry_export_failed');process.exitCode=1;}
});

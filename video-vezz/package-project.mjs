// Portable ZIP builder (deflate + CRC32). No system archiver or extra package.
import {readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {deflateRawSync} from 'node:zlib';
import path from 'node:path';
import {spawn} from 'node:child_process';
const files=[];
const v3=process.argv.includes('--v3');
const short=process.argv.includes('--short');
const archive=short?'VEZZ_Projeto_Editavel_Curto.zip':v3?'VEZZ_Projeto_Editavel_V3.zip':'VEZZ_Projeto_Editavel.zip';
async function walk(folder){for(const e of await readdir(folder,{withFileTypes:true})){const name=folder+'/'+e.name;if(e.isDirectory())await walk(name);else files.push(name);}}
for(const d of ['src','capture','audio','docs','public'])await walk(d);
if(v3||short)await walk('archive/v2-src');
files.push('package.json','package-lock.json','README.md','render.mjs','verify.mjs','review.mjs','package-project.mjs','raw/capture-manifest.json',short?'final/quality-report-short.json':v3?'final/quality-report-v3.json':'final/quality-report.json');
if(v3||short)files.push('raw/v3-integrity-baseline.json','raw/v3-direction-checks.json','raw/v3-audio-cues.json','raw/capture-manifest-v3-manager.json');
if(short)files.push('raw/short-integrity-baseline.json','raw/short-direction-checks.json','raw/short-audio-cues.json');
const table=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(b){let crc=0xffffffff;for(const x of b)crc=table[(crc^x)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
const locals=[],central=[];let offset=0;
for(const filename of files){
  let raw=await readFile(filename);
  // The portable edit contains source media, not previous exports or ZIPs.
  // Scope its baseline to the original assets actually shipped in this ZIP.
  if(short&&filename==='raw/short-integrity-baseline.json')raw=Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(raw)).filter(([file])=>!file.startsWith('final/'))),null,2));
  const compressed=deflateRawSync(raw,{level:6}),name=Buffer.from(filename.replaceAll('\\','/'));const crc=crc32(raw);
  const modified=new Date((await stat(filename)).mtime),year=Math.max(1980,modified.getFullYear());
  const date=((year-1980)<<9)|((modified.getMonth()+1)<<5)|modified.getDate();const time=(modified.getHours()<<11)|(modified.getMinutes()<<5)|Math.floor(modified.getSeconds()/2);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(time,10);h.writeUInt16LE(date,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(name.length,26);
  locals.push(h,name,compressed);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(time,12);c.writeUInt16LE(date,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);
  offset+=h.length+name.length+compressed.length;
}
const directory=Buffer.concat(central);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...locals,directory,end]);await writeFile('final/'+archive,zip);
await new Promise((resolve,reject)=>{
  const p=spawn('python',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); bad=z.testzip(); assert bad is None, bad; print("ZIP CRC and decompression verified:", len(z.infolist()), "files")','final/'+archive],{windowsHide:true,stdio:'inherit'});
  p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error('ZIP validation failed: '+code)));
});
await writeFile(short?'final/project-files-short.json':v3?'final/project-files-v3.json':'final/project-files.json',JSON.stringify({archive,bytes:zip.length,crcAndDecompressionVerified:true,files},null,2));
console.log('EDITABLE PROJECT',files.length+' files',Math.round(zip.length/1048576)+' MiB');

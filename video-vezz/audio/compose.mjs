// Original 120 BPM electronic score. All voices, percussion and sound effects
// are synthesized here. No third-party recordings, samples or melodies.
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import {V3_CUES} from '../src/direction-v3.mjs';
import {SHORT_CUES,SHORT_DURATION,SHORT_FPS} from '../src/direction-short.mjs';
const v3=process.argv.includes('--v3');
const short=process.argv.includes('--short');
const refined=v3||short,cues=short?SHORT_CUES:V3_CUES;
if(v3){
  try{
    const capture=JSON.parse(await readFile('raw/capture-manifest-v3-manager.json','utf8'));
    V3_CUES.clicks=[...V3_CUES.clicks.filter(t=>t<43.9),...capture.actions.filter(a=>a.action==='click').map(a=>43.9+a.at)];
  }catch{/* Existing cue times remain available before a new capture. */}
}
const SR=48000,D=short?SHORT_DURATION/SHORT_FPS:60,N=SR*D,TAU=Math.PI*2;
const L=new Float32Array(N),R=new Float32Array(N);
const note=n=>440*2**((n-69)/12);
let seed=0x56455a5a;
const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
function add(start,dur,voice,pan=0,gain=1) {
  const a=Math.max(0,Math.round(start*SR)),b=Math.min(N,Math.round((start+dur)*SR));
  const gl=Math.sqrt((1-pan)/2)*gain,gr=Math.sqrt((1+pan)/2)*gain;
  for(let i=a;i<b;i++){const t=(i-a)/SR;const v=voice(t,dur);L[i]+=v*gl;R[i]+=v*gr;}
}
const smooth=(t,d)=>Math.min(1,t/.025)*Math.min(1,(d-t)/.12);
const chords=[[50,57,62,65],[46,53,58,62],[41,53,57,60],[48,55,60,64]];
// Evolving, slowly detuned chords. Ciano-like bell texture and a warm bottom.
for(let bar=0;bar<Math.ceil(D/2);bar++) {
  const chord=chords[Math.floor(bar/2)%4],st=bar*2;
  chord.forEach((m,j)=>add(st,2.9,(t,d)=>{
    const f=note(m+12);const env=Math.min(1,t/.6)*Math.min(1,(d-t)/.85);
    return (Math.sin(TAU*f*t)+.32*Math.sin(TAU*f*1.002*t)+.14*Math.sin(TAU*2*f*t))*.025*env;
  },(j-1.5)*.38));
}
for(let step=0;step<Math.ceil(D/.25);step++) {
  const st=step*.25;const chord=chords[Math.floor(st/4)%4];
  if(st<3||st>D-2.5)continue;
  const m=chord[[0,2,1,3,2,1,3,2][step%8]]+24+(step%16===15?12:0),f=note(m);
  const g=st<5?.28:st>(short?32.4:53)?.5:1;
  add(st,.72,(t,d)=>(Math.sin(TAU*f*t)+.20*Math.sin(TAU*f*2*t)+.1*Math.sin(TAU*f*3.001*t))*Math.exp(-t*8)*Math.min(1,t/.006)*.067*g,Math.sin(step*.7)*.65);
  add(st+.19,.48,t=>Math.sin(TAU*f*t)*Math.exp(-t*11)*.013*g,-Math.sin(step*.7)*.65);
}
for(let beat=10;beat<Math.floor((D-3)*2);beat++) {
  const st=beat*.5;if(st>53&&beat%2)continue;
  if(refined&&st>=(short?32.5:54.5))continue;
  add(st,.36,t=>Math.sin(TAU*(46*t+85*.022*(1-Math.exp(-t/.022))))*Math.exp(-t*16)*.32);
  const bass=note(chords[Math.floor(st/4)%4][0]-12);
  add(st+.04,.4,(t,d)=>(Math.sin(TAU*bass*t)+.18*Math.sin(TAU*2*bass*t))*Math.min(1,t/.015)*Math.exp(-t*5)*.12);
  if(beat%2===1)add(st,.16,t=>noise()*(Math.exp(-t*35)+.6*Math.exp(-Math.abs(t-.025)*100))*.046);
  for(let h=0;h<2;h++)add(st+h*.25+.001,.065,t=>noise()*Math.exp(-t*65)*.023,h%2?.6:-.6);
}
const cuts=refined?cues.transitions:[4.5,13.5,17.5,21,24.5,28.5,34,40.4,43.9,51.4,54.4];
for(const t of cuts) {
  let lp=0;add(t-.45,.75,(x,d)=>{lp=lp*.83+noise()*.17;const env=Math.sin(Math.PI*x/d)**2;return lp*env*(refined?.095:.15);},-.15);
  add(t,.8,x=>Math.sin(TAU*(78*x+35*.035*(1-Math.exp(-x/.035))))*Math.exp(-x*9)*(refined?.075:.14));
}
const clickTimes=refined?cues.clicks:[30.55,31.9,33.1,35.0,36.45,37.7,41.2,44.4,45.7,46.9,48.1,49.4];
clickTimes.forEach(t=>add(t,.045,x=>(noise()*.16+Math.sin(TAU*1450*x)*.11)*Math.exp(-x*120)));
function chime(t,notes,gain=.12){notes.forEach((m,i)=>add(t+i*.11,1.1,x=>(Math.sin(TAU*note(m)*x)+.1*Math.sin(TAU*note(m)*2*x))*Math.exp(-x*5)*Math.min(1,x/.004)*gain,i%2?.25:-.25));}
chime(.4,[74,81],.09);
chime(refined?cues.confirmation:38.05,[74,77,81],.09);
chime(refined?cues.called:51.6,[74,78,81,86],.10);
chime(refined?cues.brand:57.5,[74,81,86],.10);
if(refined) {
  chime(cues.selection,[81],.045);
  for(const t of cues.stageChanges)add(t,.1,x=>Math.sin(TAU*900*x)*Math.exp(-x*40)*.022);
}
// Soft ping-pong space, finite feedback; subtle rather than a long wash.
for(let i=Math.round(.375*SR);i<N;i++) {L[i]+=R[i-Math.round(.375*SR)]*.13;R[i]+=L[i-Math.round(.25*SR)]*.1;}
let peak=0;
for(let i=0;i<N;i++) {
  const t=i/SR,fade=Math.min(1,t/.15)*Math.min(1,(D-t)/1.5);
  L[i]=Math.tanh(L[i]*1.1)*fade;R[i]=Math.tanh(R[i]*1.1)*fade;peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));
}
const gain=.86/peak;
const wav=Buffer.alloc(44+N*4);wav.write('RIFF',0);wav.writeUInt32LE(36+N*4,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(SR,24);wav.writeUInt32LE(SR*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(N*4,40);
for(let i=0;i<N;i++){wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[i]*gain))*32767),44+i*4);wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[i]*gain))*32767),46+i*4);}
const originalFile=short?'public/audio/vezz-original-short.wav':v3?'public/audio/vezz-original-v3.wav':'public/audio/vezz-original.wav';
const mixFile=short?'public/audio/vezz-mix-short.wav':v3?'public/audio/vezz-mix-v3.wav':'public/audio/vezz-mix.wav';
await mkdir('public/audio',{recursive:true});await writeFile(originalFile,wav);
if(v3)await writeFile('raw/v3-audio-cues.json',JSON.stringify(V3_CUES,null,2));
if(short)await writeFile('raw/short-audio-cues.json',JSON.stringify(cues,null,2));
console.log(`Original score: ${D} s, 120 BPM, 48 kHz stereo; synthesized percussion, arpeggio, chords, clicks, whooshes and confirmation chimes.`);
await new Promise((resolve,reject)=>{
  const proc=spawn(ffmpeg,['-y','-hide_banner','-loglevel','error','-i',originalFile,'-af','loudnorm=I=-14:TP=-1.2:LRA=9','-ar','48000','-c:a','pcm_s16le',mixFile],{windowsHide:true,stdio:'inherit'});
  proc.on('exit',code=>code===0?resolve():reject(Error('Audio mix failed: '+code)));
});

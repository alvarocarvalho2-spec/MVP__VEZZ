// Camera focus is expressed in ORIGINAL footage pixels. This makes each move
// follow the actual product rather than pushing a centered video rectangle.
export const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));};
export const k=(f,s,cx,cy,extra={})=>({f,s,cx,cy,...extra});
export function sample(keys,f){
  if(f<=keys[0].f)return {...keys[0]};
  for(let i=1;i<keys.length;i++)if(f<=keys[i].f){
    const a=keys[i-1],b=keys[i],p=smooth((f-a.f)/(b.f-a.f));
    return Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].filter(n=>n!=='f').map(n=>[n,typeof a[n]==='number'&&typeof b[n]==='number'?a[n]+(b[n]-a[n])*p:b[n]??a[n]]));
  }
  return {...keys.at(-1)};
}
export const V3_SCENES=[
  {name:'home',from:135,dur:255,w:1120,h:990,x:-20,y:540,sourceW:1200,sourceH:1000,kind:'aperture',keys:[k(0,1.48,850,470),k(45,1.48,850,470),k(104,1.05,600,480),k(138,1.05,600,500),k(204,1.35,380,535),k(255,1.42,370,560)]},
  {name:'journey',from:390,dur:450,w:990,h:1010,x:30,y:530,sourceW:1200,sourceH:1000,kind:'rise',keys:[
    k(0,1.04,600,525),k(43,1.4,880,590),k(88,1.64,900,610),k(106,1.64,900,610),k(132,1.30,850,570),k(170,1.64,965,650),k(209,1.64,965,650),k(237,1.30,850,570),k(275,1.72,965,635),k(313,1.72,965,635),k(342,1.30,850,570),k(380,1.64,935,630),k(420,1.64,935,630),k(450,1.50,920,620)]},
  {name:'search',from:840,dur:165,w:920,h:1060,x:60,y:500,sourceW:640,sourceH:1000,kind:'card',keys:[k(0,1.44,320,430),k(36,1.68,310,330),k(61,1.68,310,330),k(99,1.50,320,520),k(126,1.55,320,650),k(150,1.47,320,500),k(165,1.47,320,500)]},
  {name:'booking',from:1005,dur:192,w:920,h:1060,x:60,y:500,sourceW:640,sourceH:1000,kind:'left',keys:[k(0,1.44,320,400),k(43,1.63,310,420),k(61,1.78,295,470),k(83,1.78,295,590),k(94,1.65,305,550),k(116,1.55,320,470),k(160,1.55,320,470),k(192,1.55,320,470)]},
  {name:'patient',from:1197,dur:120,w:920,h:1060,x:60,y:500,sourceW:640,sourceH:1000,kind:'match',rate:.875,keys:[k(0,1.55,320,470),k(30,1.55,320,470),k(68,1.63,300,430),k(94,1.82,270,405),k(120,1.82,270,405)]},
  {name:'manager',media:'manager-v3',from:1317,dur:225,w:1020,h:930,x:30,y:570,sourceW:1000,sourceH:1000,kind:'left',keys:[k(0,1.08,500,420),k(33,1.22,420,425),k(63,1.42,360,440),k(80,1.42,360,440),k(115,1.42,640,440),k(158,1.50,380,455),k(188,1.55,340,475),k(225,1.68,300,520)]},
  {name:'called',from:1542,dur:90,w:920,h:1060,x:60,y:500,sourceW:640,sourceH:1000,kind:'match',keys:[k(0,1.65,320,340),k(34,1.65,320,340),k(70,1.50,320,400),k(90,1.50,320,400)]},
];
export function camera(scene,f){
  const pose=sample(scene.keys,f),s=Math.max(pose.s,scene.w/scene.sourceW,scene.h/scene.sourceH);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const cx=clamp(pose.cx,scene.w/(2*s),scene.sourceW-scene.w/(2*s));
  const cy=clamp(pose.cy,scene.h/(2*s),scene.sourceH-scene.h/(2*s));
  return {...pose,s,cx,cy,tx:scene.w/2-cx*s,ty:scene.h/2-cy*s};
}
export function project(scene,f,[x,y,w=0,h=0]){const c=camera(scene,f);return {x:scene.x+c.tx+x*c.s,y:scene.y+32+c.ty+y*c.s,w:w*c.s,h:h*c.s};}
export const V3_CUES={
  transitions:[4.5,13,28,33.5,39.9,43.9,51.4,54.4],
  stageChanges:[17.02,20.52,24.02],
  clicks:[28.35,29.85,32.6,34.65,35.23,36.27,40.78,44.75,46.2,47.45,48.7,49.95],
  selection:35.23,confirmation:36.72,called:51.7,brand:55.17,
};

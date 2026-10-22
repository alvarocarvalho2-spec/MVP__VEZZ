import React from 'react';
import {AbsoluteFill,Audio,Freeze,Sequence,staticFile,useCurrentFrame,spring} from 'remotion';
import {Fonts,Bot,Background,Brand,Words,Film,HoldTail} from './Reel.jsx';
import {BOT_SPRITE} from './bot.generated.js';
import {V3_SCENES,camera,project,sample,smooth} from './direction-v3.mjs';

const cyan='#3fe6ff',sky='#a9c3f5';
const fade=(f,a,b)=>smooth((f-a)/(b-a));
function Header({chapter}){return <div className="topbar" style={{top:230,left:82,right:160}}><Brand/><div className="chapter" style={{fontSize:23}}><i/>{chapter}</div></div>;}
function Heading({phases,y=322,size=94}){
  const f=useCurrentFrame();const phase=[...phases].reverse().find(p=>f>=p.f)||phases[0];
  const next=phases.find(p=>p.f>phase.f);const exit=next?fade(f,next.f-9,next.f):0;
  return <div data-editorial="heading" style={{position:'absolute',left:82,top:y,width:810,opacity:1-exit*.65,transform:`translateY(${-exit*16}px) scale(${1+fade(f,phase.f,phase.f+55)*.008})`,transformOrigin:'left center'}}>
    <Words lines={phase.lines} size={phase.size||size} start={phase.f===0?4:phase.f-9}/>
  </div>;
}
function Transition({kind,children}){
  const f=useCurrentFrame(),p=fade(f,0,22);
  const clips={
    aperture:`circle(${p*2250}px at 48% 52%)`,
    rise:`inset(${(1-p)*100}% 0 0 0 round ${32*(1-p)}px)`,
    left:`inset(0 ${(1-p)*100}% 0 0 round ${24*(1-p)}px)`,
    card:`inset(${(1-p)*1055}px ${(1-p)*180}px ${(1-p)*660}px ${(1-p)*398}px round ${24*(1-p)}px)`,
    match:`inset(${(1-p)*36}% ${(1-p)*10}% ${(1-p)*26}% ${(1-p)*10}% round ${28*(1-p)}px)`,
    depth:`inset(${(1-p)*32}% ${(1-p)*9}% ${(1-p)*16}% ${(1-p)*9}% round ${75*(1-p)}px)`,
  };
  const dx=kind==='left'?(1-p)*90:0,dy=kind==='rise'?(1-p)*70:0;
  return <AbsoluteFill style={{clipPath:clips[kind],transform:`translate(${dx}px,${dy}px) scale(${kind==='depth'?1.07-.07*p:1})`,transformOrigin:'50% 56%'}}>
    {children}
    {kind==='rise'||kind==='left'?<div style={{position:'absolute',left:kind==='left'?1080*p-6:0,top:kind==='rise'?1920*(1-p)-4:0,width:kind==='left'?2:1080,height:kind==='rise'?2:1920,background:cyan,opacity:Math.sin(Math.PI*p)*.35}}/>:null}
  </AbsoluteFill>;
}
function Shot({scene}){
  const f=useCurrentFrame(),pose=camera(scene,f);
  const tilt=scene.name==='home'?-1.5+fade(f,0,140)*2:scene.name==='manager'?-.8+fade(f,0,225)*1.5:0;
  return <Film {...scene} name={scene.media||scene.name} focus={pose} rate={scene.rate||1} tilt={tilt} light={!['home','journey'].includes(scene.name)}/>;
}
function Mark({scene,box,start,end}){
  const f=useCurrentFrame();if(f<start||f>end)return null;
  const b=project(scene,f,box),p=fade(f,start,start+7)*(1-fade(f,end-7,end));
  return <svg style={{position:'absolute',inset:0,width:1080,height:1920,pointerEvents:'none'}}><defs><clipPath id={'mark-'+scene.name}><rect x={scene.x} y={scene.y+32} width={scene.w} height={scene.h}/></clipPath></defs><g clipPath={'url(#mark-'+scene.name+')'}><rect x={b.x-7} y={b.y-7} width={b.w+14} height={b.h+14} rx={18} fill="none" stroke={cyan} strokeWidth={2} opacity={p*.75}/></g></svg>;
}
function Guide({poses,expression,reactAt=-1000,enter=4,energy=.55}){
  const f=useCurrentFrame(),p=sample(poses,f);
  return <Bot expression={expression} x={p.x} y={p.y} size={p.size||155} turn={p.turn||0} visible={p.alpha??1} enter={enter} reactAt={reactAt} energy={energy}/>;
}
function IntroV3(){
  const f=useCurrentFrame(),leave=fade(f,108,135);
  const pose=sample([{f:0,x:360,y:1160,size:220,turn:14},{f:28,x:300,y:790,size:430,turn:-5},{f:60,x:290,y:790,size:440,turn:3},{f:105,x:290,y:790,size:440,turn:-2},{f:135,x:205,y:650,size:760,turn:0}],f);
  return <AbsoluteFill><Background/>
    <svg className="intro-streak" viewBox="0 0 1080 1920"><defs><linearGradient id="v3beam"><stop stopColor={cyan} stopOpacity="0"/><stop offset=".9" stopColor={cyan}/><stop offset="1" stopColor="white"/></linearGradient></defs><path d="M-80 1330C70 1100 50 780 500 680S1040 440 1200 240" fill="none" stroke="url(#v3beam)" strokeWidth="2.5" strokeDasharray="1800" strokeDashoffset={1800*(1-fade(f,4,85))}/></svg>
    <div style={{position:'absolute',left:82,top:305,opacity:1-leave,transform:`translateY(${-leave*80}px)`}}><Words lines={['E se esperar','atendimento fosse','mais simples?']} size={88} start={7}/></div>
    <Bot {...pose} expression={f<58?'thinking':'joy'} reactAt={58} enter={3} energy={.65} large/>
    <div style={{position:'absolute',left:82,top:1320,opacity:fade(f,48,73)*(1-leave),transform:`translateY(${(1-fade(f,48,73))*25}px)`}}><Brand small={false}/></div>
    <div style={{position:'absolute',left:84,top:1490,fontSize:30,color:sky,opacity:fade(f,69,90)*(1-leave)}}>Seu tempo merece esse cuidado.</div>
    <svg style={{position:'absolute',inset:0,width:1080,height:1920,pointerEvents:'none'}}><ellipse cx={520} cy={1040} rx={240+leave*530} ry={240+leave*530} fill="none" stroke={cyan} strokeWidth="1" opacity={.18*(1-leave)}/></svg>
  </AbsoluteFill>;
}
function HomeV3({scene}){const f=useCurrentFrame();return <Transition kind={scene.kind}><Background/><Header chapter="Conheça o VEZZ"/>
  <Heading phases={[{f:0,lines:['Menos espera.','Mais cuidado.'],size:92},{f:157,lines:['O próximo cuidado','começa aqui.'],size:80}]}/>
  <Shot scene={scene}/>
  <Guide poses={[{f:0,x:78,y:1400,size:160,turn:-7},{f:65,x:78,y:1400,size:160,turn:4},{f:155,x:760,y:1400,size:160,turn:-5},{f:255,x:760,y:1400,size:160,turn:-3}]} expression={f<157?'calm':'thinking'} reactAt={160}/>
  </Transition>;}
const steps=[
  {f:0,lines:['Agende.'],note:'Clínica, dia e horário.',expression:'thinking'},
  {f:121,lines:['Entre na fila.'],note:'No dia, sua senha entra automaticamente.',expression:'calm'},
  {f:226,lines:['Acompanhe.'],note:'Sua posição e a espera estimada.',expression:'surprised'},
  {f:331,lines:['É a sua vez.'],note:'O VEZZ avisa quando chegar a hora.',expression:'joy'},
];
function JourneyV3({scene}){
  const f=useCurrentFrame(),step=[...steps].reverse().find(s=>f>=s.f)||steps[0],index=steps.indexOf(step);
  return <Transition kind={scene.kind}><Background/><Header chapter="Do agendamento ao atendimento"/>
    <Heading phases={steps} size={108}/>
    <div style={{position:'absolute',left:86,top:452,fontSize:30,color:sky}}>{step.note}</div>
    <Shot scene={scene}/>
    <Guide poses={[{f:0,x:80,y:1385,size:165,turn:4},{f:100,x:80,y:1385,size:165,turn:-5},{f:200,x:780,y:1385,size:150,turn:-8},{f:315,x:780,y:1385,size:150,turn:-5},{f:360,x:80,y:1385,size:165,turn:6},{f:450,x:80,y:1385,size:165,turn:2}]} expression={step.expression} reactAt={step.f+14}/>
    <div style={{position:'absolute',left:286,top:1577,display:'flex',gap:22}}>{steps.map((s,i)=><div key={s.f} style={{width:110,height:3,background:i<=index?cyan:'#34517c',opacity:i===index?1:.42}}/>)}</div>
  </Transition>;
}
function SearchV3({scene}){const f=useCurrentFrame();return <Transition kind={scene.kind}><Background/><Header chapter="Encontre seu cuidado"/>
  <Heading y={310} phases={[{f:0,lines:['Encontre','seu cuidado.'],size:84}]}/>
  <Shot scene={scene}/>
  <Guide poses={[{f:0,x:786,y:325,size:135,turn:-6},{f:68,x:786,y:325,size:135,turn:4},{f:105,x:786,y:355,size:135,turn:-7},{f:165,x:786,y:355,size:135,turn:-3}]} expression={f<94?'thinking':'surprised'} reactAt={94}/>
  </Transition>;}
function BookingV3({scene}){const f=useCurrentFrame(),confirmed=f>=98;return <Transition kind={scene.kind}><Background/><Header chapter="Agendamento de demonstração"/>
  <Heading phases={[{f:0,lines:['Agende.'],size:112},{f:98,lines:['Pronto.','Consulta agendada.'],size:80}]}/>
  {!confirmed?<div style={{position:'absolute',left:86,top:452,fontSize:30,color:sky}}>Seu horário. Sua escolha.</div>:null}
  <Shot scene={scene}/>
  {f<100?<Guide poses={[{f:0,x:785,y:325,size:140,turn:-5,alpha:1},{f:52,x:785,y:340,size:140,turn:5,alpha:1},{f:85,x:785,y:340,size:140,turn:-6,alpha:1},{f:100,x:1000,y:340,size:140,turn:2,alpha:0}]} expression={f<49?'thinking':'surprised'} reactAt={52}/>:<Bot expression="joy" size={158} x={746} y={1395} enter={101} reactAt={106} energy={.4}/>}
  <Mark scene={scene} box={[250,430,64,45]} start={48} end={65}/>
  <Mark scene={scene} box={[37,698,198,38]} start={76} end={91}/>
  </Transition>;}
function PatientV3({scene}){const f=useCurrentFrame();return <Transition kind={scene.kind}><Background/><Header chapter="Painel do paciente"/>
  <Heading phases={[{f:0,lines:['Acompanhe.'],size:110}]}/>
  <div style={{position:'absolute',left:86,top:452,fontSize:31,color:sky}}>Saiba quando é sua vez.</div>
  <Shot scene={scene}/>
  <Guide poses={[{f:0,x:790,y:325,size:135,turn:-4},{f:60,x:790,y:325,size:135,turn:-8},{f:120,x:790,y:325,size:135,turn:-5}]} expression={f<55?'calm':'thinking'} reactAt={80}/>
  <Mark scene={scene} box={[38,357,274,106]} start={80} end={111}/>
  </Transition>;}
function ManagerV3({scene}){const f=useCurrentFrame();return <Transition kind={scene.kind}><Background/><Header chapter="Para quem cuida"/>
  <Heading phases={[{f:0,lines:['A recepção','no controle.'],size:88},{f:112,lines:['Chame. Atenda.','A fila segue.'],size:82}]}/>
  <Shot scene={scene}/>
  <Guide poses={[{f:0,x:786,y:1400,size:150,turn:5},{f:86,x:786,y:1400,size:150,turn:-6},{f:170,x:786,y:1400,size:150,turn:5},{f:225,x:786,y:1400,size:150,turn:0}]} expression={f<184?'cool':'joy'} reactAt={186}/>
  <Mark scene={scene} box={[43,598,379,40]} start={174} end={190}/>
  </Transition>;}
function CalledV3({scene}){const f=useCurrentFrame();return <Transition kind={scene.kind}><Background/><Header chapter="Cada etapa conectada"/>
  <Heading phases={[{f:0,lines:['Chegou a sua vez.'],size:90}]}/>
  <Shot scene={scene}/>
  <Guide poses={[{f:0,x:790,y:350,size:140,turn:-7},{f:45,x:770,y:400,size:148,turn:3},{f:90,x:720,y:420,size:155,turn:0}]} expression="joy" reactAt={8}/>
  </Transition>;}
function OutroV3(){
  const f=useCurrentFrame(),p=spring({frame:f-6,fps:30,config:{damping:20,stiffness:100,mass:.8}});
  return <Transition kind="depth"><Background/>
    <div style={{position:'absolute',left:82,top:312,overflow:'hidden',opacity:fade(f,14,33),transform:`translateY(${(1-fade(f,14,33))*28}px)`}}><div style={{fontFamily:'Mokoto',fontSize:144,letterSpacing:13}}>VEZZ</div></div>
    <svg style={{position:'absolute',inset:0,width:1080,height:1920,pointerEvents:'none'}}><ellipse cx="520" cy="891" rx={270+f*.08} ry={270+f*.08} fill="none" stroke={cyan} strokeWidth="1" opacity=".18"/><path d="M140 1120C300 1220 760 1190 900 1080" fill="none" stroke={cyan} strokeWidth="1" opacity=".2"/></svg>
    <Bot expression={f<58?'joy':'love'} size={460} x={286} y={650+(1-p)*300} enter={3} reactAt={58} energy={.35} large/>
    <div style={{position:'absolute',left:82,top:1190,width:840}}><Words lines={['Menos espera.','Mais praticidade.']} size={90} start={30}/></div>
    <div style={{position:'absolute',left:86,top:1445,width:800,opacity:fade(f,54,72),transform:`translateY(${(1-fade(f,54,72))*14}px)`}}>
      <div style={{height:1,background:'#a9c3f54d',marginBottom:24,transform:`scaleX(${fade(f,50,78)})`,transformOrigin:'left'}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:35}}><span>Conheça a plataforma.</span><span style={{color:cyan,fontSize:42}}>↗</span></div>
    </div>
  </Transition>;
}
const components={home:HomeV3,journey:JourneyV3,search:SearchV3,booking:BookingV3,patient:PatientV3,manager:ManagerV3,called:CalledV3};
function SceneNode({scene}){const f=useCurrentFrame(),Component=components[scene.name];return f>=scene.dur?<Freeze frame={scene.dur-1}><Component scene={scene}/></Freeze>:<Component scene={scene}/>;}
export function ReelV3(){const f=useCurrentFrame();return <AbsoluteFill className="reel">
  <Fonts/><div style={{position:'absolute'}} dangerouslySetInnerHTML={{__html:BOT_SPRITE}}/><Background/>
  <Audio src={staticFile('audio/vezz-mix-v3.wav')} volume={.97}/>
  <Sequence from={0} durationInFrames={157}><HoldTail component={IntroV3} duration={135}/></Sequence>
  {V3_SCENES.map(scene=><Sequence key={scene.name} from={scene.from} durationInFrames={scene.dur+22}><SceneNode scene={scene}/></Sequence>)}
  <Sequence from={1632} durationInFrames={168}><OutroV3/></Sequence>
  {f>=840&&f<1632?<div data-editorial="demo" style={{position:'absolute',left:82,top:1613,fontSize:23,color:sky}}>Ambiente de demonstração · dados fictícios.</div>:null}
  <div style={{position:'absolute',left:0,top:0,width:1080,height:4,background:'#0b3b8f'}}><div style={{height:4,width:1080*f/1799,background:cyan,opacity:.65}}/></div>
  </AbsoluteFill>;}
// Shared shots also serve the shorter edit; the V3 timeline stays unchanged.
export {IntroV3,HomeV3,SearchV3,BookingV3,PatientV3,ManagerV3,CalledV3,OutroV3};

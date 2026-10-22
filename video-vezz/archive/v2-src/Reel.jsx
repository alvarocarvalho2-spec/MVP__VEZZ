import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Audio,Freeze,OffthreadVideo,Sequence,staticFile,useCurrentFrame,interpolate,spring,delayRender,continueRender} from 'remotion';
import {BOT_SPRITE} from './bot.generated.js';
import './style.css';

const C={navy:'#061b4f',royal:'#0b3b8f',cyan:'#3fe6ff',white:'#f8faff',sky:'#a9c3f5'};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mix=(t,range,values)=>interpolate(t,range,values,{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const scenes=[
  {name:'home',from:135,dur:270},
  {name:'journey',from:405,dur:450},
  {name:'search',from:855,dur:165},
  {name:'booking',from:1020,dur:192},
  {name:'patient',from:1212,dur:105},
  {name:'manager',from:1317,dur:225},
  {name:'called',from:1542,dur:90},
];
function Fonts(){
  const [handle]=useState(()=>delayRender('VEZZ local fonts'));
  useEffect(()=>{Promise.all([
    new FontFace('Source Sans 3',`url(${staticFile('brand/source-sans-400.woff2')})`,{weight:'400'}),
    new FontFace('Source Sans 3',`url(${staticFile('brand/source-sans-600.woff2')})`,{weight:'600'}),
    new FontFace('Source Sans 3',`url(${staticFile('brand/source-sans-700.woff2')})`,{weight:'700'}),
    new FontFace('Mokoto',`url(${staticFile('brand/Mokoto.ttf')})`),
  ].map(font=>font.load().then(f=>document.fonts.add(f)))).then(()=>continueRender(handle));},[handle]);
  return null;
}
function Bot({expression='calm',size=180,x=90,y=1340,enter=0,turn=0,large=false}){
  const f=useCurrentFrame();
  const p=spring({frame:f-enter,fps:30,config:{damping:15,stiffness:95,mass:.85}});
  const floating=Math.sin(f/18)*7;
  const squash=1+.025*Math.sin((f-enter)/5)*Math.exp(-Math.max(0,f-enter)/22);
  return <div style={{position:'absolute',left:x,top:y,width:size,height:size,opacity:clamp(p),transform:`translateY(${(1-p)*100+floating}px) rotate(${turn+Math.sin(f/34)*2}deg) scale(${(.72+.28*p)*squash},${(.72+.28*p)/squash})`,filter:large?'drop-shadow(0 0 38px #3fe6ff33)':'drop-shadow(0 0 18px #3fe6ff2b)'}}>
    <svg width="100%" height="100%" viewBox="0 0 200 200"><use href={'#bot-'+expression}/></svg>
  </div>;
}
function Background({light=false}){
  const f=useCurrentFrame();
  return <AbsoluteFill style={{background:light?'#e9effb':C.navy,overflow:'hidden'}}>
    <div style={{position:'absolute',inset:-300,background:'radial-gradient(ellipse at 72% 44%,#1552b76b,transparent 53%),radial-gradient(ellipse at 20% 75%,#0a437b6b,transparent 55%)',transform:`translate(${Math.sin(f/140)*36}px,${Math.cos(f/160)*28}px)`}}/>
    <div className="grid" style={{transform:`perspective(1100px) rotateX(57deg) rotateZ(-18deg) translateY(${(f%600)*.25}px)`,opacity:.18}}/>
    {[0,1,2].map(i=><div key={i} className="orbit" style={{width:950+i*180,height:950+i*180,top:510-i*90,left:65-i*90,transform:`rotate(${f*.035+i*23}deg) scale(${1+.02*Math.sin(f/110)})`,opacity:.15-i*.03}}/>)}
    <div className="vignette"/>
  </AbsoluteFill>;
}
function Brand({small=true}){return <div style={{fontFamily:'Mokoto',fontSize:small?32:112,letterSpacing:small?5:14,color:C.white}}>VEZZ</div>;}
function Topbar({chapter}){return <div className="topbar"><Brand/><div className="chapter"><i/>{chapter}</div></div>;}
function Words({lines,start=8,size=88,color=C.white}){
  const f=useCurrentFrame();let wordIndex=0;
  return <div style={{fontSize:size,lineHeight:1.02,fontWeight:700,letterSpacing:-2.8,color}}>{lines.map((line,i)=><div className="text-line" key={i}>{line.split(' ').map((word,j)=>{
    const k=wordIndex++;const p=ease((f-start-k*2.6)/16);
    return <span key={j} style={{display:'inline-block',transform:`translateY(${(1-p)*115}%) rotate(${(1-p)*3}deg)`,opacity:p,marginRight:'.19em'}}>{word}</span>;
  })}</div>)}</div>;
}
function Caption({text,start=16,y=565}){const f=useCurrentFrame();const p=ease((f-start)/18);return <div style={{position:'absolute',left:86,top:y,color:C.sky,fontSize:30,lineHeight:1.25,opacity:p,transform:`translateY(${(1-p)*14}px)`,maxWidth:800}}>{text}</div>;}
function Intro(){
  const f=useCurrentFrame();const fly=ease((f-104)/31);
  const angle=mix(f,[0,40,105],[240,70,0]);
  return <AbsoluteFill style={{overflow:'hidden'}}>
    <Background/>
    <svg className="intro-streak" viewBox="0 0 1080 1920"><defs><linearGradient id="beam"><stop stopColor={C.cyan} stopOpacity="0"/><stop offset=".8" stopColor={C.cyan}/><stop offset="1" stopColor="white"/></linearGradient></defs>
      <path d="M-100 1250 C150 1000 120 650 560 540 S1160 370 1240 150" stroke="url(#beam)" strokeWidth="3" fill="none" strokeDasharray="1800" strokeDashoffset={mix(f,[0,75],[1800,0])}/>
      <path d="M-160 1300 C150 1000 120 700 560 590 S1150 420 1300 180" stroke={C.cyan} opacity=".14" strokeWidth="1" fill="none"/>
    </svg>
    <div style={{position:'absolute',left:86,top:310,opacity:1-fly,transform:`translateY(${-fly*100}px)`}}><Words lines={['E se esperar','atendimento fosse','mais simples?']} size={88} start={11}/></div>
    <Bot expression={f<67?'thinking':'joy'} size={440+fly*420} x={294-fly*80} y={830-fly*200} enter={10} turn={mix(f,[0,50],[12,-4])} large/>
    <div style={{position:'absolute',left:0,right:90,top:1330,display:'flex',justifyContent:'center',opacity:ease((f-57)/22)*(1-fly),transform:`translateY(${(1-ease((f-57)/22))*30}px)`}}><Brand small={false}/></div>
    <div style={{position:'absolute',left:90,top:1500,color:C.sky,fontSize:29,opacity:ease((f-75)/20)*(1-fly)}}>Seu tempo merece esse cuidado.</div>
    <div style={{position:'absolute',width:1500,height:1500,borderRadius:'50%',border:`${3+fly*30}px solid ${C.cyan}`,left:-210,top:80,transform:`rotate(${angle}deg) scale(${mix(f,[0,75,135],[.02,.85,2.4])})`,opacity:mix(f,[0,25,108,135],[0,.25,.12,0]),boxShadow:'0 0 80px #3fe6ff55'}}/>
    <div style={{position:'absolute',inset:0,background:'#b6f5ff',opacity:Math.sin(fly*Math.PI)*.28}}/>
  </AbsoluteFill>;
}
function Film({name,w=960,h=800,x=60,y=590,sourceW=1200,sourceH=1000,cam={z:1,px:0,py:0},tilt=0,crop=0}){
  const f=useCurrentFrame();const settle=spring({frame:f,fps:30,config:{damping:24,stiffness:100}});
  return <div style={{position:'absolute',left:x,top:y,width:w,height:h+38,transform:`perspective(1800px) rotateY(${tilt}deg) rotateX(${(1-settle)*7}deg) rotateZ(${(1-settle)*-1.2}deg) translateY(${(1-settle)*60}px) scale(${.97+.03*settle})`,borderRadius:29,boxShadow:'0 32px 100px #00071b88,0 0 65px #3fe6ff15',border:'1px solid #bddbff50',overflow:'hidden',background:C.navy}}>
    <div className="film-chrome"><div style={{display:'flex',gap:7}}>{['#91a8c9','#7399c8','#3fe6ff'].map(c=><i key={c} style={{width:7,height:7,borderRadius:20,background:c}}/>)}</div><span>VEZZ</span><span style={{color:'#bdd6f6'}}>Demonstração local</span></div>
    <div style={{height:h,width:w,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',width:w,height:w*sourceH/sourceW,top:-crop,transform:`translate(${cam.px||0}px,${cam.py||0}px) scale(${cam.z||1})`,transformOrigin:'50% 50%',overflow:'hidden'}}>
        <OffthreadVideo muted src={staticFile('footage/'+name+'.mp4')} style={{width:'100%',height:'100%',display:'block',transform:'scale(1.035)'}}/>
      </div>
    </div>
  </div>;
}
function Trace({f,dur}){return <div style={{position:'absolute',left:86,right:168,top:1565,height:2,background:'#a9c3f529'}}><div style={{width:`${clamp(f/dur)*100}%`,height:2,background:C.cyan,boxShadow:'0 0 12px #3fe6ff'}}/></div>;}
function Mask({children}){
  const f=useCurrentFrame();const p=ease(f/14);
  return <AbsoluteFill style={{clipPath:`circle(${p*2200}px at 25% 55%)`}}>{children}<div style={{position:'absolute',width:160,height:2400,background:'linear-gradient(90deg,transparent,#3fe6ff70,transparent)',left:-350+p*1900,top:-200,transform:'rotate(-20deg)',opacity:Math.sin(p*Math.PI)*.65,pointerEvents:'none'}}/></AbsoluteFill>;
}
function Home(){const f=useCurrentFrame();return <Mask><Background/><Topbar chapter="Conheça o VEZZ"/>
  <div className="headline"><Words lines={f<155?['Menos espera.','Mais cuidado.']:['Seu próximo','cuidado começa aqui.']} size={f<155?100:85} start={f<155?8:155}/></div>
  <Caption text={f<155?'Uma plataforma. Cada etapa conectada.':'Encontre clínicas e explore as possibilidades.'}/>
  <Film name="home" w={1030} h={810} x={24} y={650} cam={{z:mix(f,[0,95,155,230,270],[1.02,1.30,1.07,1.03,1.1]),px:mix(f,[0,95,155,270],[0,-95,0,18]),py:mix(f,[0,95,155,270],[0,15,0,-14])}} tilt={mix(f,[0,125,270],[-3,1,-1])}/>
  <Bot expression={f<125?'calm':'thinking'} size={155} x={75} y={1405} enter={12}/>
  <Trace f={f} dur={270}/>
  </Mask>;}
const journeyTitles=[['Agende.','Do seu jeito.'],['Entre na fila.','Sem complicar.'],['Acompanhe.','Em tempo real.'],['É a sua vez.','Pode chegar.']];
function Journey(){
  const f=useCurrentFrame();const cuts=[0,120,225,330,450];const index=f<120?0:f<225?1:f<330?2:3;
  const local=f-cuts[index];const z=1.04+ease((local-22)/55)*.64;
  return <Mask><Background/><Topbar chapter="Do agendamento ao atendimento"/>
    <div className="headline"><Words lines={journeyTitles[index]} start={cuts[index]+2} size={index===1?88:100}/></div>
    <div className="journey-dots">{journeyTitles.map((_,i)=><div key={i} style={{color:i===index?C.cyan:'#819bc0'}}><i style={{background:i<=index?C.cyan:'#244478'}}/>{['Agendar','Entrar','Acompanhar','Sua vez'][i]}</div>)}</div>
    <Film name="journey" w={1030} h={720} x={24} y={650} crop={190} cam={{z,px:-ease((local-22)/55)*430,py:ease((local-22)/55)*-5}} tilt={Math.sin(f/95)*1.3}/>
    <Bot expression={['thinking','calm','surprised','joy'][index]} size={175} x={75} y={1370} enter={4} turn={index===3?-6:2}/>
    <div style={{position:'absolute',left:290,top:1430,fontSize:30,color:C.sky,width:590}}>{['Escolha a clínica, o dia e o horário.','No dia, sua senha entra automaticamente.','Veja sua posição e a espera estimada.','O VEZZ avisa quando chegar a hora.'][index]}</div>
    <Trace f={f} dur={450}/>
  </Mask>;
}
function Search(){const f=useCurrentFrame();return <Mask><Background/><Topbar chapter="Na prática"/>
  <div className="headline"><Words lines={['Encontre','seu cuidado.']} size={100}/></div>
  <Caption text="Pesquise por clínica ou especialidade."/>
  <Film name="search" w={842} h={895} x={76} y={620} sourceW={640} cam={{z:mix(f,[0,80,165],[1.01,1.05,1]),px:0,py:mix(f,[0,80,165],[-55,-80,-150])}} tilt={mix(f,[0,165],[2,-1])}/>
  <Bot expression="thinking" size={155} x={785} y={1350} enter={12}/>
  </Mask>;}
function Booking(){const f=useCurrentFrame();const confirmed=f>118;return <Mask><Background/><Topbar chapter="Agendamento de demonstração"/>
  <div className="headline"><Words lines={confirmed?['Pronto.','Consulta agendada.']:['Seu horário.','Sua escolha.']} size={confirmed?88:100} start={confirmed?118:8}/></div>
  <Film name="booking" w={842} h={965} x={76} y={570} sourceW={640} crop={110} cam={{z:mix(f,[0,70,115,150,192],[1,1.06,1.02,1,1.01]),px:0,py:mix(f,[0,80,115,140],[-5,-15,-8,65])}} tilt={mix(f,[0,192],[-1.8,1])}/>
  <Bot expression={confirmed?'joy':f>60?'surprised':'thinking'} size={145} x={790} y={1345} enter={4}/>
  </Mask>;}
function Patient(){const f=useCurrentFrame();return <Mask><Background/><Topbar chapter="Painel do paciente"/>
  <div className="headline"><Words lines={['A fila anda.','Você acompanha.']} size={91} start={3}/></div>
  <Film name="patient" w={842} h={960} x={76} y={575} sourceW={640} crop={60} cam={{z:mix(f,[0,105],[1,1.04]),px:0,py:0}}/>
  <Bot expression="calm" size={145} x={790} y={1350} enter={4}/>
  </Mask>;}
function Manager(){const f=useCurrentFrame();const second=f>95;return <Mask><Background/><Topbar chapter="Para quem cuida"/>
  <div className="headline"><Words lines={second?['Chame. Atenda.','Siga em frente.']:['A recepção','no controle.']} size={second?89:100} start={second?96:6}/></div>
  <Caption text="Agenda e fila organizadas no mesmo painel."/>
  <Film name="manager" w={1010} h={750} x={30} y={650} sourceW={1000} crop={40} cam={{z:mix(f,[0,75,120,225],[1,1.02,1.12,1.16]),px:mix(f,[0,75,125,225],[0,0,58,65]),py:mix(f,[0,225],[0,12])}} tilt={mix(f,[0,225],[1.5,-1.2])}/>
  <Bot expression={f>175?'joy':'cool'} size={170} x={78} y={1390} enter={4}/>
  <Trace f={f} dur={225}/>
  </Mask>;}
function Called(){const f=useCurrentFrame();return <Mask><Background/><Topbar chapter="Cada etapa conectada"/>
  <div className="headline"><Words lines={['Chegou','a sua vez.']} size={110} start={0}/></div>
  <Film name="called" w={842} h={930} x={76} y={580} sourceW={640} crop={80} cam={{z:mix(f,[0,90],[1.01,1.05]),py:0,px:0}}/>
  <Bot expression="joy" size={180} x={748} y={1330} enter={0} turn={-6}/>
  <svg style={{position:'absolute',left:0,top:0,width:1080,height:1920,pointerEvents:'none'}}><circle cx="500" cy="1060" r={170+f*8} fill="none" stroke={C.cyan} strokeWidth="2" opacity={.25*(1-clamp(f/75))}/></svg>
  </Mask>;}
function Outro(){const f=useCurrentFrame();return <Mask><Background/>
  <div style={{position:'absolute',left:84,top:310,opacity:ease(f/18)}}><Brand small={false}/></div>
  <div style={{position:'absolute',left:85,top:520}}><Words lines={['Menos espera,','mais praticidade.']} start={9} size={94}/></div>
  <div style={{position:'absolute',width:550,height:550,left:245,top:830,border:'1px solid #3fe6ff3d',borderRadius:'50%',transform:`rotate(${f*.35}deg) scale(${1+Math.sin(f/30)*.025})`}}><div style={{position:'absolute',width:13,height:13,borderRadius:'50%',background:C.cyan,top:88,left:58,boxShadow:'0 0 24px #3fe6ff'}}/></div>
  <Bot expression={f<50?'joy':'love'} size={420} x={295} y={870} enter={5} turn={-3} large/>
  <div style={{position:'absolute',left:86,top:1390,width:806,opacity:ease((f-55)/22),transform:`translateY(${(1-ease((f-55)/22))*20}px)`}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'28px 0',borderTop:'1px solid #a9c3f55c',borderBottom:'1px solid #a9c3f52d',fontSize:38,color:C.white}}><span>Conheça a plataforma.</span><span style={{color:C.cyan,fontSize:46}}>↗</span></div>
    <div style={{fontSize:25,color:C.sky,marginTop:23}}>Para pacientes. Para clínicas. Para o seu tempo.</div>
  </div>
  <div style={{position:'absolute',inset:0,background:C.navy,opacity:mix(f,[155,168],[0,.6])}}/>
  </Mask>;}
function HoldTail({component:Component,duration}){const f=useCurrentFrame();return f>=duration?<Freeze frame={duration-1}><Component/></Freeze>:<Component/>;}
export function Reel(){const f=useCurrentFrame();return <AbsoluteFill className="reel">
  <Fonts/><div style={{position:'absolute'}} dangerouslySetInnerHTML={{__html:BOT_SPRITE}}/>
  <Background/>
  <Audio src={staticFile('audio/vezz-mix.wav')} volume={.97}/>
  <Sequence from={0} durationInFrames={149}><HoldTail component={Intro} duration={135}/></Sequence>
  {scenes.map((s,i)=>{const Component=[Home,Journey,Search,Booking,Patient,Manager,Called][i];return <Sequence key={s.name} from={s.from} durationInFrames={s.dur+14}><HoldTail component={Component} duration={s.dur}/></Sequence>;})}
  <Sequence from={1632} durationInFrames={168}><Outro/></Sequence>
  <div style={{position:'absolute',left:0,top:0,width:1080,height:6,background:'#0b3b8f'}}><div style={{height:6,width:1080*f/1799,background:C.cyan,opacity:.75}}/></div>
  {f>=855&&f<1632?<div style={{position:'absolute',left:86,top:1585,color:C.sky,fontSize:23}}>Ambiente de demonstração · dados fictícios.</div>:null}
  </AbsoluteFill>;}

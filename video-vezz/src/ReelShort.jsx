import React from 'react';
import {AbsoluteFill,Audio,Freeze,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {Fonts,Background} from './Reel.jsx';
import {BOT_SPRITE} from './bot.generated.js';
import {IntroV3,HomeV3,SearchV3,BookingV3,PatientV3,ManagerV3,CalledV3,OutroV3} from './ReelV3.jsx';
import {SHORT_SCENES,SHORT_INTRO,SHORT_OUTRO_FROM,SHORT_DURATION,SHORT_TRANSITION} from './direction-short.mjs';

const components={home:HomeV3,search:SearchV3,booking:BookingV3,patient:PatientV3,manager:ManagerV3,called:CalledV3};

// Retime only vector brand graphics. Product footage keeps its original
// cadence, camera choreography and event-to-caption synchronization.
function BrandShot({component:Component,sourceFrames,duration}){
  const f=useCurrentFrame();
  const frame=Math.min(sourceFrames-1,Math.round(f*sourceFrames/duration));
  return <Freeze frame={frame}><Component/></Freeze>;
}
function ProductShot({scene}){
  const f=useCurrentFrame(),Component=components[scene.name];
  return f>=scene.dur?<Freeze frame={scene.dur-1}><Component scene={scene}/></Freeze>:<Component scene={scene}/>;
}
export function ReelShort(){
  const f=useCurrentFrame();
  return <AbsoluteFill className="reel">
    <Fonts/><div style={{position:'absolute'}} dangerouslySetInnerHTML={{__html:BOT_SPRITE}}/><Background/>
    <Audio src={staticFile('audio/vezz-mix-short.wav')} volume={.97}/>
    <Sequence from={0} durationInFrames={SHORT_INTRO+SHORT_TRANSITION}>
      <BrandShot component={IntroV3} sourceFrames={135} duration={SHORT_INTRO}/>
    </Sequence>
    {SHORT_SCENES.map(scene=><Sequence key={scene.name} from={scene.from} durationInFrames={scene.dur+SHORT_TRANSITION}><ProductShot scene={scene}/></Sequence>)}
    <Sequence from={SHORT_OUTRO_FROM} durationInFrames={SHORT_DURATION-SHORT_OUTRO_FROM}>
      <BrandShot component={OutroV3} sourceFrames={168} duration={SHORT_DURATION-SHORT_OUTRO_FROM}/>
    </Sequence>
    {f>=180&&f<SHORT_OUTRO_FROM?<div data-editorial="demo" style={{position:'absolute',left:82,top:1613,fontSize:23,color:'#a9c3f5'}}>Ambiente de demonstração · dados fictícios.</div>:null}
    <div style={{position:'absolute',left:0,top:0,width:1080,height:4,background:'#0b3b8f'}}><div style={{height:4,width:1080*f/(SHORT_DURATION-1),background:'#3fe6ff',opacity:.65}}/></div>
  </AbsoluteFill>;
}

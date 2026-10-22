import {V3_SCENES,V3_CUES,k} from './direction-v3.mjs';

export const SHORT_FPS=30;
export const SHORT_INTRO=75;
export const SHORT_OUTRO_FROM=972;
export const SHORT_DURATION=1110;
export const SHORT_TRANSITION=22;

// Remove the explanatory journey that repeats the practical demonstrations.
// Keep every practical shot at its existing playback speed, including the
// readable 0.875x patient shot. Only home and brand graphics are shortened.
const starts={home:75,search:180,booking:345,patient:537,manager:657,called:882};
export const SHORT_SCENES=V3_SCENES.filter(s=>s.name!=='journey').map(scene=>({
  ...scene,
  from:starts[scene.name],
  ...(scene.name==='home'?{dur:105,x:40,y:570,w:1000,h:860,keys:[
    k(0,1.48,850,470),k(28,1.48,850,470),
    k(85,.87,600,500),k(105,.87,600,500),
  ]}:{}),
}));

const shift=(t,sourceStart,targetStart)=>t-sourceStart+targetStart;
export const SHORT_CUES={
  transitions:[...SHORT_SCENES.map(s=>s.from/SHORT_FPS),SHORT_OUTRO_FROM/SHORT_FPS],
  stageChanges:[],
  clicks:[
    ...V3_CUES.clicks.filter(t=>t>=28&&t<43.9).map(t=>shift(t,28,6)),
    // Exact manager clicks from the existing, verified local capture.
    ...[.961488,2.2685491,3.528629,4.7250132,5.9266526].map(t=>21.9+t),
  ],
  selection:shift(V3_CUES.selection,33.5,11.5),
  confirmation:shift(V3_CUES.confirmation,33.5,11.5),
  called:shift(V3_CUES.called,51.4,29.4),
  brand:32.4+23/30*138/168,
};

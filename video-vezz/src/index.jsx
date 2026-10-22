import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Reel} from './Reel.jsx';
import {ReelV3} from './ReelV3.jsx';
import {ReelShort} from './ReelShort.jsx';
import {SHORT_DURATION,SHORT_FPS} from './direction-short.mjs';
registerRoot(()=> <><Composition id="VEZZ-Reel" component={Reel} durationInFrames={1800} fps={30} width={1080} height={1920}/><Composition id="VEZZ-Reel-V3" component={ReelV3} durationInFrames={1800} fps={30} width={1080} height={1920}/><Composition id="VEZZ-Reel-Curto" component={ReelShort} durationInFrames={SHORT_DURATION} fps={SHORT_FPS} width={1080} height={1920}/></>);

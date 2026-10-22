import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Reel} from './Reel.jsx';
registerRoot(()=> <Composition id="VEZZ-Reel" component={Reel} durationInFrames={1800} fps={30} width={1080} height={1920}/>);

import assert from 'node:assert/strict';
import { buildJourneyTimeline, journeyFrame, smoothRange } from '../js/lib/motion-timing.js';

const metrics = [{ words: 38, details: 4 }, { words: 30, details: 1 }, { words: 28, details: 2 }, { words: 23, details: 0 }];
for (const height of [554, 672, 804, 1600]) {
  const timeline = buildJourneyTimeline(metrics, height);
  assert.equal(timeline.steps.length, 4);
  assert.ok(timeline.steps[0].hold > timeline.steps[3].hold || timeline.steps[0].hold === 480);
  for (let index = 0; index < 4; index++) {
    const step = timeline.steps[index];
    assert.ok(step.hold >= 280 && step.hold <= 480);
    for (const d of [step.enterEnd, (step.enterEnd + step.holdEnd) / 2, step.holdEnd]) {
      const state = journeyFrame(timeline, d);
      assert.equal(state.active, index);
      assert.equal(state.frames[index].opacity, 1);
      assert.equal(state.frames[index].copy, 1);
      assert.equal(state.frames[index].bot, 1);
      assert.equal(state.frames[index].mock, 1);
    }
    if (index < 3) assert.equal(step.exitEnd, timeline.steps[index + 1].enterEnd);
  }
  // Slow, fast and reversed sampling must all produce a visible, bounded composition.
  for (const distances of [Array.from({ length: 251 }, (_, i) => timeline.total * i / 250), [0, timeline.total * .8, timeline.total * .15, timeline.total, 0]]) {
    for (const d of distances) {
      const state = journeyFrame(timeline, d);
      assert.ok(state.progress >= 0 && state.progress <= 1);
      assert.ok(state.frames.filter(frame => frame.opacity > 0).length <= 2);
      assert.ok(Math.abs(state.frames.reduce((sum, frame) => sum + frame.opacity, 0) - 1) < .00001);
    }
  }
  assert.equal(journeyFrame(timeline, timeline.total + 100).frames[3].opacity, 1);
  assert.equal(journeyFrame(timeline, -100).active, 0);
  console.log(`PASS: timeline at stage height ${height}px, holds, transitions, jumps and reverse`);
}
assert.equal(smoothRange(0, 100, -10), 0);
assert.equal(smoothRange(0, 100, 110), 1);
console.log('PASS: bounded easing');

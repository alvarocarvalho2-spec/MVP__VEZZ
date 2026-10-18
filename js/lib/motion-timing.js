/** Pure geometry for the scroll narrative. Distances are CSS pixels, not time. */
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function smoothRange(start, end, value) {
  const t = clamp((value - start) / Math.max(1, end - start));
  return t * t * (3 - 2 * t);
}

export function buildJourneyTimeline(metrics, stageHeight) {
  const entrance = clamp(stageHeight * .18, 110, 165);
  const transition = clamp(stageHeight * .22, 140, 190);
  const outro = clamp(stageHeight * .16, 105, 160);
  let cursor = entrance;
  const steps = metrics.map(({ words = 0, details = 0 }, index) => {
    const hold = Math.round(clamp(stageHeight * .34 + words * 2 + details * 18, 280, 480));
    const start = index === 0 ? 0 : cursor;
    const enterEnd = index === 0 ? entrance : start + transition;
    const holdEnd = enterEnd + hold;
    cursor = holdEnd;
    return { start, enterEnd, holdEnd, exitEnd: holdEnd + transition, hold };
  });
  return { steps, total: cursor + outro, outro, transition };
}

export function journeyFrame(timeline, distance) {
  const position = clamp(distance, 0, timeline.total);
  let active = 0;
  const frames = timeline.steps.map((step, index) => {
    const duration = step.enterEnd - step.start;
    const enter = smoothRange(step.start, step.enterEnd, position);
    const leave = index === timeline.steps.length - 1 ? 0 : smoothRange(step.holdEnd, step.exitEnd, position);
    if (position >= step.start + duration * .5) active = index;
    const first = index === 0;
    const copyIn = first ? .65 + .35 * enter : smoothRange(step.start + duration * .18, step.start + duration * .5, position);
    const botIn = first ? .15 + .85 * smoothRange(step.start + duration * .12, step.start + duration * .82, position) : smoothRange(step.start + duration * .3, step.start + duration * .68, position);
    const mockIn = first ? .1 + .9 * smoothRange(step.start + duration * .3, step.enterEnd, position) : smoothRange(step.start + duration * .52, step.enterEnd, position);
    const exitDuration = step.exitEnd - step.holdEnd;
    const exiting = index < timeline.steps.length - 1;
    const copyOut = exiting ? 1 - smoothRange(step.holdEnd, step.holdEnd + exitDuration * .18, position) : 1;
    const botOut = exiting ? 1 - smoothRange(step.holdEnd, step.holdEnd + exitDuration * .3, position) : 1;
    const mockOut = exiting ? 1 - smoothRange(step.holdEnd + exitDuration * .08, step.holdEnd + exitDuration * .5, position) : 1;
    return {
      opacity: (first ? 1 : enter) * (1 - leave),
      copy: copyIn * copyOut,
      bot: botIn * botOut,
      mock: mockIn * mockOut,
      copyY: (1 - copyIn) * 16 - leave * 14,
      botY: (1 - botIn) * 24 - leave * 8,
      mockY: (1 - mockIn) * 28 - leave * 12,
      mockScale: .985 + mockIn * .015,
      leave,
    };
  });
  return { active, progress: position / Math.max(1, timeline.total), frames };
}

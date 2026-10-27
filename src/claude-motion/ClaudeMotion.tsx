import React from "react";
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from "remotion";
import {evolvePath, getLength, getPointAtLength} from "@remotion/paths";
import {noise2D} from "@remotion/noise";
import type {TCampaign, TScene} from "./schema";
import {T, prog, reveal, sceneFade, typewriter, typeDuration, timeline, tokenize} from "./motion";

const Background: React.FC = () => {
  const f = useCurrentFrame();
  const x = 50 + noise2D("a", f / 140, 0) * 18;
  const y = 30 + noise2D("b", 0, f / 140) * 14;
  return <AbsoluteFill style={{background:
    `radial-gradient(60% 40% at ${x}% ${y}%, rgba(217,119,87,0.16), transparent 70%), ${T.bg}`}} />;
};

const TitleScene: React.FC<{s: Extract<TScene, {type: "title"}>}> = ({s}) => (
  <AbsoluteFill style={{justifyContent: "center", padding: 90, gap: 28}}>
    {s.eyebrow && <div style={{...reveal(useCurrentFrame(), 0), fontFamily: T.mono, color: T.clay, fontSize: 34, letterSpacing: 4}}>{s.eyebrow.toUpperCase()}</div>}
    <div style={{...reveal(useCurrentFrame(), 8, 22), fontFamily: T.serif, color: T.cream, fontSize: 104, lineHeight: 1.08}}>{s.headline}</div>
    {s.sub && <div style={{...reveal(useCurrentFrame(), 24), fontFamily: T.serif, color: T.muted, fontSize: 44, lineHeight: 1.3}}>{s.sub}</div>}
  </AbsoluteFill>
);

const TerminalScene: React.FC<{s: Extract<TScene, {type: "terminal"}>}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  let t = 12; // running start frame for each line
  return (
    <AbsoluteFill style={{justifyContent: "center", padding: 60}}>
      <div style={{...reveal(f, 0), background: T.panel, borderRadius: 28, padding: 48, fontFamily: T.mono, fontSize: 38, lineHeight: 1.6, border: "1px solid #3a3730"}}>
        {s.lines.map((l, i) => {
          const start = t;
          const text = l.kind === "cmd" ? "$ " + l.text : l.text;
          t += (l.kind === "cmd" ? typeDuration(text, 28, fps) : 8) + 10;
          const shown = l.kind === "cmd" ? typewriter(text, f, start, 28, fps) : f >= start ? text : "";
          return (
            <div key={i} style={{minHeight: 61, color: l.kind === "out" ? T.muted : T.cream}}>
              {l.kind === "cmd"
                ? tokenize(shown).map((k, j) => <span key={j} style={{color: k.color}}>{k.w} </span>)
                : shown}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const DiagramScene: React.FC<{s: Extract<TScene, {type: "diagram"}>}> = ({s}) => {
  const f = useCurrentFrame();
  const W = 1080, H = 1920;
  const pos = Object.fromEntries(s.nodes.map((n) => [n.id, {x: n.x / 100 * W, y: n.y / 100 * H}]));
  const edgePath = (a: string, b: string) => {
    const p = pos[a], q = pos[b];
    return `M ${p.x} ${p.y} C ${p.x} ${(p.y + q.y) / 2}, ${q.x} ${(p.y + q.y) / 2}, ${q.x} ${q.y}`;
  };
  return (
    <AbsoluteFill>
      <svg width={W} height={H}>
        {s.edges.map(([a, b], i) => {
          const d = edgePath(a, b);
          const p = prog(f, 20 + i * 10, 30);
          const ev = evolvePath(p, d);
          const len = getLength(d);
          const pulse = getPointAtLength(d, ((f - 50 - i * 10) % 60 + 60) % 60 / 60 * len);
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={T.clay} strokeWidth={5} strokeLinecap="round" {...ev} />
              {p >= 1 && <circle cx={pulse.x} cy={pulse.y} r={10} fill={T.cream} />}
            </g>
          );
        })}
        {s.nodes.map((n, i) => {
          const p = prog(f, i * 8, 20);
          return (
            <g key={n.id} opacity={p} transform={`translate(${pos[n.id].x} ${pos[n.id].y}) scale(${0.9 + 0.1 * p})`}>
              <rect x={-150} y={-52} width={300} height={104} rx={26} fill={T.panel} stroke={T.clay} strokeWidth={3} />
              <text textAnchor="middle" y={14} fontFamily={T.mono} fontSize={34} fill={T.cream}>{n.label}</text>
            </g>
          );
        })}
      </svg>
      {s.caption && <div style={{...reveal(f, 40), position: "absolute", bottom: 150, width: "100%", textAlign: "center", fontFamily: T.serif, fontSize: 52, color: T.muted}}>{s.caption}</div>}
    </AbsoluteFill>
  );
};

const Scene: React.FC<{s: TScene; frames: number}> = ({s, frames}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity: sceneFade(f, frames)}}>
      {s.type === "title" && <TitleScene s={s} />}
      {s.type === "terminal" && <TerminalScene s={s} />}
      {s.type === "diagram" && <DiagramScene s={s} />}
    </AbsoluteFill>
  );
};

export const ClaudeMotion: React.FC<{campaign: TCampaign}> = ({campaign}) => {
  const {scenes} = timeline(campaign);
  return (
    <AbsoluteFill>
      <Background />
      {scenes.map(({scene, from, frames}, i) => (
        <Sequence key={i} from={from} durationInFrames={frames}>
          <Scene s={scene} frames={frames} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

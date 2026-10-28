import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import { noise2D } from "@remotion/noise";
import type { TCampaign, TImg, TScene } from "./schema";
import {
  getTheme,
  prog,
  reveal,
  sceneFade,
  timeline,
  tokenize,
  typeDuration,
  typewriter,
} from "./motion";

// Helper to resolve local files from public/ or pass full URLs through
const resolveAsset = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  return staticFile(path);
};

const resolveSfx = (name: string): string => {
  if (name.startsWith("http://") || name.startsWith("https://")) return name;
  const filename = name.endsWith(".wav") || name.endsWith(".mp3") ? name : `${name}.wav`;
  const relativePath = filename.includes("/") ? filename : `sfx/${filename}`;
  return staticFile(relativePath);
};

// Ambient animated background
const Background: React.FC<{ theme: ReturnType<typeof getTheme> }> = ({ theme }) => {
  const f = useCurrentFrame();
  const x = 50 + noise2D("a", f / 140, 0) * 18;
  const y = 30 + noise2D("b", 0, f / 140) * 14;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(65% 45% at ${x}% ${y}%, rgba(217,119,87,0.18), transparent 70%), ${theme.bg}`,
      }}
    />
  );
};

// Scene Image Overlay with animation
const SceneImage: React.FC<{ img: TImg; scale: number }> = ({ img, scale }) => {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const p = prog(f, 6, 20);

  let animStyle: React.CSSProperties = { opacity: p };
  if (img.anim === "pop") {
    animStyle = {
      opacity: p,
      transform: `translate(-50%, -50%) scale(${0.4 + 0.6 * p})`,
    };
  } else if (img.anim === "slide") {
    animStyle = {
      opacity: p,
      transform: `translate(-50%, calc(-50% + ${(1 - p) * 40}px))`,
    };
  } else if (img.anim === "float") {
    const floatY = Math.sin(f / 18) * 8 * scale;
    animStyle = {
      opacity: p,
      transform: `translate(-50%, calc(-50% + ${floatY}px))`,
    };
  } else {
    animStyle = {
      opacity: p,
      transform: "translate(-50%, -50%)",
    };
  }

  const pixelWidth = (img.size / 100) * width;

  return (
    <div
      style={{
        position: "absolute",
        left: `${img.x}%`,
        top: `${img.y}%`,
        width: pixelWidth,
        pointerEvents: "none",
        zIndex: 5,
        ...animStyle,
      }}
    >
      <Img
        src={resolveAsset(img.src)}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "contain",
          filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.45))",
        }}
      />
    </div>
  );
};

// 1. Title Scene
const TitleScene: React.FC<{
  s: Extract<TScene, { type: "title" }>;
  theme: ReturnType<typeof getTheme>;
  scale: number;
}> = ({ s, theme, scale }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: 80 * scale,
        gap: 24 * scale,
      }}
    >
      {s.eyebrow && (
        <div
          style={{
            ...reveal(f, 0),
            fontFamily: theme.mono,
            color: theme.clay,
            fontSize: Math.max(20, 32 * scale),
            letterSpacing: 4 * scale,
            textTransform: "uppercase",
          }}
        >
          {s.eyebrow}
        </div>
      )}
      <div
        style={{
          ...reveal(f, 8, 22),
          fontFamily: theme.serif,
          color: theme.cream,
          fontSize: Math.max(48, 96 * scale),
          lineHeight: 1.1,
          fontWeight: 400,
        }}
      >
        {s.headline}
      </div>
      {s.sub && (
        <div
          style={{
            ...reveal(f, 24),
            fontFamily: theme.serif,
            color: theme.muted,
            fontSize: Math.max(24, 42 * scale),
            lineHeight: 1.35,
          }}
        >
          {s.sub}
        </div>
      )}
    </AbsoluteFill>
  );
};

// 2. Terminal Scene
const TerminalScene: React.FC<{
  s: Extract<TScene, { type: "terminal" }>;
  theme: ReturnType<typeof getTheme>;
  scale: number;
}> = ({ s, theme, scale }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  let t = 12;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: 60 * scale,
        gap: 20 * scale,
      }}
    >
      {s.eyebrow && (
        <div
          style={{
            ...reveal(f, 0),
            fontFamily: theme.mono,
            color: theme.clay,
            fontSize: Math.max(18, 28 * scale),
            letterSpacing: 3 * scale,
            textTransform: "uppercase",
          }}
        >
          {s.eyebrow}
        </div>
      )}
      <div
        style={{
          ...reveal(f, 4),
          background: theme.panel,
          borderRadius: 24 * scale,
          padding: 40 * scale,
          fontFamily: theme.mono,
          fontSize: Math.max(18, 34 * scale),
          lineHeight: 1.6,
          border: "1px solid #3a3730",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        {s.lines.map((l, i) => {
          const start = t;
          const text = l.kind === "cmd" ? "$ " + l.text : l.text;
          t += (l.kind === "cmd" ? typeDuration(text, 28, fps) : 8) + 10;
          const shown =
            l.kind === "cmd"
              ? typewriter(text, f, start, 28, fps)
              : f >= start
              ? text
              : "";
          return (
            <div
              key={i}
              style={{
                minHeight: 52 * scale,
                color: l.kind === "out" ? theme.muted : theme.cream,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {l.kind === "cmd"
                ? tokenize(shown).map((k, j) => (
                    <span key={j} style={{ color: k.color }}>
                      {k.w}{" "}
                    </span>
                  ))
                : shown}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 3. Diagram Scene
const DiagramScene: React.FC<{
  s: Extract<TScene, { type: "diagram" }>;
  theme: ReturnType<typeof getTheme>;
  scale: number;
}> = ({ s, theme, scale }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();

  const pos = Object.fromEntries(
    s.nodes.map((n) => [n.id, { x: (n.x / 100) * W, y: (n.y / 100) * H }])
  );

  const edgePath = (a: string, b: string) => {
    const p = pos[a] || { x: W / 2, y: H / 3 };
    const q = pos[b] || { x: W / 2, y: (2 * H) / 3 };
    return `M ${p.x} ${p.y} C ${p.x} ${(p.y + q.y) / 2}, ${q.x} ${(p.y + q.y) / 2}, ${q.x} ${q.y}`;
  };

  const nodeWidth = 260 * scale;
  const nodeHeight = 90 * scale;

  return (
    <AbsoluteFill>
      {s.eyebrow && (
        <div
          style={{
            ...reveal(f, 0),
            position: "absolute",
            top: 70 * scale,
            left: 70 * scale,
            fontFamily: theme.mono,
            color: theme.clay,
            fontSize: Math.max(18, 28 * scale),
            letterSpacing: 3 * scale,
            textTransform: "uppercase",
          }}
        >
          {s.eyebrow}
        </div>
      )}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {s.edges.map(([a, b], i) => {
          if (!pos[a] || !pos[b]) return null;
          const d = edgePath(a, b);
          const p = prog(f, 20 + i * 10, 30);
          const ev = evolvePath(p, d);
          const len = getLength(d);
          const pulse = getPointAtLength(d, (((f - 50 - i * 10) % 60 + 60) % 60 / 60) * len);
          return (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke={theme.clay}
                strokeWidth={4 * scale}
                strokeLinecap="round"
                {...ev}
              />
              {p >= 1 && <circle cx={pulse.x} cy={pulse.y} r={8 * scale} fill={theme.cream} />}
            </g>
          );
        })}
        {s.nodes.map((n, i) => {
          const p = prog(f, i * 8, 20);
          const pPos = pos[n.id];
          if (!pPos) return null;
          return (
            <g
              key={n.id}
              opacity={p}
              transform={`translate(${pPos.x} ${pPos.y}) scale(${0.9 + 0.1 * p})`}
            >
              <rect
                x={-nodeWidth / 2}
                y={-nodeHeight / 2}
                width={nodeWidth}
                height={nodeHeight}
                rx={22 * scale}
                fill={theme.panel}
                stroke={theme.clay}
                strokeWidth={2.5 * scale}
              />
              <text
                textAnchor="middle"
                y={10 * scale}
                fontFamily={theme.mono}
                fontSize={Math.max(16, 28 * scale)}
                fill={theme.cream}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      {s.caption && (
        <div
          style={{
            ...reveal(f, 40),
            position: "absolute",
            bottom: 120 * scale,
            width: "100%",
            textAlign: "center",
            padding: `0 ${40 * scale}px`,
            fontFamily: theme.serif,
            fontSize: Math.max(22, 44 * scale),
            color: theme.muted,
          }}
        >
          {s.caption}
        </div>
      )}
    </AbsoluteFill>
  );
};

// 4. Stat Scene (Metrics & Big Numbers)
const StatScene: React.FC<{
  s: Extract<TScene, { type: "stat" }>;
  theme: ReturnType<typeof getTheme>;
  scale: number;
}> = ({ s, theme, scale }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 70 * scale,
        textAlign: "center",
        gap: 20 * scale,
      }}
    >
      {s.eyebrow && (
        <div
          style={{
            ...reveal(f, 0),
            fontFamily: theme.mono,
            color: theme.clay,
            fontSize: Math.max(18, 30 * scale),
            letterSpacing: 4 * scale,
            textTransform: "uppercase",
          }}
        >
          {s.eyebrow}
        </div>
      )}
      <div
        style={{
          ...reveal(f, 6, 24),
          fontFamily: theme.serif,
          color: theme.cream,
          fontSize: Math.max(72, 140 * scale),
          fontWeight: 600,
          lineHeight: 1.0,
          textShadow: "0 10px 40px rgba(217,119,87,0.3)",
        }}
      >
        {s.value}
      </div>
      <div
        style={{
          ...reveal(f, 18),
          fontFamily: theme.serif,
          color: theme.cream,
          fontSize: Math.max(28, 52 * scale),
          maxWidth: 900 * scale,
          lineHeight: 1.25,
        }}
      >
        {s.label}
      </div>
      {s.sub && (
        <div
          style={{
            ...reveal(f, 26),
            fontFamily: theme.mono,
            color: theme.muted,
            fontSize: Math.max(18, 32 * scale),
            maxWidth: 800 * scale,
            lineHeight: 1.4,
          }}
        >
          {s.sub}
        </div>
      )}
    </AbsoluteFill>
  );
};

// 5. Before vs After Scene
const BeforeAfterScene: React.FC<{
  s: Extract<TScene, { type: "before_after" }>;
  theme: ReturnType<typeof getTheme>;
  scale: number;
}> = ({ s, theme, scale }) => {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const isStacked = width < 1200;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: 60 * scale,
        gap: 30 * scale,
      }}
    >
      {s.eyebrow && (
        <div
          style={{
            ...reveal(f, 0),
            fontFamily: theme.mono,
            color: theme.clay,
            fontSize: Math.max(18, 28 * scale),
            letterSpacing: 3 * scale,
            textTransform: "uppercase",
          }}
        >
          {s.eyebrow}
        </div>
      )}
      {s.headline && (
        <div
          style={{
            ...reveal(f, 6),
            fontFamily: theme.serif,
            color: theme.cream,
            fontSize: Math.max(36, 68 * scale),
            lineHeight: 1.15,
          }}
        >
          {s.headline}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: isStacked ? "column" : "row",
          gap: 24 * scale,
          width: "100%",
        }}
      >
        {/* Before Panel */}
        <div
          style={{
            ...reveal(f, 12),
            flex: 1,
            background: "rgba(38,36,32,0.65)",
            border: "1px solid #36322b",
            borderRadius: 22 * scale,
            padding: 36 * scale,
            display: "flex",
            flexDirection: "column",
            gap: 16 * scale,
          }}
        >
          <div
            style={{
              fontFamily: theme.mono,
              color: "#c25d53",
              fontSize: Math.max(18, 30 * scale),
              fontWeight: 600,
              letterSpacing: 2 * scale,
              textTransform: "uppercase",
            }}
          >
            ✕ {s.beforeTitle}
          </div>
          {s.beforeItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                fontFamily: theme.serif,
                color: theme.muted,
                fontSize: Math.max(18, 32 * scale),
                lineHeight: 1.35,
                textDecoration: "line-through",
                opacity: 0.75,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* After Panel */}
        <div
          style={{
            ...reveal(f, 22),
            flex: 1,
            background: theme.panel,
            border: `2px solid ${theme.clay}`,
            borderRadius: 22 * scale,
            padding: 36 * scale,
            display: "flex",
            flexDirection: "column",
            gap: 16 * scale,
            boxShadow: "0 18px 45px rgba(217,119,87,0.15)",
          }}
        >
          <div
            style={{
              fontFamily: theme.mono,
              color: "#8fc98f",
              fontSize: Math.max(18, 30 * scale),
              fontWeight: 600,
              letterSpacing: 2 * scale,
              textTransform: "uppercase",
            }}
          >
            ✓ {s.afterTitle}
          </div>
          {s.afterItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                fontFamily: theme.serif,
                color: theme.cream,
                fontSize: Math.max(18, 32 * scale),
                lineHeight: 1.35,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 6. List Scene
const ListScene: React.FC<{
  s: Extract<TScene, { type: "list" }>;
  theme: ReturnType<typeof getTheme>;
  scale: number;
}> = ({ s, theme, scale }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: 70 * scale,
        gap: 28 * scale,
      }}
    >
      {s.eyebrow && (
        <div
          style={{
            ...reveal(f, 0),
            fontFamily: theme.mono,
            color: theme.clay,
            fontSize: Math.max(18, 28 * scale),
            letterSpacing: 3 * scale,
            textTransform: "uppercase",
          }}
        >
          {s.eyebrow}
        </div>
      )}
      <div
        style={{
          ...reveal(f, 6),
          fontFamily: theme.serif,
          color: theme.cream,
          fontSize: Math.max(38, 76 * scale),
          lineHeight: 1.15,
        }}
      >
        {s.headline}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 * scale }}>
        {s.items.map((item, i) => (
          <div
            key={i}
            style={{
              ...reveal(f, 16 + i * 8),
              display: "flex",
              alignItems: "center",
              gap: 20 * scale,
              background: theme.panel,
              border: "1px solid #3a3730",
              borderRadius: 18 * scale,
              padding: `${20 * scale}px ${28 * scale}px`,
            }}
          >
            <div
              style={{
                fontFamily: theme.mono,
                color: theme.clay,
                fontSize: Math.max(16, 26 * scale),
                fontWeight: 600,
              }}
            >
              0{i + 1}
            </div>
            <div
              style={{
                fontFamily: theme.serif,
                color: theme.cream,
                fontSize: Math.max(20, 36 * scale),
              }}
            >
              {item}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// 7. Quote Scene
const QuoteScene: React.FC<{
  s: Extract<TScene, { type: "quote" }>;
  theme: ReturnType<typeof getTheme>;
  scale: number;
}> = ({ s, theme, scale }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: 80 * scale,
        gap: 28 * scale,
      }}
    >
      <div
        style={{
          ...reveal(f, 0),
          fontFamily: theme.serif,
          color: theme.clay,
          fontSize: Math.max(64, 120 * scale),
          lineHeight: 0.6,
        }}
      >
        “
      </div>
      <div
        style={{
          ...reveal(f, 6),
          fontFamily: theme.serif,
          color: theme.cream,
          fontSize: Math.max(36, 68 * scale),
          fontStyle: "italic",
          lineHeight: 1.25,
        }}
      >
        {s.quote}
      </div>
      <div
        style={{
          ...reveal(f, 20),
          display: "flex",
          flexDirection: "column",
          gap: 6 * scale,
          borderLeft: `3px solid ${theme.clay}`,
          paddingLeft: 20 * scale,
        }}
      >
        <div
          style={{
            fontFamily: theme.mono,
            color: theme.cream,
            fontSize: Math.max(20, 34 * scale),
            fontWeight: 600,
          }}
        >
          {s.author}
        </div>
        {s.role && (
          <div
            style={{
              fontFamily: theme.mono,
              color: theme.muted,
              fontSize: Math.max(16, 26 * scale),
            }}
          >
            {s.role}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// 8. Call To Action (CTA) Scene
const CtaScene: React.FC<{
  s: Extract<TScene, { type: "cta" }>;
  theme: ReturnType<typeof getTheme>;
  scale: number;
}> = ({ s, theme, scale }) => {
  const f = useCurrentFrame();
  const pulse = 1 + Math.sin(f / 10) * 0.025;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 70 * scale,
        textAlign: "center",
        gap: 30 * scale,
      }}
    >
      {s.eyebrow && (
        <div
          style={{
            ...reveal(f, 0),
            fontFamily: theme.mono,
            color: theme.clay,
            fontSize: Math.max(18, 30 * scale),
            letterSpacing: 4 * scale,
            textTransform: "uppercase",
          }}
        >
          {s.eyebrow}
        </div>
      )}
      <div
        style={{
          ...reveal(f, 6),
          fontFamily: theme.serif,
          color: theme.cream,
          fontSize: Math.max(48, 92 * scale),
          lineHeight: 1.12,
          maxWidth: 960 * scale,
        }}
      >
        {s.headline}
      </div>
      {s.sub && (
        <div
          style={{
            ...reveal(f, 16),
            fontFamily: theme.serif,
            color: theme.muted,
            fontSize: Math.max(22, 40 * scale),
            lineHeight: 1.35,
            maxWidth: 800 * scale,
          }}
        >
          {s.sub}
        </div>
      )}
      <div
        style={{
          ...reveal(f, 24),
          transform: `scale(${pulse})`,
          background: theme.clay,
          color: theme.cream,
          fontFamily: theme.mono,
          fontSize: Math.max(20, 36 * scale),
          fontWeight: 600,
          borderRadius: 999,
          padding: `${22 * scale}px ${56 * scale}px`,
          boxShadow: "0 14px 40px rgba(217,119,87,0.4)",
          letterSpacing: 1.5 * scale,
        }}
      >
        {s.buttonText}
      </div>
    </AbsoluteFill>
  );
};

// Scene Dispatcher
const Scene: React.FC<{
  s: TScene;
  frames: number;
  theme: ReturnType<typeof getTheme>;
  scale: number;
}> = ({ s, frames, theme, scale }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: sceneFade(f, frames) }}>
      {s.type === "title" && <TitleScene s={s} theme={theme} scale={scale} />}
      {s.type === "terminal" && <TerminalScene s={s} theme={theme} scale={scale} />}
      {s.type === "diagram" && <DiagramScene s={s} theme={theme} scale={scale} />}
      {s.type === "stat" && <StatScene s={s} theme={theme} scale={scale} />}
      {s.type === "before_after" && <BeforeAfterScene s={s} theme={theme} scale={scale} />}
      {s.type === "list" && <ListScene s={s} theme={theme} scale={scale} />}
      {s.type === "quote" && <QuoteScene s={s} theme={theme} scale={scale} />}
      {s.type === "cta" && <CtaScene s={s} theme={theme} scale={scale} />}
      {s.image && <SceneImage img={s.image} scale={scale} />}
    </AbsoluteFill>
  );
};

// Main Export
export const ClaudeMotion: React.FC<{ campaign: TCampaign }> = ({ campaign }) => {
  const { width, height } = useVideoConfig();
  const theme = getTheme(campaign.theme);
  const { scenes } = timeline(campaign);
  const scale = Math.min(width, height) / 1080;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <Background theme={theme} />

      {/* Global Background Music */}
      {campaign.audio?.music && (
        <Audio
          src={resolveAsset(campaign.audio.music)}
          volume={campaign.audio.musicVolume ?? 0.35}
          loop
        />
      )}

      {/* Render Scenes in Timeline Sequences */}
      {scenes.map(({ scene, from, frames }, i) => (
        <Sequence key={i} from={from} durationInFrames={frames}>
          {/* Per-scene sound effect */}
          {scene.sfx && campaign.audio?.sfx !== false && (
            <Audio src={resolveSfx(scene.sfx)} />
          )}
          <Scene s={scene} frames={frames} theme={theme} scale={scale} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

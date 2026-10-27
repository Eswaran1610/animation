import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { evolvePath } from "@remotion/paths";
import Prism from "prismjs";
import "prismjs/components/prism-bash";
import { CampaignData, MotionScene } from "./schema";

// =========================================================================
// SVG VECTOR ICONS (Zero external font dependency, 100% deterministic)
// =========================================================================
const IconCheck: React.FC<{ color: string; size?: number }> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconCross: React.FC<{ color: string; size?: number }> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconShield: React.FC<{ color: string; size?: number }> = ({ color, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconAlert: React.FC<{ color: string; size?: number }> = ({ color, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconTerminal: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const IconSparkle: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

// =========================================================================
// SYNTAX HIGHLIGHTING (Prism.js token renderer)
// =========================================================================
function renderSyntaxTokens(text: string) {
  const tokens = Prism.tokenize(text, Prism.languages.bash);
  return tokens.map((token: any, i: number) => {
    if (typeof token === "string") {
      return <span key={i} style={{ color: "#F8FAFC" }}>{token}</span>;
    }
    let color = "#38BDF8";
    if (token.type === "keyword" || token.type === "function") color = "#F43F5E";
    else if (token.type === "string") color = "#10B981";
    else if (token.type === "parameter" || token.type === "variable") color = "#F59E0B";
    else if (token.type === "comment") color = "#64748B";
    return <span key={i} style={{ color, fontWeight: 600 }}>{token.content}</span>;
  });
}

// =========================================================================
// CINEMATIC BACKGROUND: Perlin Volumetric Noise & Deep Obsidian Mesh
// =========================================================================
const CinematicAtmosphere: React.FC<{ theme?: string; primaryColor: string; accentColor: string }> = ({
  theme = "cyber",
  primaryColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const isClaude = theme === "claude";

  // Multi-octave Perlin noise drift
  const x1 = 50 + noise2D("aurora_x", frame / 180, 0) * 22;
  const y1 = 35 + noise2D("aurora_y", 0, frame / 180) * 18;
  const x2 = 50 + noise2D("aurora_x2", frame / 150, 1) * 25;
  const y2 = 70 + noise2D("aurora_y2", 1, frame / 150) * 20;

  const bgBase = isClaude ? "#181714" : theme === "fintech" ? "#060A12" : "#030611";
  const glow1 = isClaude ? "rgba(217, 119, 87, 0.18)" : `${primaryColor}22`;
  const glow2 = isClaude ? "rgba(245, 241, 232, 0.08)" : `${accentColor}18`;

  // Grid line scan drift
  const gridOffsetY = (frame * 0.8) % 60;

  return (
    <AbsoluteFill style={{ backgroundColor: bgBase, overflow: "hidden" }}>
      {/* Volumetric Neon Drift */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(70% 50% at ${x1}% ${y1}%, ${glow1}, transparent 75%),
            radial-gradient(60% 45% at ${x2}% ${y2}%, ${glow2}, transparent 75%)
          `,
        }}
      />

      {/* Cyber Grid Plane with Perspective */}
      {!isClaude && (
        <div
          style={{
            position: "absolute",
            inset: -200,
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            backgroundPosition: `0px ${gridOffsetY}px`,
            transform: "perspective(800px) rotateX(45deg) translateY(-80px)",
            transformOrigin: "center top",
            opacity: 0.7,
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 85%)",
          }}
        />
      )}

      {/* Top and Bottom Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, transparent 30%, rgba(3, 6, 17, 0.85) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

// =========================================================================
// 1. ARCHETYPE: KINETIC HOOK (Massive 3D Typographic Slam - NO PowerPoint)
// =========================================================================
const SceneKineticHook: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const words = scene.headline.split(" ");
  const isClaude = campaign.brand.theme === "claude";

  // Shock impact camera shake
  const impactFrame = 16;
  const shake = frame > impactFrame && frame < impactFrame + 10 ? Math.sin((frame - impactFrame) * 2.5) * 6 : 0;

  // Moving light streak
  const streakX = interpolate(frame, [15, 60], [-100, 200], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 60px",
        textAlign: "center",
        transform: `translate(${shake}px, ${shake * 0.5}px)`,
      }}
    >
      {/* Category Pill with Glowing Pulse */}
      <div
        style={{
          background: `${campaign.brand.primaryColor}18`,
          border: `1px solid ${campaign.brand.primaryColor}88`,
          borderRadius: 9999,
          padding: "10px 28px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: `0 0 35px ${campaign.brand.primaryColor}44`,
          marginBottom: 36,
          transform: `scale(${spring({ frame, fps, config: { damping: 10, stiffness: 120 } })})`,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: campaign.brand.primaryColor, boxShadow: `0 0 10px ${campaign.brand.primaryColor}` }} />
        <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: campaign.brand.primaryColor, fontFamily: isClaude ? "Georgia, serif" : "monospace" }}>
          {scene.tag || "CRITICAL ALERT"}
        </span>
      </div>

      {/* Giant Kinetic Words Slamming Down */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "12px 24px",
          maxWidth: 960,
          perspective: 1000,
        }}
      >
        {words.map((w, i) => {
          const wSpring = spring({ frame: frame - i * 3, fps, config: { damping: 11, stiffness: 140, mass: 0.6 } });
          const wY = interpolate(wSpring, [0, 1], [-60, 0]);
          const wRotX = interpolate(wSpring, [0, 1], [40, 0]);
          const isAccent = scene.accentWord && w.toLowerCase().includes(scene.accentWord.toLowerCase().replace(/[^a-z0-9]/gi, ""));

          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translateY(${wY}px) rotateX(${wRotX}deg)`,
                opacity: wSpring,
                fontSize: words.length > 6 ? 78 : 92,
                fontWeight: isClaude ? 700 : 900,
                letterSpacing: -2,
                lineHeight: 1.08,
                fontFamily: isClaude ? "Georgia, serif" : "inherit",
                color: isAccent ? campaign.brand.primaryColor : "#FFFFFF",
                textShadow: isAccent ? `0 0 50px ${campaign.brand.primaryColor}aa, 0 0 90px ${campaign.brand.primaryColor}44` : "0 10px 30px rgba(0,0,0,0.8)",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>

      {/* 3D Floating Alert Orb / Warning Card */}
      <div
        style={{
          marginTop: 56,
          maxWidth: 880,
          width: "100%",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 28,
          padding: "32px 36px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.6)",
          transform: `perspective(1000px) rotateX(12deg) scale(${spring({ frame: frame - 10, fps, config: { damping: 14 } })})`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Anamorphic light sweep */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${streakX}%`,
            width: 140,
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)",
            transform: "skewX(-25deg)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18, textAlign: "left" }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: `${campaign.brand.primaryColor}22`, border: `1px solid ${campaign.brand.primaryColor}66`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconAlert color={campaign.brand.primaryColor} size={30} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.3 }}>
              {scene.subtitle || scene.description}
            </div>
            {scene.description && scene.subtitle && (
              <div style={{ fontSize: 17, color: "rgba(248, 250, 252, 0.65)", marginTop: 8, lineHeight: 1.4 }}>
                {scene.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 2. ARCHETYPE: 3D BEFORE VS AFTER SPLIT (Floating Isometric Glass)
// =========================================================================
const SceneBeforeAfter: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const ba = scene.beforeAfter || {
    beforeTitle: "Vulnerable Legacy System",
    beforeItems: ["Unvalidated Remote Inputs", "Arbitrary Code Execution Vectors", "Opaque Posture Blindspots"],
    afterTitle: "Autonomous Zero-Trust Shield",
    afterItems: ["Real-Time AST Taint Interception", "Zero WAN Surface Exposure", "Sub-Millisecond Attack Termination"],
  };

  const beforeSlideX = interpolate(frame, [4, 22], [-80, 0], { extrapolateRight: "clamp" });
  const afterSlideX = interpolate(frame, [12, 30], [80, 0], { extrapolateRight: "clamp" });
  const vsPop = spring({ frame: frame - 14, fps, config: { damping: 9, stiffness: 140 } });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 48px",
        perspective: 1200,
      }}
    >
      {/* Scene Header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: campaign.brand.primaryColor, marginBottom: 12 }}>
          {scene.tag || "BEFORE VS AFTER"}
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.headline}
        </div>
      </div>

      {/* 3D Comparative Stacking Container */}
      <div style={{ width: "100%", maxWidth: 940, display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
        
        {/* 1. TOP CARD: THE PAINFUL "BEFORE" (Crimson Glow & 3D Tilt) */}
        <div
          style={{
            transform: `perspective(1000px) rotateX(8deg) rotateY(-4deg) translateX(${beforeSlideX}px)`,
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)",
            border: "1.5px solid rgba(239, 68, 68, 0.5)",
            borderRadius: 30,
            padding: "36px 38px",
            boxShadow: "0 25px 60px rgba(239, 68, 68, 0.18), 0 35px 80px rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(24px)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <span style={{ background: "rgba(239, 68, 68, 0.3)", color: "#EF4444", fontSize: 13, fontWeight: 900, padding: "6px 14px", borderRadius: 8, letterSpacing: 2, textTransform: "uppercase", border: "1px solid rgba(239, 68, 68, 0.6)" }}>
              BEFORE
            </span>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF" }}>{ba.beforeTitle}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ba.beforeItems.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(239, 68, 68, 0.25)", border: "1px solid rgba(239, 68, 68, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <IconCross color="#EF4444" size={16} />
                </div>
                <span style={{ fontSize: 20, color: "rgba(248, 250, 252, 0.85)", fontWeight: 600 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Animated "VS" Blast Badge */}
        <div
          style={{
            alignSelf: "center",
            transform: `scale(${vsPop})`,
            background: `linear-gradient(135deg, ${campaign.brand.primaryColor}, ${campaign.brand.accentColor})`,
            color: "#050811",
            fontWeight: 900,
            fontSize: 18,
            padding: "10px 26px",
            borderRadius: 9999,
            boxShadow: `0 0 40px ${campaign.brand.primaryColor}, 0 0 80px ${campaign.brand.primaryColor}66`,
            letterSpacing: 3,
            zIndex: 20,
            margin: "-16px 0",
          }}
        >
          VS
        </div>

        {/* 2. BOTTOM CARD: THE REVOLUTIONARY "AFTER" (Emerald/Cyan Neon Glow) */}
        <div
          style={{
            transform: `perspective(1000px) rotateX(8deg) rotateY(-4deg) translateX(${afterSlideX}px)`,
            background: `linear-gradient(135deg, ${campaign.brand.primaryColor}18 0%, rgba(15, 23, 42, 0.85) 100%)`,
            border: `1.5px solid ${campaign.brand.primaryColor}88`,
            borderRadius: 30,
            padding: "36px 38px",
            boxShadow: `0 25px 60px ${campaign.brand.primaryColor}25, 0 35px 80px rgba(0, 0, 0, 0.8)`,
            backdropFilter: "blur(24px)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <span style={{ background: `${campaign.brand.primaryColor}35`, color: campaign.brand.primaryColor, fontSize: 13, fontWeight: 900, padding: "6px 14px", borderRadius: 8, letterSpacing: 2, textTransform: "uppercase", border: `1px solid ${campaign.brand.primaryColor}88` }}>
              AFTER
            </span>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF" }}>{ba.afterTitle}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ba.afterItems.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${campaign.brand.primaryColor}30`, border: `1px solid ${campaign.brand.primaryColor}88`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <IconCheck color={campaign.brand.primaryColor} size={16} />
                </div>
                <span style={{ fontSize: 20, color: "#FFFFFF", fontWeight: 700 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 3. ARCHETYPE: FULL-CANVAS IMMERSIVE TERMINAL (Prism Code & Alert Recoil)
// =========================================================================
const SceneTerminal: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const cmd = scene.terminalCommand || "sentinel inspect --runtime php-fpm --block-rce";
  const typedCount = Math.min(cmd.length, Math.floor(interpolate(frame, [8, 48], [0, cmd.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const displayed = cmd.slice(0, typedCount);
  const cursorBlink = Math.sin((frame / 10) * Math.PI) > 0;

  // Alert impact screen shake recoil
  const alertTriggerFrame = 65;
  const isAlertActive = frame >= alertTriggerFrame && !!scene.terminalAlert;
  const shakeX = isAlertActive && frame < alertTriggerFrame + 14 ? Math.sin((frame - alertTriggerFrame) * 3) * 8 : 0;
  const shakeY = isAlertActive && frame < alertTriggerFrame + 14 ? Math.cos((frame - alertTriggerFrame) * 3) * 5 : 0;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 44px",
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      {/* Floating Scene Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: campaign.brand.primaryColor, marginBottom: 10 }}>
          {scene.tag || "LIVE EXECUTION"}
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.headline}
        </div>
      </div>

      {/* 3D Tilt Developer Terminal Window */}
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          background: "rgba(10, 15, 29, 0.94)",
          backdropFilter: "blur(30px)",
          border: `1.5px solid ${isAlertActive ? "rgba(239, 68, 68, 0.8)" : "rgba(255, 255, 255, 0.16)"}`,
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: isAlertActive
            ? "0 0 60px rgba(239, 68, 68, 0.35), 0 40px 100px rgba(0, 0, 0, 0.9)"
            : "0 0 50px rgba(0, 0, 0, 0.6), 0 40px 100px rgba(0, 0, 0, 0.9)",
          transform: "perspective(1100px) rotateX(6deg) rotateY(-3deg)",
          transition: "border-color 0.2s ease",
        }}
      >
        {/* macOS Chrome Header */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            padding: "20px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FF5F56" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#27C93F" }} />
            <span style={{ marginLeft: 16, fontSize: 16, color: "rgba(248, 250, 252, 0.75)", fontFamily: "'Fira Code', monospace" }}>
              {scene.terminalTitle || "terminal.sh"}
            </span>
          </div>
          <div style={{ fontSize: 13, fontFamily: "'Fira Code', monospace", color: campaign.brand.primaryColor, background: `${campaign.brand.primaryColor}20`, padding: "4px 14px", borderRadius: 8, fontWeight: 700 }}>
            LIVE RUNTIME
          </div>
        </div>

        {/* Terminal Content */}
        <div style={{ padding: "36px 32px", minHeight: 480, fontFamily: "'Fira Code', monospace", fontSize: 21, lineHeight: 1.6 }}>
          {/* Active Command Line */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: 14, fontWeight: 900, color: campaign.brand.primaryColor, fontSize: 24 }}>$</span>
            <div>{renderSyntaxTokens(displayed)}</div>
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 26,
                background: cursorBlink ? campaign.brand.primaryColor : "transparent",
                marginLeft: 6,
                verticalAlign: "middle",
              }}
            />
          </div>

          {/* Dynamic Execution Stream */}
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}>
            {frame > 30 && (
              <div style={{ color: "#38BDF8", fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}>
                <span>⚡ AST engine parsing runtime memory hooks...</span>
                <span style={{ background: "rgba(56, 189, 248, 0.18)", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>ATTACHED</span>
              </div>
            )}
            {frame > 45 && (
              <div style={{ color: "#10B981", fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}>
                <span>✔ Sandboxed process isolation enforced (PID active)</span>
                <span style={{ background: "rgba(16, 185, 129, 0.18)", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>PASS</span>
              </div>
            )}

            {/* Terminal Output Banner */}
            {frame > 58 && scene.terminalOutput && (
              <div
                style={{
                  marginTop: 12,
                  padding: "20px 24px",
                  background: "rgba(15, 23, 42, 0.9)",
                  border: `1px solid ${campaign.brand.primaryColor}55`,
                  borderRadius: 16,
                  color: "#FFFFFF",
                  fontSize: 19,
                  fontWeight: 600,
                  boxShadow: `0 10px 30px ${campaign.brand.primaryColor}20`,
                }}
              >
                {scene.terminalOutput}
              </div>
            )}

            {/* Glowing Interception / Defense Alert */}
            {frame >= alertTriggerFrame && scene.terminalAlert && (
              <div
                style={{
                  marginTop: 16,
                  padding: "20px 26px",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1.5px solid rgba(239, 68, 68, 0.6)",
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  color: "#EF4444",
                  fontWeight: 800,
                  fontSize: 20,
                  boxShadow: "0 0 40px rgba(239, 68, 68, 0.35)",
                  transform: `scale(${spring({ frame: frame - alertTriggerFrame, fps, config: { damping: 10, stiffness: 140 } })})`,
                }}
              >
                <IconAlert color="#EF4444" size={32} />
                <span>{scene.terminalAlert}</span>
              </div>
            )}
          </div>
        </div>

        {/* Terminal Telemetry Strip */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "16px 32px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 14,
            fontFamily: "'Fira Code', monospace",
            color: "rgba(248, 250, 252, 0.5)",
          }}
        >
          <span>ENGINE: REALTIME TELEMETRY</span>
          <span style={{ color: campaign.brand.primaryColor, fontWeight: 700 }}>ZERO REGRESSIONS</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 4. ARCHETYPE: HIGH-ENERGY RADIAL METRIC DIAL (Shockwave Burst)
// =========================================================================
const SceneMetricCounter: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const target = scene.metricTarget || 100;
  const count = Math.floor(interpolate(frame, [4, 42], [0, target], { extrapolateRight: "clamp" }));

  // Circular gauge circumference
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (count / 100) * circumference;

  // Expanding shockwave ring when count hits target
  const isLanded = frame >= 42;
  const shockScale = isLanded ? interpolate(frame, [42, 70], [1.0, 2.2], { extrapolateRight: "clamp" }) : 1;
  const shockOpacity = isLanded ? interpolate(frame, [42, 70], [0.8, 0], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 48px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: campaign.brand.primaryColor, marginBottom: 10 }}>
          {scene.tag || "BENCHMARK PERFORMANCE"}
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.headline}
        </div>
      </div>

      {/* Massive Central Orbital Gauge */}
      <div style={{ position: "relative", width: 340, height: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
        
        {/* Expanding Shockwave Ring */}
        {isLanded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `3px solid ${campaign.brand.primaryColor}`,
              transform: `scale(${shockScale})`,
              opacity: shockOpacity,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Orbital SVG Gauge Ring */}
        <svg width="340" height="340" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="170" cy="170" r={radius} stroke="rgba(255, 255, 255, 0.08)" strokeWidth="20" fill="transparent" />
          <circle
            cx="170"
            cy="170"
            r={radius}
            stroke={campaign.brand.primaryColor}
            strokeWidth="20"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ filter: `drop-shadow(0 0 20px ${campaign.brand.primaryColor})` }}
          />
        </svg>

        {/* Center Big Number */}
        <div style={{ position: "absolute", textAlign: "center" }}>
          <div style={{ fontSize: 88, fontWeight: 900, color: "#FFFFFF", lineHeight: 1, letterSpacing: -2 }}>
            {count}
            <span style={{ fontSize: 44, color: campaign.brand.primaryColor }}>{scene.metricSuffix || "%"}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: campaign.brand.primaryColor, letterSpacing: 3, textTransform: "uppercase", marginTop: 8 }}>
            EFFICIENCY
          </div>
        </div>
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", marginTop: 32, textAlign: "center", maxWidth: 700 }}>
        {scene.metricLabel}
      </div>

      {/* Dual Context Cards (Dynamic, NO Hardcoded IP text!) */}
      <div style={{ display: "flex", gap: 24, marginTop: 40, width: "100%", maxWidth: 840 }}>
        <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: 24, padding: "28px 24px", backdropFilter: "blur(20px)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: "rgba(248, 250, 252, 0.5)", textTransform: "uppercase" }}>
            EXECUTION OVERHEAD
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#FFFFFF", marginTop: 8 }}>
            {scene.secondaryMetricValue || "0.2ms"}
          </div>
          <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.7)", marginTop: 4 }}>
            {scene.secondaryMetricLabel || "Runtime AST Overhead"}
          </div>
        </div>

        <div style={{ flex: 1, background: `${campaign.brand.primaryColor}14`, border: `1px solid ${campaign.brand.primaryColor}44`, borderRadius: 24, padding: "28px 24px", backdropFilter: "blur(20px)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: campaign.brand.primaryColor, textTransform: "uppercase" }}>
            VERIFICATION
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#FFFFFF", marginTop: 8 }}>
            100%
          </div>
          <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.7)", marginTop: 4 }}>
            Deterministic Protection
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 5. ARCHETYPE: CONVERSION CTA (Apple/Stripe High-Energy Finale)
// =========================================================================
const SceneConversionCTA: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const isClaude = campaign.brand.theme === "claude";
  const btnScale = spring({ frame: frame - 8, fps, config: { damping: 10, stiffness: 120 } });
  const shimmerX = interpolate(frame, [15, 65], [-120, 220], { extrapolateRight: "clamp" });

  const badges = scene.trustBadges || ["DEPLOY IN 60 SECONDS", "ZERO DOWNTIME", "ENTERPRISE READY"];

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 50px",
        textAlign: "center",
      }}
    >
      {/* 3D Rotating Brand Orb / Shield */}
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: 36,
          background: `linear-gradient(135deg, ${campaign.brand.primaryColor}, ${campaign.brand.accentColor})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 60px ${campaign.brand.primaryColor}88`,
          transform: `scale(${spring({ frame, fps, config: { damping: 9 } })}) rotate(${Math.sin(frame / 20) * 8}deg)`,
          marginBottom: 36,
        }}
      >
        <IconShield color="#FFFFFF" size={54} />
      </div>

      <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: campaign.brand.primaryColor, marginBottom: 14 }}>
        {scene.tag || "GET STARTED TODAY"}
      </div>

      <div style={{ fontSize: 64, fontWeight: 900, color: "#FFFFFF", letterSpacing: -2, maxWidth: 880, lineHeight: 1.1, marginBottom: 44 }}>
        {scene.headline}
      </div>

      {/* Massive Glossy Gradient Button with Shimmer Sweep */}
      <div
        style={{
          transform: `scale(${btnScale})`,
          position: "relative",
          width: "100%",
          maxWidth: 620,
          height: 96,
          borderRadius: 9999,
          background: `linear-gradient(90deg, ${campaign.brand.primaryColor}, ${campaign.brand.accentColor})`,
          boxShadow: `0 0 50px ${campaign.brand.primaryColor}88, 0 20px 40px rgba(0,0,0,0.6)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        {/* Shimmer Light Reflection Sweep */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${shimmerX}%`,
            width: 120,
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)",
            transform: "skewX(-25deg)",
            pointerEvents: "none",
          }}
        />

        <span style={{ fontSize: 26, fontWeight: 900, color: "#050811", letterSpacing: 1 }}>
          {scene.ctaHeadline || campaign.ctaText || "Get Started Free →"}
        </span>
      </div>

      {/* Trust Badges Floating Below */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 44 }}>
        {badges.map((b, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 9999,
              padding: "10px 22px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 1.5,
              color: "rgba(248, 250, 252, 0.8)",
            }}
          >
            <IconCheck color={campaign.brand.primaryColor} size={16} />
            <span>{b}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// SCENE ROUTER & CINEMATIC CAMERA RIG (Full-Canvas, Continuous Dolly)
// =========================================================================
const StudioScene: React.FC<{
  scene: MotionScene;
  campaign: CampaignData;
  durationFrames: number;
  fps: number;
}> = ({ scene, campaign, durationFrames, fps }) => {
  const frame = useCurrentFrame();

  // Continuous cinematic camera dolly (zoom from 1.0 -> 1.06)
  const camScale = interpolate(frame, [0, durationFrames], [1.0, 1.06], { extrapolateRight: "clamp" });
  const camFloatY = Math.sin((frame / fps) * 0.8) * 6;

  // Scene fade in / fade out
  const opacity = interpolate(
    frame,
    [0, 5, durationFrames - 5, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${camScale}) translateY(${camFloatY}px)`,
        transformOrigin: "center center",
      }}
    >
      {scene.type === "kinetic_hook" && <SceneKineticHook scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.type === "before_after_split" && <SceneBeforeAfter scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {(scene.type === "terminal_code" || (scene.type as any) === "code_terminal") && (
        <SceneTerminal scene={scene} campaign={campaign} frame={frame} fps={fps} />
      )}
      {scene.type === "metric_counter" && <SceneMetricCounter scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.type === "conversion_cta" && <SceneConversionCTA scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      
      {/* Fallback for other scene types */}
      {scene.type === "feature_cards" && <SceneBeforeAfter scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.type === "network_topology" && <SceneTerminal scene={scene} campaign={campaign} frame={frame} fps={fps} />}
    </AbsoluteFill>
  );
};

// =========================================================================
// MAIN ENTRY: Universal Motion Engine
// =========================================================================
export const UniversalMotionEngine: React.FC<{ campaign: CampaignData }> = ({ campaign }) => {
  const { fps } = useVideoConfig();

  // Calculate timeline offsets
  let runningFrame = 0;
  const timeline = campaign.scenes.map((scene) => {
    const durationFrames = Math.round((scene.durationSeconds || 5) * fps);
    const from = runningFrame;
    runningFrame += durationFrames;
    return { scene, from, durationFrames };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: campaign.brand.backgroundColor || "#030611", overflow: "hidden" }}>
      {/* 1. Underlying Cinematic Ambient Atmosphere */}
      <CinematicAtmosphere
        theme={campaign.brand.theme}
        primaryColor={campaign.brand.primaryColor}
        accentColor={campaign.brand.accentColor}
      />

      {/* 2. Full-Screen Cinematic Scenes */}
      {timeline.map(({ scene, from, durationFrames }, i) => (
        <Sequence key={scene.id || i} from={from} durationInFrames={durationFrames}>
          <StudioScene
            scene={scene}
            campaign={campaign}
            durationFrames={durationFrames}
            fps={fps}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};


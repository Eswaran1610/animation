import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";

export const ZTNAPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cyber grid shift
  const gridOffsetY = (frame * 1.5) % 40;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#070B14",
        color: "#F8FAFC",
        fontFamily: "'Segoe UI', Roboto, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Background Synth Audio Track */}
      <Audio src={staticFile("cyber_audio.wav")} volume={0.8} />

      {/* Cyberpunk Grid Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(16, 185, 129, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(16, 185, 129, 0.05) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          transform: `translateY(${gridOffsetY}px)`,
          pointerEvents: "none",
        }}
      />

      {/* Radial Glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* SCENE 1: Problem Statement (0s - 12s / frames 0 - 360) */}
      <Sequence from={0} durationInFrames={360}>
        <SceneProblem />
      </Sequence>

      {/* SCENE 2: The Core Rule: "Never Trust, Always Verify" (12s - 25s / frames 360 - 750) */}
      <Sequence from={360} durationInFrames={390}>
        <SceneCorePrinciple />
      </Sequence>

      {/* SCENE 3: How ZTNA Works (Identity, Device, Context) (25s - 45s / frames 750 - 1350) */}
      <Sequence from={750} durationInFrames={600}>
        <SceneZTNAArchitecture />
      </Sequence>

      {/* SCENE 4: Impact Metrics & CTA (45s - 60s / frames 1350 - 1800) */}
      <Sequence from={1350} durationInFrames={450}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};

// Scene 1: The VPN Problem
const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const textFade = interpolate(frame, [0, 20], [0, 1]);
  const warningFlash = Math.sin((frame / fps) * Math.PI * 4) > 0 ? "#EF4444" : "#F87171";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 60px" }}>
      <div style={{ opacity: textFade, padding: "8px 20px", borderRadius: 9999, border: "1px solid #EF444455", background: "rgba(239, 68, 68, 0.1)", color: warningFlash, fontSize: 20, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700, marginBottom: 30 }}>
        ⚠ Legacy Perimeter Security Is Broken
      </div>

      <div style={{ transform: `scale(${scale})`, fontSize: 72, fontWeight: 900, lineHeight: 1.2, maxWidth: 1200 }}>
        Traditional VPNs give <span style={{ color: "#EF4444" }}>Full Network Access</span> once inside.
      </div>

      <div style={{ marginTop: 30, fontSize: 30, color: "rgba(248, 250, 252, 0.7)", maxWidth: 900 }}>
        One compromised credential exposes your entire enterprise infrastructure.
      </div>
    </div>
  );
};

// Scene 2: The ZTNA Paradigm Shift
const SceneCorePrinciple: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 15, stiffness: 90 } });
  const pulseGlow = interpolate(Math.sin((frame / fps) * Math.PI * 3), [-1, 1], [20, 50]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 60px" }}>
      <div style={{ fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: "#10B981", fontWeight: 700, marginBottom: 20 }}>
        The Paradigm Shift
      </div>

      <div style={{ transform: `scale(${scale})`, fontSize: 84, fontWeight: 900, lineHeight: 1.1, color: "#FFFFFF", letterSpacing: -1 }}>
        ZERO TRUST <span style={{ color: "#10B981", textShadow: `0 0 ${pulseGlow}px #10B98188` }}>NETWORK ACCESS</span>
      </div>

      <div style={{ marginTop: 40, padding: "20px 48px", borderRadius: 16, background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10B98155", fontSize: 36, fontWeight: 700, color: "#10B981" }}>
        "NEVER TRUST. ALWAYS VERIFY."
      </div>

      <div style={{ marginTop: 30, fontSize: 26, color: "rgba(248, 250, 252, 0.65)" }}>
        Micro-tunnels directly to applications — NEVER to the network.
      </div>
    </div>
  );
};

// Scene 3: The 3 Verification Pillars
const SceneZTNAArchitecture: React.FC = () => {
  const frame = useCurrentFrame();

  const pillars = [
    { title: "Identity Validation", desc: "Adaptive MFA, Biometrics & Context", icon: "👤", delay: 10 },
    { title: "Device Posture", desc: "EDR health, OS patch & encryption state", icon: "💻", delay: 80 },
    { title: "Continuous Risk Engine", desc: "Instant revocation upon behavioral anomaly", icon: "⚡", delay: 150 },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 80px" }}>
      <div style={{ fontSize: 26, color: "#10B981", letterSpacing: 3, fontWeight: 700, textTransform: "uppercase", marginBottom: 15 }}>
        ZTNA Decision Engine
      </div>
      <div style={{ fontSize: 56, fontWeight: 800, marginBottom: 50 }}>
        Every Request Is Independently Verified
      </div>

      <div style={{ display: "flex", gap: 36, width: "100%", maxWidth: 1400, justifyContent: "center" }}>
        {pillars.map((pillar, idx) => {
          const itemSlide = interpolate(frame, [pillar.delay, pillar.delay + 20], [50, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const itemOpacity = interpolate(frame, [pillar.delay, pillar.delay + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                transform: `translateY(${itemSlide}px)`,
                opacity: itemOpacity,
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 20,
                padding: "40px 30px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ fontSize: 50, marginBottom: 20 }}>{pillar.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#F8FAFC", marginBottom: 12 }}>{pillar.title}</div>
              <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.7)", lineHeight: 1.5 }}>{pillar.desc}</div>
              <div style={{ marginTop: 24, padding: "6px 16px", borderRadius: 9999, background: "#10B98122", color: "#10B981", fontSize: 14, fontWeight: 600 }}>
                VERIFIED CONTINUOUSLY
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Scene 4: Metrics & Final CTA
const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const buttonScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const pulse = interpolate(Math.sin((frame / fps) * Math.PI * 2), [-1, 1], [15, 40]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 60px" }}>
      {/* Metric Callout */}
      <div style={{ display: "flex", gap: 60, marginBottom: 50 }}>
        <div>
          <div style={{ fontSize: 72, fontWeight: 900, color: "#10B981" }}>95%</div>
          <div style={{ fontSize: 20, color: "rgba(248, 250, 252, 0.7)" }}>Reduction in Attack Surface</div>
        </div>
        <div style={{ width: 1, backgroundColor: "rgba(255, 255, 255, 0.15)" }} />
        <div>
          <div style={{ fontSize: 72, fontWeight: 900, color: "#06B6D4" }}>0ms</div>
          <div style={{ fontSize: 20, color: "rgba(248, 250, 252, 0.7)" }}>Lateral Movement Allowed</div>
        </div>
      </div>

      <div style={{ fontSize: 56, fontWeight: 900, marginBottom: 35 }}>
        Upgrade to Intelligent Zero Trust Today
      </div>

      {/* Button */}
      <div
        style={{
          transform: `scale(${buttonScale})`,
          background: "linear-gradient(135deg, #10B981, #06B6D4)",
          padding: "22px 64px",
          borderRadius: 16,
          fontSize: 36,
          fontWeight: 800,
          color: "#050811",
          boxShadow: `0 10px ${pulse}px rgba(16, 185, 129, 0.4)`,
          cursor: "pointer",
        }}
      >
        Deploy ZTNA Architecture →
      </div>

      <div style={{ marginTop: 24, fontSize: 20, color: "rgba(248, 250, 252, 0.6)" }}>
        Seamless Cloud, Hybrid, and On-Premises Enforcement
      </div>
    </div>
  );
};

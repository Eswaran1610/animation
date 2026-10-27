import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";

export const ClaudeCodeTierPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Continuous subtle 3D cinematic camera tracking
  const cameraZ = interpolate(frame, [0, 900], [1, 1.07]);
  const cameraRotateY = interpolate(frame, [0, 900], [-3, 3]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#05070E",
        color: "#F8FAFC",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Fira Code', monospace",
        overflow: "hidden",
        perspective: 1400,
      }}
    >
      <Audio src={staticFile("cyber_audio.wav")} volume={0.65} />

      {/* Synchronized Foley SFX */}
      <Sequence from={0} durationInFrames={30}><Audio src={staticFile("sfx/impact.wav")} volume={0.8} /></Sequence>
      <Sequence from={280} durationInFrames={20}><Audio src={staticFile("sfx/whoosh.wav")} volume={0.7} /></Sequence>
      <Sequence from={320} durationInFrames={15}><Audio src={staticFile("sfx/click.wav")} volume={0.9} /></Sequence>
      <Sequence from={600} durationInFrames={35}><Audio src={staticFile("sfx/impact.wav")} volume={0.9} /></Sequence>

      {/* 3D Parallax Viewport */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${cameraZ}) rotateY(${cameraRotateY}deg)`,
          transformStyle: "preserve-3d",
          position: "relative",
        }}
      >
        {/* Dynamic Volumetric Neon Ambient Glows */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "50%",
            width: 850,
            height: 850,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 65%)",
            transform: "translate(-50%, -50%)",
            filter: "blur(120px)",
            pointerEvents: "none",
          }}
        />

        {/* Top Minimal Progress Bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${(frame / 900) * 100}%`,
            height: 4,
            background: "linear-gradient(90deg, #10B981, #06B6D4)",
            zIndex: 100,
          }}
        />

        {/* SCENE 1: Real macOS Terminal Window + Real-time Typing + Stolen Credential Alert (0s - 10s) */}
        <Sequence from={0} durationInFrames={300}>
          <Scene1_TerminalBreach />
        </Sequence>

        {/* SCENE 2: Interactive Interactive Micro-Tunnel Node Topology (10s - 20s) */}
        <Sequence from={295} durationInFrames={305}>
          <Scene2_InteractiveTopology />
        </Sequence>

        {/* SCENE 3: Real macOS Dashboard Mockup + Conversion Metric Surge (20s - 30s) */}
        <Sequence from={595} durationInFrames={305}>
          <Scene3_DashboardConversion />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// SCENE 1: macOS Terminal Window with Live Fast Typing & Red Alert Ripple
// =========================================================================
const Scene1_TerminalBreach: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowSpring = spring({ frame, fps, config: { damping: 14, stiffness: 85, mass: 0.8 } });

  // Live simulated keystrokes
  const fullCommand = "curl -X POST https://vpn.corp.internal/auth -u admin";
  const typedCount = Math.min(fullCommand.length, Math.floor(interpolate(frame, [15, 75], [0, fullCommand.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const displayedCommand = fullCommand.slice(0, typedCount);

  // Red Breach Warning Card Spring (appears at frame 80)
  const alertSpring = spring({ frame: frame - 80, fps, config: { damping: 12, stiffness: 120, mass: 0.6 } });
  const alertPulse = Math.sin((frame / fps) * Math.PI * 4) > 0;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "100px 50px 80px", boxSizing: "border-box" }}>
      {/* Category Pill with Pulsing LED */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 12px #EF4444" }} />
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#EF4444" }}>
          Perimeter Vulnerability Simulation
        </span>
      </div>

      <div>
        <h1 style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.12, letterSpacing: -1.5, margin: "0 0 28px 0" }}>
          VPN Passwords Give <br />
          <span style={{ color: "#EF4444" }}>Full Intranet Access.</span>
        </h1>

        {/* macOS Realistic Terminal Mockup */}
        <div
          style={{
            transform: `scale(${windowSpring})`,
            background: "rgba(11, 15, 25, 0.85)",
            backdropFilter: "blur(25px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* macOS Title Bar */}
          <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27C93F" }} />
            <span style={{ fontSize: 13, color: "rgba(248, 250, 252, 0.4)", marginLeft: 12, fontFamily: "monospace" }}>bash — 1080x1920</span>
          </div>

          {/* Terminal Console Output */}
          <div style={{ padding: "26px", minHeight: 220, fontFamily: "'Fira Code', monospace", fontSize: 20, lineHeight: 1.6 }}>
            <div style={{ color: "#10B981" }}>
              guest@remote-laptop:~$ <span style={{ color: "#F8FAFC" }}>{displayedCommand}</span>
              <span style={{ display: "inline-block", width: 10, height: 20, background: alertPulse ? "#10B981" : "transparent", marginLeft: 4, verticalAlign: "middle" }} />
            </div>

            {frame > 85 && (
              <div style={{ marginTop: 14, color: "#EF4444" }}>
                [!] AUTH SUCCESS: Tunnel Open. Subnet Route: 10.0.0.0/8 (4,096 Internal Servers Exposed)
              </div>
            )}
          </div>
        </div>

        {/* Floating Breach Warning Pill */}
        {frame > 80 && (
          <div
            style={{
              transform: `scale(${alertSpring})`,
              marginTop: 24,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #EF4444",
              borderRadius: 16,
              padding: "18px 24px",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <span style={{ fontSize: 32 }}>⚠️</span>
            <div style={{ fontSize: 20, color: "#F8FAFC", fontWeight: 700 }}>
              Lateral Breach Vector Activated: Attacker can probe internal databases.
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.4)", letterSpacing: 2 }}>
        01 / 03 • LEGACY PERIMETER BREAKDOWN
      </div>
    </div>
  );
};

// =========================================================================
// SCENE 2: Interactive Micro-Tunnel Node Topology (Real visual architecture)
// =========================================================================
const Scene2_InteractiveTopology: React.FC = () => {
  const frame = useCurrentFrame();

  // Packet animation along the micro-tunnel
  const packetPos = (frame * 3.5) % 100;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "100px 50px 80px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 12px #10B981" }} />
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#10B981" }}>
          ZTNA Micro-Tunnel Architecture
        </span>
      </div>

      <div>
        <h2 style={{ fontSize: 60, fontWeight: 900, lineHeight: 1.15, letterSpacing: -1.5, margin: "0 0 32px 0" }}>
          Never Touch The Network. <br />
          <span style={{ color: "#10B981" }}>Direct App Micro-Tunnels.</span>
        </h2>

        {/* Visual Architecture Node Diagram */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: 24,
            padding: "44px 30px",
            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
            position: "relative",
          }}
        >
          {/* Horizontal Connection Beam */}
          <div style={{ position: "absolute", top: "50%", left: "15%", right: "15%", height: 3, background: "rgba(255, 255, 255, 0.1)", zIndex: 1 }}>
            {/* High-speed animated packet */}
            <div
              style={{
                position: "absolute",
                top: -5,
                left: `${packetPos}%`,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 16px #10B981",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
            {/* Node 1: Remote Identity */}
            <div style={{ textAlign: "center", width: 140 }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 12px" }}>
                👤
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>Identity</div>
              <div style={{ fontSize: 14, color: "#10B981", marginTop: 4 }}>✓ MFA Verified</div>
            </div>

            {/* Node 2: ZTNA Policy Decision Engine (Center) */}
            <div style={{ textAlign: "center", width: 160 }}>
              <div style={{ width: 90, height: 90, borderRadius: 30, background: "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25))", border: "2px solid #10B981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, margin: "0 auto 12px", boxShadow: "0 0 35px rgba(16, 185, 129, 0.4)" }}>
                🛡️
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#10B981" }}>ZTNA Engine</div>
              <div style={{ fontSize: 13, color: "rgba(248, 250, 252, 0.6)", marginTop: 4 }}>Continuous Auth</div>
            </div>

            {/* Node 3: Isolated Application Target */}
            <div style={{ textAlign: "center", width: 140 }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 12px" }}>
                🔒
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>App Only</div>
              <div style={{ fontSize: 14, color: "#06B6D4", marginTop: 4 }}>Network Cloaked</div>
            </div>
          </div>
        </div>

        {/* Real Policy Enforcement Checklist */}
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
          {["Device Posture Evaluated: Clean EDR & BitLocker Active", "Network Invisibility: Internal IP space never published"].map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255, 255, 255, 0.03)", padding: "16px 20px", borderRadius: 14, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <span style={{ color: "#10B981", fontWeight: 900, fontSize: 18 }}>✓</span>
              <span style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.8)", fontWeight: 600 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.4)", letterSpacing: 2 }}>
        02 / 03 • ZERO NETWORK DISCLOSURE
      </div>
    </div>
  );
};

// =========================================================================
// SCENE 3: Realistic App Dashboard Mockup + Metric Counter + Apple Pill CTA
// =========================================================================
const Scene3_DashboardConversion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ctaSpring = spring({ frame, fps, config: { damping: 13, stiffness: 95, mass: 0.6 } });
  const pulse = interpolate(Math.sin((frame / fps) * Math.PI * 3), [-1, 1], [20, 50]);

  // Live real-time counter metric
  const countSurface = Math.floor(interpolate(frame, [0, 50], [0, 95], { extrapolateRight: "clamp" }));

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "100px 50px 80px", boxSizing: "border-box", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#06B6D4", boxShadow: "0 0 12px #06B6D4" }} />
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#06B6D4" }}>
          Production Security Telemetry
        </span>
      </div>

      <div>
        {/* Realistic Dashboard Glass Mockup */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(25px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 24,
            padding: "36px 28px",
            boxShadow: "0 30px 60px rgba(0, 0, 0, 0.6)",
            marginBottom: 36,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(248, 250, 252, 0.7)" }}>Security Operations Center</span>
            <span style={{ fontSize: 14, color: "#10B981", fontWeight: 700, background: "#10B98122", padding: "4px 12px", borderRadius: 9999 }}>LIVE ENFORCEMENT</span>
          </div>

          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.04)", borderRadius: 18, padding: "24px 16px" }}>
              <div style={{ fontSize: 66, fontWeight: 900, color: "#10B981", lineHeight: 1 }}>{countSurface}%</div>
              <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.7)", marginTop: 8 }}>Attack Surface Removed</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.04)", borderRadius: 18, padding: "24px 16px" }}>
              <div style={{ fontSize: 66, fontWeight: 900, color: "#06B6D4", lineHeight: 1 }}>0ms</div>
              <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.7)", marginTop: 8 }}>Lateral Traversal</div>
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1.5, margin: "0 0 32px 0" }}>
          Ditch Legacy VPNs. <br />
          <span style={{ color: "#10B981" }}>Enforce Zero Trust.</span>
        </h2>

        {/* High-End Pill CTA */}
        <div
          style={{
            transform: `scale(${ctaSpring})`,
            background: "linear-gradient(135deg, #10B981, #06B6D4)",
            padding: "26px 48px",
            borderRadius: 9999,
            fontSize: 32,
            fontWeight: 800,
            color: "#050811",
            boxShadow: `0 15px ${pulse}px rgba(16, 185, 129, 0.45)`,
            display: "inline-block",
            cursor: "pointer",
            width: "90%",
            letterSpacing: -0.5,
          }}
        >
          Deploy ZTNA Today →
        </div>
      </div>

      <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.4)", letterSpacing: 2 }}>
        03 / 03 • ENTERPRISE PRODUCTION READY
      </div>
    </div>
  );
};

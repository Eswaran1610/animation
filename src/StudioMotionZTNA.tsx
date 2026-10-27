import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";

export const StudioMotionZTNA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera continuous smooth pan/dolly effect
  const cameraZ = interpolate(frame, [0, 1500], [1, 1.08]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#030712",
        color: "#F8FAFC",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      <Audio src={staticFile("cyber_audio.wav")} volume={0.8} />

      {/* Cinematic 3D Camera Container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${cameraZ})`,
          transformOrigin: "center center",
          position: "relative",
        }}
      >
        {/* Soft Modern Glow Blobs */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 65%)",
            transform: "translate(-50%, -50%)",
            filter: "blur(100px)",
            pointerEvents: "none",
          }}
        />

        {/* Minimal Timeline Progress Line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${(frame / 1500) * 100}%`,
            height: 4,
            background: "linear-gradient(90deg, #10B981, #06B6D4)",
            zIndex: 100,
          }}
        />

        {/* CHAPTER 1: The VPN Vulnerability (0s - 14s / 0 - 420 frames) */}
        <Sequence from={0} durationInFrames={420}>
          <Chapter1_VPNFlaw />
        </Sequence>

        {/* CHAPTER 2: The Attack Simulation (14s - 26s / 420 - 780 frames) */}
        <Sequence from={420} durationInFrames={360}>
          <Chapter2_LateralBreach />
        </Sequence>

        {/* CHAPTER 3: The ZTNA Solution & Decision Tree (26s - 40s / 780 - 1200 frames) */}
        <Sequence from={780} durationInFrames={420}>
          <Chapter3_ZTNAPipeline />
        </Sequence>

        {/* CHAPTER 4: Sleek Metrics & Call to Action (40s - 50s / 1200 - 1500 frames) */}
        <Sequence from={1200} durationInFrames={300}>
          <Chapter4_StudioCTA />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

// ==========================================
// CHAPTER 1: The VPN Network Exposure
// ==========================================
const Chapter1_VPNFlaw: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Elastic smooth spring entrance
  const cardScale = spring({ frame, fps, config: { damping: 18, stiffness: 80, mass: 0.8 } });
  const pulseRings = (frame * 2) % 100;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "100px 50px 80px", boxSizing: "border-box" }}>
      {/* Sleek Subtitle Tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#EF4444" }} />
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(248, 250, 252, 0.6)" }}>
          Legacy Network Architecture
        </span>
      </div>

      {/* Kinetic Typography */}
      <div style={{ transform: `scale(${cardScale})` }}>
        <h1 style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
          VPNs grant access <br />
          to the <span style={{ color: "#EF4444" }}>entire network.</span>
        </h1>
        <p style={{ marginTop: 24, fontSize: 26, lineHeight: 1.4, color: "rgba(248, 250, 252, 0.65)", maxWidth: 850 }}>
          Once an employee authenticates, their device has unrestricted visibility across internal subnets.
        </p>

        {/* Network Diagram Animation */}
        <div
          style={{
            marginTop: 48,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 24,
            padding: "40px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Animated radar scanning circle */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: `${pulseRings * 5}px`,
              height: `${pulseRings * 5}px`,
              borderRadius: "50%",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              transform: "translate(-50%, -50%)",
              opacity: 1 - pulseRings / 100,
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto" }}>💻</div>
              <div style={{ marginTop: 10, fontSize: 16, color: "rgba(248,250,252,0.8)", fontWeight: 600 }}>Remote User</div>
            </div>

            {/* Pulsing connection beam */}
            <div style={{ flex: 1, height: 2, background: "linear-gradient(90deg, #10B981, #EF4444)", margin: "0 20px", position: "relative" }}>
              <div style={{ position: "absolute", top: -5, left: `${(frame * 2.5) % 100}%`, width: 12, height: 12, borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 10px #EF4444" }} />
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(239, 68, 68, 0.15)", border: "1px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto" }}>🏢</div>
              <div style={{ marginTop: 10, fontSize: 16, color: "#EF4444", fontWeight: 700 }}>Full Intranet Exposed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Glassmorphic Caption */}
      <div style={{ background: "rgba(255, 255, 255, 0.04)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 18, padding: "20px 28px", fontSize: 22, color: "rgba(248, 250, 252, 0.9)", fontWeight: 500 }}>
        "In the traditional model, perimeter trust means zero internal defense."
      </div>
    </div>
  );
};

// ==========================================
// CHAPTER 2: Lateral Breach Spread
// ==========================================
const Chapter2_LateralBreach: React.FC = () => {
  const frame = useCurrentFrame();

  const stages = [
    { title: "Initial Compromise", desc: "Stolen session cookie or phishing", tag: "T+0m", color: "#F59E0B", delay: 10 },
    { title: "Subnet Reconnaissance", desc: "Scanning internal IP ranges & ports", tag: "T+15m", color: "#EF4444", delay: 80 },
    { title: "Data Exfiltration", desc: "Crown jewels & SQL databases accessed", tag: "T+45m", color: "#DC2626", delay: 150 },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "100px 50px 80px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#EF4444" }} />
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(248, 250, 252, 0.6)" }}>
          The Anatomy of Lateral Movement
        </span>
      </div>

      <div>
        <h2 style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1, margin: "0 0 40px 0" }}>
          Attackers don't stay <br />
          where they land.
        </h2>

        {/* Timeline Stepper */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {stages.map((stg, i) => {
            const slide = interpolate(frame, [stg.delay, stg.delay + 18], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const op = interpolate(frame, [stg.delay, stg.delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div
                key={i}
                style={{
                  transform: `translateX(${slide}px)`,
                  opacity: op,
                  background: "rgba(15, 23, 42, 0.6)",
                  backdropFilter: "blur(16px)",
                  border: `1px solid ${stg.color}44`,
                  borderRadius: 20,
                  padding: "24px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "#FFFFFF" }}>{stg.title}</div>
                  <div style={{ fontSize: 20, color: "rgba(248, 250, 252, 0.6)", marginTop: 4 }}>{stg.desc}</div>
                </div>
                <div style={{ padding: "6px 14px", borderRadius: 8, background: `${stg.color}22`, color: stg.color, fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>
                  {stg.tag}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "rgba(255, 255, 255, 0.04)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 18, padding: "20px 28px", fontSize: 22, color: "rgba(248, 250, 252, 0.9)", fontWeight: 500 }}>
        "Average dwell time before containment: 277 days."
      </div>
    </div>
  );
};

// ==========================================
// CHAPTER 3: The ZTNA Solution & Micro-Tunnels
// ==========================================
const Chapter3_ZTNAPipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 16, stiffness: 80 } });

  const checks = [
    { label: "Identity & Context", val: "Continuous Adaptive MFA", ok: true },
    { label: "Endpoint Security", val: "EDR & Disk Encryption Passed", ok: true },
    { label: "Access Privilege", val: "Scoped to App Only (Zero Intranet)", ok: true },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "100px 50px 80px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10B981" }} />
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#10B981" }}>
          The Solution: Zero Trust Network Access
        </span>
      </div>

      <div style={{ transform: `scale(${titleScale})` }}>
        <h2 style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1.5, margin: "0 0 32px 0" }}>
          Every request is <br />
          <span style={{ color: "#10B981" }}>verified at the application.</span>
        </h2>

        {/* Verification Check Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {checks.map((chk, i) => {
            const delay = 15 + i * 20;
            const op = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const slide = interpolate(frame, [delay, delay + 15], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div
                key={i}
                style={{
                  transform: `translateY(${slide}px)`,
                  opacity: op,
                  background: "rgba(16, 185, 129, 0.06)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: 18,
                  padding: "20px 26px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF" }}>{chk.label}</div>
                  <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.65)", marginTop: 2 }}>{chk.val}</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", color: "#050811", fontWeight: 900 }}>
                  ✓
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "rgba(255, 255, 255, 0.04)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 18, padding: "20px 28px", fontSize: 22, color: "rgba(248, 250, 252, 0.9)", fontWeight: 500 }}>
        "Micro-tunnels connect directly to software, making the internal network invisible."
      </div>
    </div>
  );
};

// ==========================================
// CHAPTER 4: High-End Studio CTA
// ==========================================
const Chapter4_StudioCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const buttonScale = spring({ frame, fps, config: { damping: 14, stiffness: 90, mass: 0.6 } });
  const pulse = interpolate(Math.sin((frame / fps) * Math.PI * 3), [-1, 1], [20, 50]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "100px 50px 80px", boxSizing: "border-box", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#06B6D4" }} />
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#06B6D4" }}>
          Production Outcome
        </span>
      </div>

      <div>
        {/* Metric Pair */}
        <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 40 }}>
          <div style={{ flex: 1, background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: 24, padding: "32px 20px" }}>
            <div style={{ fontSize: 68, fontWeight: 900, color: "#10B981", lineHeight: 1 }}>95%</div>
            <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.7)", marginTop: 8 }}>Attack Surface Removed</div>
          </div>
          <div style={{ flex: 1, background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(6, 182, 212, 0.4)", borderRadius: 24, padding: "32px 20px" }}>
            <div style={{ fontSize: 68, fontWeight: 900, color: "#06B6D4", lineHeight: 1 }}>0ms</div>
            <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.7)", marginTop: 8 }}>Lateral Traversal</div>
          </div>
        </div>

        <h2 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.15, letterSpacing: -1.5, margin: "0 0 36px 0" }}>
          Never trust. <br />
          <span style={{ color: "#10B981" }}>Always verify.</span>
        </h2>

        {/* Minimal High-End CTA Pill */}
        <div
          style={{
            transform: `scale(${buttonScale})`,
            background: "linear-gradient(135deg, #10B981, #06B6D4)",
            padding: "24px 48px",
            borderRadius: 9999,
            fontSize: 30,
            fontWeight: 800,
            color: "#050811",
            boxShadow: `0 15px ${pulse}px rgba(16, 185, 129, 0.4)`,
            display: "inline-block",
            cursor: "pointer",
            width: "85%",
          }}
        >
          Deploy Zero Trust Architecture →
        </div>
      </div>

      <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.5)", fontWeight: 500 }}>
        Secure hybrid work without network vulnerability.
      </div>
    </div>
  );
};

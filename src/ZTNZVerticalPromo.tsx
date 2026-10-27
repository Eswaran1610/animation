import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";

export const ZTNZVerticalPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background subtle upward grid movement
  const gridShift = (frame * 1.8) % 60;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#060A12",
        color: "#F8FAFC",
        fontFamily: "'Segoe UI', -apple-system, Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Cyberpunk Audio Track */}
      <Audio src={staticFile("cyber_audio.wav")} volume={0.85} />

      {/* Cyber Grid Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(16, 185, 129, 0.08) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(16, 185, 129, 0.08) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          transform: `translateY(${gridShift}px)`,
          pointerEvents: "none",
        }}
      />

      {/* Top Cyber Glow */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
          filter: "blur(90px)",
          pointerEvents: "none",
        }}
      />

      {/* Persistent Progress Bar Indicator at Top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${(frame / 1800) * 100}%`,
          height: 6,
          background: "linear-gradient(90deg, #10B981, #06B6D4)",
          zIndex: 50,
        }}
      />

      {/* ========================================================
          SCENE 1: HOOK & THE VPN PROBLEM (0s - 13s / Frames 0 - 390)
          Voiceover: "Traditional enterprise security is fundamentally broken.
          When remote workers connect through legacy VPNs, they get broad access
          to the entire corporate network. One stolen credential gives attackers
          free roam to move laterally across your business."
          ======================================================== */}
      <Sequence from={0} durationInFrames={390}>
        <VerticalScene1_Hook />
      </Sequence>

      {/* ========================================================
          SCENE 2: WHY THIS MATTERS IN THE REAL WORLD (13s - 26s / Frames 390 - 780)
          Voiceover: "The consequences are devastating: ransomware spreading in seconds,
          massive data exfiltration, and millions in breach compliance penalties.
          Modern cloud and hybrid work forces need a completely new architecture."
          ======================================================== */}
      <Sequence from={390} durationInFrames={390}>
        <VerticalScene2_RealWorldImpact />
      </Sequence>

      {/* ========================================================
          SCENE 3: INTRODUCING ZTNA / ZERO TRUST (26s - 43s / Frames 780 - 1290)
          Voiceover: "Meet Zero Trust Network Architecture — or ZTNA.
          Built on a simple foundational rule: Never Trust, Always Verify.
          Instead of trusting the perimeter, ZTNA creates isolated micro-tunnels
          directly to specific applications, validating identity, device posture,
          and context on every single request."
          ======================================================== */}
      <Sequence from={780} durationInFrames={510}>
        <VerticalScene3_SolutionArchitecture />
      </Sequence>

      {/* ========================================================
          SCENE 4: KEY BENEFITS, METRICS & CTA (43s - 60s / Frames 1290 - 1800)
          Voiceover: "The result? Ninety-five percent attack surface reduction,
          zero unauthorized lateral movement, and frictionless remote work.
          Stop relying on outdated perimeters. Upgrade your infrastructure to
          intelligent Zero Trust today."
          ======================================================== */}
      <Sequence from={1290} durationInFrames={510}>
        <VerticalScene4_BenefitsCTA />
      </Sequence>
    </AbsoluteFill>
  );
};

// Scene 1: The Breach Alert Hook
const VerticalScene1_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 14, stiffness: 90, mass: 0.8 } });
  const alertFlash = Math.sin((frame / fps) * Math.PI * 4) > 0;

  const captionText =
    frame < 120
      ? "Traditional enterprise network security is fundamentally broken."
      : frame < 260
      ? "Legacy VPNs give broad access to the entire internal network."
      : "One compromised credential exposes your entire corporate infrastructure.";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "120px 60px 100px", textAlign: "center", boxSizing: "border-box" }}>
      {/* Top Category Badge */}
      <div style={{ padding: "10px 24px", borderRadius: 9999, border: "1px solid #EF444466", background: "rgba(239, 68, 68, 0.15)", color: alertFlash ? "#EF4444" : "#FCA5A5", fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
        🚨 CRITICAL SECURITY FLAW
      </div>

      {/* Center Visual Diagram */}
      <div style={{ transform: `scale(${titleScale})`, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 140, height: 140, borderRadius: 36, background: "rgba(239, 68, 68, 0.12)", border: "2px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 70, marginBottom: 40, boxShadow: "0 0 50px rgba(239, 68, 68, 0.3)" }}>
          🔓
        </div>
        <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.15, letterSpacing: -1 }}>
          The VPN Castle-and-Moat <br />
          <span style={{ color: "#EF4444" }}>Is An Open Door.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: "rgba(248, 250, 252, 0.7)", maxWidth: 850 }}>
          Once an attacker penetrates the perimeter, they can move laterally to databases, servers, and sensitive code.
        </div>
      </div>

      {/* Synchronized Caption Pill */}
      <div style={{ width: "100%", background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.12)", padding: "20px 24px", borderRadius: 20, fontSize: 26, fontWeight: 600, color: "#F8FAFC", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
        💬 "{captionText}"
      </div>
    </div>
  );
};

// Scene 2: Real World Business & User Impact
const VerticalScene2_RealWorldImpact: React.FC = () => {
  const frame = useCurrentFrame();

  const impacts = [
    { stat: "$4.88M", label: "Average Cost of a Data Breach", color: "#EF4444", delay: 15 },
    { stat: "277 Days", label: "Average Time to Identify & Contain", color: "#F59E0B", delay: 100 },
    { stat: "Ransomware", label: "Spreading Lateral Network Infection", color: "#EC4899", delay: 200 },
  ];

  const captionText =
    frame < 130
      ? "Breaches cost millions and take months to detect and isolate."
      : frame < 270
      ? "Compromised laptops allow automated ransomware to traverse servers."
      : "In a hybrid world, the old network perimeter no longer exists.";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "120px 60px 100px", textAlign: "center", boxSizing: "border-box" }}>
      <div style={{ padding: "10px 24px", borderRadius: 9999, border: "1px solid #F59E0B66", background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B", fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
        REAL-WORLD CONSEQUENCES
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 32 }}>
        {impacts.map((item, idx) => {
          const slide = interpolate(frame, [item.delay, item.delay + 20], [60, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const op = interpolate(frame, [item.delay, item.delay + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={idx}
              style={{
                transform: `translateY(${slide}px)`,
                opacity: op,
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 24,
                padding: "36px 30px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ fontSize: 64, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.stat}</div>
              <div style={{ marginTop: 12, fontSize: 26, fontWeight: 600, color: "#F8FAFC" }}>{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Synchronized Caption Pill */}
      <div style={{ width: "100%", background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.12)", padding: "20px 24px", borderRadius: 20, fontSize: 26, fontWeight: 600, color: "#F8FAFC", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
        💬 "{captionText}"
      </div>
    </div>
  );
};

// Scene 3: The ZTNA Solution & Decision Engine
const VerticalScene3_SolutionArchitecture: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });

  const pillars = [
    { title: "Identity Validation", subtitle: "MFA & Adaptive Biometrics", icon: "👤", delay: 40 },
    { title: "Device Health Posture", subtitle: "EDR, Encryption & Patch State", icon: "💻", delay: 140 },
    { title: "App-Level Micro Tunnels", subtitle: "Never Expose Underlying Network", icon: "🛡️", delay: 240 },
  ];

  const captionText =
    frame < 140
      ? "Introducing Zero Trust: Never trust, always verify every request."
      : frame < 280
      ? "ZTNA evaluates user identity, device health, and context continuously."
      : "Connections form micro-tunnels directly to apps, never to the network.";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "120px 60px 100px", textAlign: "center", boxSizing: "border-box" }}>
      <div style={{ padding: "10px 24px", borderRadius: 9999, border: "1px solid #10B98166", background: "rgba(16, 185, 129, 0.15)", color: "#10B981", fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
        THE SOLUTION: ZERO TRUST
      </div>

      <div style={{ transform: `scale(${titleScale})`, width: "100%" }}>
        <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.15, letterSpacing: -1, marginBottom: 35 }}>
          ZTNA Architecture: <br />
          <span style={{ color: "#10B981" }}>Continuous Verification</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {pillars.map((p, idx) => {
            const slide = interpolate(frame, [p.delay, p.delay + 20], [40, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const op = interpolate(frame, [p.delay, p.delay + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={idx}
                style={{
                  transform: `translateX(${slide}px)`,
                  opacity: op,
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: 20,
                  padding: "24px 30px",
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 44 }}>{p.icon}</div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#FFFFFF" }}>{p.title}</div>
                  <div style={{ fontSize: 22, color: "rgba(248, 250, 252, 0.65)" }}>{p.subtitle}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Synchronized Caption Pill */}
      <div style={{ width: "100%", background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.12)", padding: "20px 24px", borderRadius: 20, fontSize: 26, fontWeight: 600, color: "#F8FAFC", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
        💬 "{captionText}"
      </div>
    </div>
  );
};

// Scene 4: Key Benefits & Call to Action
const VerticalScene4_BenefitsCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const buttonScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const pulse = interpolate(Math.sin((frame / fps) * Math.PI * 3), [-1, 1], [15, 45]);

  const captionText =
    frame < 140
      ? "Slash your attack surface by 95% and stop lateral movement in its tracks."
      : frame < 280
      ? "Deliver fast, seamless access to SaaS, private cloud, and on-prem apps."
      : "Replace legacy VPNs today. Secure your enterprise with Zero Trust.";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "120px 60px 100px", textAlign: "center", boxSizing: "border-box" }}>
      <div style={{ padding: "10px 24px", borderRadius: 9999, border: "1px solid #06B6D466", background: "rgba(6, 182, 212, 0.15)", color: "#06B6D4", fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
        THE TRANSFORMATION
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Two Key Metrics */}
        <div style={{ display: "flex", gap: 30, width: "100%", justifyContent: "center", marginBottom: 50 }}>
          <div style={{ flex: 1, background: "rgba(15, 23, 42, 0.8)", border: "1px solid #10B98144", borderRadius: 20, padding: "30px 20px" }}>
            <div style={{ fontSize: 68, fontWeight: 900, color: "#10B981", lineHeight: 1 }}>95%</div>
            <div style={{ marginTop: 10, fontSize: 22, color: "rgba(248, 250, 252, 0.75)" }}>Attack Surface Cut</div>
          </div>
          <div style={{ flex: 1, background: "rgba(15, 23, 42, 0.8)", border: "1px solid #06B6D444", borderRadius: 20, padding: "30px 20px" }}>
            <div style={{ fontSize: 68, fontWeight: 900, color: "#06B6D4", lineHeight: 1 }}>0ms</div>
            <div style={{ marginTop: 10, fontSize: 22, color: "rgba(248, 250, 252, 0.75)" }}>Lateral Traversal</div>
          </div>
        </div>

        {/* CTA Headline */}
        <div style={{ fontSize: 54, fontWeight: 900, lineHeight: 1.2, letterSpacing: -1, marginBottom: 40 }}>
          Retire Legacy VPNs. <br />
          <span style={{ color: "#10B981" }}>Adopt Zero Trust.</span>
        </div>

        {/* CTA Button */}
        <div
          style={{
            transform: `scale(${buttonScale})`,
            background: "linear-gradient(135deg, #10B981, #06B6D4)",
            padding: "26px 54px",
            borderRadius: 22,
            fontSize: 34,
            fontWeight: 800,
            color: "#050811",
            boxShadow: `0 12px ${pulse}px rgba(16, 185, 129, 0.5)`,
            cursor: "pointer",
            width: "90%",
          }}
        >
          Deploy ZTNA Security →
        </div>
      </div>

      {/* Synchronized Caption Pill */}
      <div style={{ width: "100%", background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.12)", padding: "20px 24px", borderRadius: 20, fontSize: 26, fontWeight: 600, color: "#F8FAFC", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
        💬 "{captionText}"
      </div>
    </div>
  );
};

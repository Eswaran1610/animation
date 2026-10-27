import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";

export const PerfectMotionPro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. 3D Camera Pan & Continuous Parallax (Linear 3D Dolly)
  const cameraZ = interpolate(frame, [0, 900], [1, 1.12]);
  const cameraRotX = interpolate(frame, [0, 450, 900], [3, 0, -2]);
  const cameraRotY = interpolate(frame, [0, 900], [-2, 2]);

  // Dynamic light sweep position
  const lightX = interpolate(frame, [0, 900], [-30, 130]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#030611",
        color: "#F8FAFC",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Roboto, sans-serif",
        overflow: "hidden",
        perspective: 1200,
      }}
    >
      {/* Background Synth Music */}
      <Audio src={staticFile("cyber_audio.wav")} volume={0.65} />

      {/* Layer 0: SFX Sync Points */}
      <Sequence from={0} durationInFrames={30}>
        <Audio src={staticFile("sfx/impact.wav")} volume={0.8} />
      </Sequence>
      <Sequence from={20} durationInFrames={20}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={260} durationInFrames={30}>
        <Audio src={staticFile("sfx/impact.wav")} volume={0.8} />
      </Sequence>
      <Sequence from={290} durationInFrames={15}>
        <Audio src={staticFile("sfx/click.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={340} durationInFrames={15}>
        <Audio src={staticFile("sfx/click.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={390} durationInFrames={15}>
        <Audio src={staticFile("sfx/click.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={560} durationInFrames={25}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.8} />
      </Sequence>
      <Sequence from={590} durationInFrames={35}>
        <Audio src={staticFile("sfx/impact.wav")} volume={0.9} />
      </Sequence>

      {/* 3D Stage Camera Container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${cameraZ}) rotateX(${cameraRotX}deg) rotateY(${cameraRotY}deg)`,
          transformStyle: "preserve-3d",
          position: "relative",
        }}
      >
        {/* Cinematic Animated Ambient Lighting Orbs */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            width: 800,
            height: 800,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 65%)",
            transform: "translate(-50%, -50%)",
            filter: "blur(120px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 65%)",
            filter: "blur(100px)",
            pointerEvents: "none",
          }}
        />

        {/* Dynamic Light Sweep Bar across the screen */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${lightX}%`,
            width: "35%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent)",
            transform: "skewX(-25deg)",
            pointerEvents: "none",
          }}
        />

        {/* Sleek Top Progress Line */}
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

        {/* SCENE 1: Kinetic Staggered Typography + Glass Card (0s - 10s / 0 - 300 frames) */}
        <Sequence from={0} durationInFrames={300}>
          <Scene1_KineticHook />
        </Sequence>

        {/* SCENE 2: High-End Interactive UI Simulation (10s - 20s / 290 - 600 frames) */}
        <Sequence from={290} durationInFrames={310}>
          <Scene2_InteractiveUISimulation />
        </Sequence>

        {/* SCENE 3: Impact Metrics + Apple-Grade Conversion CTA (20s - 30s / 590 - 900 frames) */}
        <Sequence from={590} durationInFrames={310}>
          <Scene3_PremiumCTA />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// SCENE 1: Kinetic Staggered Typography & 3D Glass Surface
// =========================================================================
const Scene1_KineticHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Word-by-word staggered spring entrance
  const words = ["STOP", "TRUSTING", "THE", "PERIMETER."];

  const cardSpring = spring({ frame: frame - 15, fps, config: { damping: 14, stiffness: 90, mass: 0.8 } });
  const cardBlur = interpolate(frame, [15, 35], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "100px 50px 80px",
        boxSizing: "border-box",
      }}
    >
      {/* Category Pill with Pulsing LED */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 12px #10B981" }} />
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(248, 250, 252, 0.7)" }}>
          Next-Gen Zero Trust Network
        </span>
      </div>

      {/* Kinetic Word-by-Word Hero */}
      <div style={{ margin: "20px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", marginBottom: 28 }}>
          {words.map((w, idx) => {
            const delay = idx * 6;
            const wSpring = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 140, mass: 0.5 } });
            const wSlide = interpolate(frame, [delay, delay + 12], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const wOpacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            const isAccent = w === "PERIMETER.";

            return (
              <span
                key={idx}
                style={{
                  fontSize: 74,
                  fontWeight: 900,
                  letterSpacing: -2,
                  lineHeight: 1.05,
                  transform: `scale(${wSpring}) translateY(${wSlide}px)`,
                  opacity: wOpacity,
                  color: isAccent ? "#10B981" : "#FFFFFF",
                  textShadow: isAccent ? "0 0 40px rgba(16, 185, 129, 0.5)" : "none",
                  display: "inline-block",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>

        {/* Premium Glassmorphic Security Telemetry Card */}
        <div
          style={{
            transform: `scale(${cardSpring}) translateY(${interpolate(frame, [0, 150], [0, -10])}px)`,
            filter: `blur(${cardBlur}px)`,
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02))",
            backdropFilter: "blur(30px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 24,
            padding: "36px",
            boxShadow: "0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.6)", fontWeight: 600 }}>Legacy Perimeter Status</span>
            <span style={{ padding: "4px 12px", borderRadius: 9999, background: "#EF444422", color: "#EF4444", fontSize: 13, fontWeight: 700, border: "1px solid #EF444444" }}>
              COMPROMISED
            </span>
          </div>

          <div style={{ fontSize: 32, fontWeight: 800, color: "#FFFFFF", marginBottom: 12 }}>
            VPN Tunnel Exposed
          </div>
          <div style={{ fontSize: 20, color: "rgba(248, 250, 252, 0.6)", lineHeight: 1.4 }}>
            Subnet routes open. Lateral movement unprotected across 4,200 internal nodes.
          </div>
        </div>
      </div>

      <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.4)", letterSpacing: 1 }}>
        01 / 03 • ARCHITECTURE FAILURE
      </div>
    </div>
  );
};

// =========================================================================
// SCENE 2: Interactive UI Simulation (Micro-Tunnels & Verification)
// =========================================================================
const Scene2_InteractiveUISimulation: React.FC = () => {
  const frame = useCurrentFrame();

  const pipelineSteps = [
    { name: "Continuous Identity Proof", latency: "1.2ms", status: "VERIFIED", delay: 10 },
    { name: "Device EDR Telemetry & Health", latency: "3.4ms", status: "SECURE", delay: 60 },
    { name: "App-Level Micro-Tunneling", latency: "0.8ms", status: "ISOLATED", delay: 110 },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "100px 50px 80px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#06B6D4", boxShadow: "0 0 12px #06B6D4" }} />
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#06B6D4" }}>
          Active Policy Enforcement
        </span>
      </div>

      <div>
        <h2 style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1.5, margin: "0 0 40px 0" }}>
          Granular Trust. <br />
          <span style={{ color: "#10B981" }}>Every Single Request.</span>
        </h2>

        {/* Real-time Verification Stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {pipelineSteps.map((step, idx) => {
            const slide = interpolate(frame, [step.delay, step.delay + 18], [50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const opacity = interpolate(frame, [step.delay, step.delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const checkScale = interpolate(frame, [step.delay + 12, step.delay + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div
                key={idx}
                style={{
                  transform: `translateX(${slide}px)`,
                  opacity,
                  background: "rgba(15, 23, 42, 0.65)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: 20,
                  padding: "24px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
                }}
              >
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF" }}>{step.name}</div>
                  <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.5)", marginTop: 4, fontFamily: "monospace" }}>
                    RTT: {step.latency} • Zero Network Footprint
                  </div>
                </div>

                <div
                  style={{
                    transform: `scale(${checkScale})`,
                    padding: "8px 16px",
                    borderRadius: 12,
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid #10B98166",
                    color: "#10B981",
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 1,
                  }}
                >
                  ✓ {step.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.4)", letterSpacing: 1 }}>
        02 / 03 • ZERO TRUST ENFORCEMENT
      </div>
    </div>
  );
};

// =========================================================================
// SCENE 3: Apple-Grade Conversion & Metric Impact
// =========================================================================
const Scene3_PremiumCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ctaSpring = spring({ frame, fps, config: { damping: 14, stiffness: 90, mass: 0.6 } });
  const pulse = interpolate(Math.sin((frame / fps) * Math.PI * 3), [-1, 1], [25, 60]);

  // Animated counting metrics
  const metricSurface = Math.floor(interpolate(frame, [0, 60], [0, 95], { extrapolateRight: "clamp" }));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "100px 50px 80px",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 12px #10B981" }} />
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#10B981" }}>
          Production Outcome
        </span>
      </div>

      <div>
        {/* Dynamic Metric Cards */}
        <div style={{ display: "flex", gap: 20, marginBottom: 40 }}>
          <div style={{ flex: 1, background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: 24, padding: "34px 16px" }}>
            <div style={{ fontSize: 72, fontWeight: 900, color: "#10B981", lineHeight: 1 }}>
              {metricSurface}%
            </div>
            <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.7)", marginTop: 10 }}>Attack Surface Removed</div>
          </div>
          <div style={{ flex: 1, background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(6, 182, 212, 0.35)", borderRadius: 24, padding: "34px 16px" }}>
            <div style={{ fontSize: 72, fontWeight: 900, color: "#06B6D4", lineHeight: 1 }}>
              0ms
            </div>
            <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.7)", marginTop: 10 }}>Lateral Traversal Allowed</div>
          </div>
        </div>

        <h2 style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.1, letterSpacing: -2, margin: "0 0 36px 0" }}>
          Never trust. <br />
          <span style={{ color: "#10B981" }}>Always verify.</span>
        </h2>

        {/* High-End Pill CTA Button */}
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
          Deploy Zero Trust Today →
        </div>
      </div>

      <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.4)", letterSpacing: 1 }}>
        03 / 03 • ENTERPRISE READY
      </div>
    </div>
  );
};

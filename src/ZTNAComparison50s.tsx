import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile, Img } from "remotion";

export const ZTNAComparison50s: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 50 seconds * 30 fps = 1500 total frames
  const totalFrames = 1500;
  const progressPercent = (frame / totalFrames) * 100;

  // Global subtle grid drift
  const gridShift = (frame * 1.6) % 50;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#070B14",
        color: "#F8FAFC",
        fontFamily: "'Segoe UI', -apple-system, Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Audio Track */}
      <Audio src={staticFile("cyber_audio.wav")} volume={0.85} />

      {/* Cyber Grid Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(16, 185, 129, 0.06) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(16, 185, 129, 0.06) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
          transform: `translateY(${gridShift}px)`,
          pointerEvents: "none",
        }}
      />

      {/* Top Progress Line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${progressPercent}%`,
          height: 6,
          background: "linear-gradient(90deg, #EF4444, #10B981)",
          zIndex: 50,
        }}
      />

      {/* ========================================================
          ACT 1: THE OLD WAY - TRADITIONAL VPN TRAP (0s - 16s / frames 0 - 480)
          ======================================================== */}
      <Sequence from={0} durationInFrames={480}>
        <Act1_OldVPNProblem />
      </Sequence>

      {/* ========================================================
          ACT 2: THE REAL BREACH DISASTER (16s - 28s / frames 480 - 840)
          ======================================================== */}
      <Sequence from={480} durationInFrames={360}>
        <Act2_BreachDisaster />
      </Sequence>

      {/* ========================================================
          ACT 3: THE PROPOSED SOLUTION - ZTNA REVOLUTION (28s - 42s / frames 840 - 1260)
          ======================================================== */}
      <Sequence from={840} durationInFrames={420}>
        <Act3_ZTNARevolution />
      </Sequence>

      {/* ========================================================
          ACT 4: TRANSFORMATION STATS & CTA (42s - 50s / frames 1260 - 1500)
          ======================================================== */}
      <Sequence from={1260} durationInFrames={240}>
        <Act4_CTA />
      </Sequence>
    </AbsoluteFill>
  );
};

// ACT 1: Before ZTNA - The VPN Illusion
const Act1_OldVPNProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 90, mass: 0.7 } });
  const pulseAlert = Math.sin((frame / fps) * Math.PI * 4) > 0;

  const caption =
    frame < 150
      ? "BEFORE ZTNA: Your company trusted the traditional VPN 'Castle & Moat'."
      : frame < 320
      ? "Once an employee logs in, they are handed the keys to the entire castle."
      : "No micro-boundaries. Unlimited lateral movement across servers.";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "100px 60px 80px", textAlign: "center", boxSizing: "border-box" }}>
      <div style={{ padding: "8px 22px", borderRadius: 9999, border: "1px solid #EF444466", background: "rgba(239, 68, 68, 0.15)", color: pulseAlert ? "#EF4444" : "#FCA5A5", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>
        ⚠️ BEFORE ZTNA: THE VPN ILLUSION
      </div>

      <div style={{ transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Animated Emoji Cartoon Scene */}
        <div style={{ fontSize: 90, marginBottom: 20 }}>
          🏰 ➔ 🗝️ ➔ 🔓
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.15, color: "#FFFFFF" }}>
          One Password Opens <br />
          <span style={{ color: "#EF4444" }}>The Entire Castle.</span>
        </div>
        <div style={{ marginTop: 24, fontSize: 26, color: "rgba(248, 250, 252, 0.7)", maxWidth: 850 }}>
          Legacy VPNs grant broad network-level access. If one remote laptop gets phished, the attacker is inside everything.
        </div>
      </div>

      {/* Synchronized Caption Pill */}
      <div style={{ width: "100%", background: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "18px 24px", borderRadius: 18, fontSize: 24, fontWeight: 600, color: "#F8FAFC" }}>
        💬 "{caption}"
      </div>
    </div>
  );
};

// ACT 2: Lateral Spread Disaster
const Act2_BreachDisaster: React.FC = () => {
  const frame = useCurrentFrame();

  const cards = [
    { emoji: "🎣", title: "Phished Credential", sub: "1 stolen employee password", color: "#F59E0B", delay: 10 },
    { emoji: "⚡", title: "Lateral Network Hop", sub: "Traverses internal subnets freely", color: "#EF4444", delay: 100 },
    { emoji: "💣", title: "Ransomware Lockdown", sub: "Average $4.88M breach disaster", color: "#EC4899", delay: 190 },
  ];

  const caption =
    frame < 120
      ? "Hackers don't break in — they log in with phished credentials."
      : frame < 240
      ? "From one marketing laptop, malware hops directly into your SQL database."
      : "Castle-and-moat security has failed modern hybrid work.";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "100px 60px 80px", textAlign: "center", boxSizing: "border-box" }}>
      <div style={{ padding: "8px 22px", borderRadius: 9999, border: "1px solid #EF444466", background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>
        💥 HOW THE BREACH HAPPENS
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        {cards.map((c, i) => {
          const slide = interpolate(frame, [c.delay, c.delay + 18], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const op = interpolate(frame, [c.delay, c.delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                transform: `translateX(${slide}px)`,
                opacity: op,
                background: "rgba(15, 23, 42, 0.85)",
                border: `1px solid ${c.color}55`,
                borderRadius: 20,
                padding: "24px 30px",
                display: "flex",
                alignItems: "center",
                gap: 24,
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 48 }}>{c.emoji}</div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{c.title}</div>
                <div style={{ fontSize: 20, color: "rgba(248, 250, 252, 0.7)" }}>{c.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ width: "100%", background: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(255, 255, 255, 0.15)", padding: "18px 24px", borderRadius: 18, fontSize: 24, fontWeight: 600, color: "#F8FAFC" }}>
        💬 "{caption}"
      </div>
    </div>
  );
};

// ACT 3: The Proposed System - ZTNA Revolution
const Act3_ZTNARevolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const floatY = Math.sin((frame / fps) * Math.PI * 2) * 14;

  const ztnaPillars = [
    { emoji: "👤", title: "Identity Validation", desc: "Adaptive MFA + context checks", delay: 20 },
    { emoji: "💻", title: "Device Posture", desc: "EDR health & encryption verified", delay: 110 },
    { emoji: "🔒", title: "App Micro-Tunnels", desc: "Network is NEVER exposed", delay: 200 },
  ];

  const caption =
    frame < 140
      ? "THE PROPOSED SYSTEM: Zero Trust Network Access (ZTNA)."
      : frame < 280
      ? "Motto: 'Never Trust, Always Verify' every request on every device."
      : "Employees only connect to specific authorized apps — zero network access.";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "100px 60px 80px", textAlign: "center", boxSizing: "border-box" }}>
      <div style={{ padding: "8px 22px", borderRadius: 9999, border: "1px solid #10B98166", background: "rgba(16, 185, 129, 0.15)", color: "#10B981", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>
        🛡️ PROPOSED SYSTEM: ZERO TRUST (ZTNA)
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        {/* Floating Cyber Shield 2D Cartoon */}
        <div style={{ transform: `translateY(${floatY}px)`, width: 140, height: 140, marginBottom: 20, filter: "drop-shadow(0 15px 30px rgba(16, 185, 129, 0.4))" }}>
          <Img src={staticFile("stickers/cyber_shield.svg")} style={{ width: "100%", height: "100%" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
          {ztnaPillars.map((p, i) => {
            const slide = interpolate(frame, [p.delay, p.delay + 18], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const op = interpolate(frame, [p.delay, p.delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={i}
                style={{
                  transform: `translateX(${slide}px)`,
                  opacity: op,
                  background: "rgba(15, 23, 42, 0.85)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  borderRadius: 18,
                  padding: "18px 26px",
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 40 }}>{p.emoji}</div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF" }}>{p.title}</div>
                  <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.7)" }}>{p.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ width: "100%", background: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "18px 24px", borderRadius: 18, fontSize: 24, fontWeight: 600, color: "#F8FAFC" }}>
        💬 "{caption}"
      </div>
    </div>
  );
};

// ACT 4: Transformation Metrics & CTA
const Act4_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const btnSpring = spring({ frame, fps, config: { damping: 11, stiffness: 100 } });
  const pulse = interpolate(Math.sin((frame / fps) * Math.PI * 3), [-1, 1], [15, 40]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "100px 60px 80px", textAlign: "center", boxSizing: "border-box" }}>
      <div style={{ padding: "8px 22px", borderRadius: 9999, border: "1px solid #06B6D466", background: "rgba(6, 182, 212, 0.15)", color: "#06B6D4", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>
        ✨ THE RESULTS
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Comparison Result Cards */}
        <div style={{ display: "flex", gap: 24, width: "100%", marginBottom: 40 }}>
          <div style={{ flex: 1, background: "rgba(15, 23, 42, 0.85)", border: "1px solid #10B98144", borderRadius: 20, padding: "26px 16px" }}>
            <div style={{ fontSize: 58, fontWeight: 900, color: "#10B981", lineHeight: 1 }}>-95%</div>
            <div style={{ marginTop: 8, fontSize: 20, color: "rgba(248, 250, 252, 0.75)" }}>Attack Surface</div>
          </div>
          <div style={{ flex: 1, background: "rgba(15, 23, 42, 0.85)", border: "1px solid #06B6D444", borderRadius: 20, padding: "26px 16px" }}>
            <div style={{ fontSize: 58, fontWeight: 900, color: "#06B6D4", lineHeight: 1 }}>0ms</div>
            <div style={{ marginTop: 8, fontSize: 20, color: "rgba(248, 250, 252, 0.75)" }}>Lateral Threat</div>
          </div>
        </div>

        <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.15, marginBottom: 35 }}>
          Ditch The VPN Trap. <br />
          <span style={{ color: "#10B981" }}>Switch to Zero Trust.</span>
        </div>

        {/* CTA Button */}
        <div
          style={{
            transform: `scale(${btnSpring})`,
            background: "linear-gradient(135deg, #10B981, #06B6D4)",
            padding: "24px 50px",
            borderRadius: 20,
            fontSize: 32,
            fontWeight: 800,
            color: "#050811",
            boxShadow: `0 10px ${pulse}px rgba(16, 185, 129, 0.5)`,
            cursor: "pointer",
            width: "90%",
          }}
        >
          Upgrade to ZTNA Now 🚀
        </div>
      </div>

      <div style={{ width: "100%", background: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "18px 24px", borderRadius: 18, fontSize: 24, fontWeight: 600, color: "#F8FAFC" }}>
        💬 "Stop lateral movement. Protect your hybrid workforce with Zero Trust."
      </div>
    </div>
  );
};

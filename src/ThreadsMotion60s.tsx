import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig, Img } from "remotion";
import threadsData from "./threadsData.json";

// Pixel-Perfect Official Threads Vector Icon
const ThreadsLogo: React.FC<{ size?: number; color?: string; glow?: boolean }> = ({
  size = 120,
  color = "#FFFFFF",
  glow = true,
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    style={{
      filter: glow ? `drop-shadow(0 0 30px ${color}99) drop-shadow(0 0 60px ${color}44)` : "none",
    }}
  >
    <path
      fill={color}
      d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"
    />
  </svg>
);

// Mathematical Harmonic Waveform Visualizer (Audio Reactive)
const MathableWaveform: React.FC<{ frame: number; count?: number; color?: string; height?: number }> = ({
  frame,
  count = 38,
  color = "#00F0FF",
  height = 90,
}) => {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 7, height }}>
      {Array.from({ length: count }).map((_, i) => {
        // Mathematical harmonic synthesis formula matching ffmpeg aevalsrc expression:
        // f(t) = 0.22*sin(2pi*55*t) + 0.12*sin(2pi*82.5*t) + 0.08*sin(2pi*165*t) + ...
        const wave1 = Math.sin((frame * 0.14) + (i * 0.38));
        const wave2 = Math.cos((frame * 0.09) - (i * 0.24));
        const pulse = Math.sin((frame * 0.22) + (i * 0.15));
        const combined = Math.abs(wave1 * 0.5 + wave2 * 0.3 + pulse * 0.2);
        const barHeight = Math.max(14, combined * (height - 8));

        return (
          <div
            key={i}
            style={{
              width: 7,
              height: barHeight,
              borderRadius: 4,
              background: `linear-gradient(to top, ${color}33, ${color})`,
              boxShadow: `0 0 14px ${color}88`,
            }}
          />
        );
      })}
    </div>
  );
};

// =========================================================================
// SCENE 1: THE THREADS API AWAKENING (0s - 12s / Frames 0 - 360)
// =========================================================================
const Scene1_Awakening: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const logoScale = spring({ frame: frame - 8, fps, config: { damping: 11, stiffness: 120 } });
  const logoRotate = interpolate(frame, [0, 360], [-6, 6]);

  const handshakeFrame = 60;
  const handshakeDone = frame >= handshakeFrame;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "130px 54px 100px 54px",
        textAlign: "center",
      }}
    >
      {/* Top Section: Live Status Pill */}
      <div
        style={{
          background: "rgba(16, 185, 129, 0.15)",
          border: "1.5px solid rgba(16, 185, 129, 0.6)",
          borderRadius: 9999,
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 0 40px rgba(16, 185, 129, 0.35)",
          transform: `scale(${spring({ frame, fps, config: { damping: 10 } })})`,
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: handshakeDone ? "#10B981" : "#F59E0B",
            boxShadow: `0 0 16px ${handshakeDone ? "#10B981" : "#F59E0B"}`,
          }}
        />
        <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: "#10B981", fontFamily: "monospace" }}>
          {handshakeDone ? "GRAPH.THREADS.NET • HTTP 200 OK" : "AUTHENTICATING THREADS API KEY..."}
        </span>
      </div>

      {/* Middle Section: Hero Emblem & Kinetic Title */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
            marginBottom: 36,
          }}
        >
          <ThreadsLogo size={180} color="#FFFFFF" glow={true} />
        </div>

        <div
          style={{
            fontSize: 78,
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1.08,
            letterSpacing: -2,
            maxWidth: 960,
            textShadow: "0 10px 40px rgba(0,0,0,0.8)",
          }}
        >
          AUTONOMOUS <br />
          <span
            style={{
              background: "linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 35px rgba(0, 240, 255, 0.5))",
            }}
          >
            THREADS API
          </span>{" "}
          MOTION
        </div>

        <div
          style={{
            fontSize: 26,
            color: "rgba(248, 250, 252, 0.75)",
            marginTop: 24,
            maxWidth: 820,
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          Automated code-driven motion promo integrated directly with Meta Graph API credentials.
        </div>
      </div>

      {/* Bottom Section: Live Key Credentials Card + Waveform */}
      <div style={{ width: "100%", maxWidth: 900 }}>
        <div
          style={{
            background: "rgba(15, 23, 42, 0.88)",
            border: "1.5px solid rgba(0, 240, 255, 0.3)",
            borderRadius: 24,
            padding: "26px 34px",
            backdropFilter: "blur(24px)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
            textAlign: "left",
            fontFamily: "monospace",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ color: "#64748B", fontSize: 16 }}>APP_ID:</span>
            <span style={{ color: "#00F0FF", fontWeight: 700, fontSize: 17 }}>{threadsData.appId}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ color: "#64748B", fontSize: 16 }}>SECRET_KEY:</span>
            <span style={{ color: "#A855F7", fontWeight: 700, fontSize: 17 }}>{threadsData.secretKeyMasked}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748B", fontSize: 16 }}>ACCESS_TOKEN:</span>
            <span style={{ color: "#10B981", fontWeight: 700, fontSize: 17 }}>{threadsData.accessTokenMasked}</span>
          </div>
        </div>

        {/* Audio Spectrum Footer */}
        <MathableWaveform frame={frame} count={36} color="#00F0FF" height={70} />
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// SCENE 2: LIVE PROFILE & IDENTITY TELEMETRY (12s - 24s / Frames 360 - 720)
// =========================================================================
const Scene2_ProfileTelemetry: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const localFrame = frame - 360;
  const cardSpring = spring({ frame: localFrame, fps, config: { damping: 12, stiffness: 110 } });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "130px 54px 100px 54px",
      }}
    >
      {/* Top Header */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: "#00F0FF", marginBottom: 12 }}>
          LIVE API AUTHENTICATION
        </div>
        <div style={{ fontSize: 64, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1.5 }}>
          Verified Identity Telemetry
        </div>
      </div>

      {/* 3D Glassmorphic Profile Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 920,
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(15, 23, 42, 0.92) 100%)",
          border: "1.5px solid rgba(0, 240, 255, 0.4)",
          borderRadius: 36,
          padding: "48px 44px",
          boxShadow: "0 30px 80px rgba(0, 240, 255, 0.2), 0 40px 100px rgba(0, 0, 0, 0.9)",
          backdropFilter: "blur(30px)",
          transform: `perspective(1000px) rotateX(4deg) scale(${cardSpring})`,
          display: "flex",
          flexDirection: "column",
          gap: 34,
        }}
      >
        {/* User Info Header with Real Profile Picture */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              position: "relative",
              width: 120,
              height: 120,
              borderRadius: "50%",
              padding: 4,
              background: "linear-gradient(135deg, #00F0FF, #A855F7, #10B981)",
              boxShadow: "0 0 35px rgba(0, 240, 255, 0.6)",
              flexShrink: 0,
            }}
          >
            <Img
              src={staticFile("threads_pfp.jpg")}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
            {/* Live Indicator Dot */}
            <div
              style={{
                position: "absolute",
                bottom: 4,
                right: 4,
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#10B981",
                border: "3.5px solid #060A12",
                boxShadow: "0 0 14px #10B981",
              }}
            />
          </div>

          <div style={{ textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 44, fontWeight: 900, color: "#FFFFFF" }}>{threadsData.user.name}</span>
              <span
                style={{
                  background: "rgba(0, 240, 255, 0.2)",
                  color: "#00F0FF",
                  fontSize: 14,
                  fontWeight: 900,
                  padding: "5px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(0, 240, 255, 0.6)",
                  letterSpacing: 1,
                }}
              >
                VERIFIED DEV
              </span>
            </div>
            <div style={{ fontSize: 26, color: "#A855F7", fontWeight: 800, marginTop: 4 }}>
              @{threadsData.user.username}
            </div>
            <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.55)", fontFamily: "monospace", marginTop: 8 }}>
              THREADS USER ID: {threadsData.user.id}
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "rgba(255, 255, 255, 0.04)", borderRadius: 20, padding: "24px", border: "1px solid rgba(255, 255, 255, 0.09)" }}>
            <div style={{ fontSize: 14, color: "#64748B", fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
              RATE LIMIT USAGE
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#10B981", marginTop: 6 }}>
              0 / 250
            </div>
            <div style={{ fontSize: 15, color: "rgba(248, 250, 252, 0.6)", marginTop: 4 }}>
              100% Free Quota Available
            </div>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.04)", borderRadius: 20, padding: "24px", border: "1px solid rgba(255, 255, 255, 0.09)" }}>
            <div style={{ fontSize: 14, color: "#64748B", fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
              API CAPABILITIES
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#00F0FF", marginTop: 12 }}>
              threads_basic, publish
            </div>
            <div style={{ fontSize: 15, color: "rgba(248, 250, 252, 0.6)", marginTop: 6 }}>
              Direct Content & Media Publish
            </div>
          </div>
        </div>

        {/* Real-time verified telemetry banner */}
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.45)",
            borderRadius: 16,
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF" }}>Meta Graph API Handshake Status:</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>
            AUTHENTICATED & ACTIVE
          </span>
        </div>
      </div>

      {/* Bottom Feature Badges */}
      <div style={{ display: "flex", gap: 16, width: "100%", maxWidth: 920 }}>
        {["Sub-100ms Handshake", "Zero Cloud Regression", "Real-Time Webhooks"].map((feat, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 16,
              padding: "14px 18px",
              textAlign: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(248, 250, 252, 0.8)",
            }}
          >
            ✔ {feat}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// SCENE 3: LIVE TERMINAL & INSTANT PUBLISHING (24s - 36s / Frames 720 - 1080)
// =========================================================================
const Scene3_TerminalPublishing: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const localFrame = frame - 720;
  const cmd = `curl -X POST "https://graph.threads.net/v1.0/me/threads"`;
  const typedCount = Math.min(cmd.length, Math.floor(interpolate(localFrame, [10, 50], [0, cmd.length], { extrapolateRight: "clamp" })));
  const displayed = cmd.slice(0, typedCount);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "130px 54px 100px 54px",
      }}
    >
      {/* Top Header */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: "#10B981", marginBottom: 12 }}>
          AUTOMATED PUBLISHING ENGINE
        </div>
        <div style={{ fontSize: 64, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1.5 }}>
          Live API Code Execution
        </div>
      </div>

      {/* Terminal Window */}
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          background: "rgba(10, 15, 29, 0.96)",
          backdropFilter: "blur(30px)",
          border: "1.5px solid rgba(0, 240, 255, 0.35)",
          borderRadius: 32,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(0, 240, 255, 0.25), 0 40px 100px rgba(0, 0, 0, 0.9)",
          transform: "perspective(1100px) rotateX(4deg)",
        }}
      >
        {/* macOS Title Bar */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            padding: "22px 30px",
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
            <span style={{ marginLeft: 16, fontSize: 17, color: "rgba(248, 250, 252, 0.75)", fontFamily: "monospace" }}>
              bash — threads_dispatch.sh
            </span>
          </div>
          <div style={{ fontSize: 14, fontFamily: "monospace", color: "#10B981", background: "rgba(16, 185, 129, 0.2)", padding: "5px 16px", borderRadius: 8, fontWeight: 700 }}>
            LIVE RUNTIME
          </div>
        </div>

        {/* Terminal Body */}
        <div style={{ padding: "40px 36px", minHeight: 480, fontFamily: "monospace", fontSize: 21, lineHeight: 1.6 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: 14, fontWeight: 900, color: "#00F0FF", fontSize: 26 }}>$</span>
            <span style={{ color: "#F8FAFC" }}>{displayed}</span>
            <span style={{ display: "inline-block", width: 12, height: 26, background: "#00F0FF", marginLeft: 6 }} />
          </div>

          <div style={{ marginTop: 24, color: "rgba(248, 250, 252, 0.65)", fontSize: 18 }}>
            &nbsp;&nbsp;-H "Authorization: Bearer THAAY5iOix4...WttbGcZD" \<br />
            &nbsp;&nbsp;-d 'text=Automating high-impact motion graphics on @threads 🚀'
          </div>

          {localFrame > 60 && (
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ color: "#10B981", fontSize: 19, fontWeight: 700 }}>
                ✔ HTTP/2 200 OK (38ms round-trip latency)
              </div>
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.85)",
                  border: "1px solid rgba(16, 185, 129, 0.55)",
                  borderRadius: 16,
                  padding: "22px 26px",
                  color: "#FFFFFF",
                  fontSize: 18,
                  boxShadow: "0 10px 35px rgba(16, 185, 129, 0.2)",
                }}
              >
                &#123;<br />
                &nbsp;&nbsp;"id": "179924820194821",<br />
                &nbsp;&nbsp;"status": "PUBLISHED",<br />
                &nbsp;&nbsp;"author": "@bharath082006",<br />
                &nbsp;&nbsp;"timestamp": "2026-10-28T10:09:50Z"<br />
                &#125;
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "18px 36px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 15,
            fontFamily: "monospace",
            color: "rgba(248, 250, 252, 0.5)",
          }}
        >
          <span>GRAPH API ENGINE: META CLOUD</span>
          <span style={{ color: "#00F0FF", fontWeight: 700 }}>ZERO LATENCY BOTTLENECK</span>
        </div>
      </div>

      {/* Terminal Telemetry Strip */}
      <div style={{ width: "100%", maxWidth: 960 }}>
        <MathableWaveform frame={frame} count={38} color="#10B981" height={70} />
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// SCENE 4: MATHABLE SOUND & HIGH-SCALE ANALYTICS (36s - 48s / Frames 1080 - 1440)
// =========================================================================
const Scene4_MathableSound: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const localFrame = frame - 1080;
  const count = Math.min(100, Math.floor(interpolate(localFrame, [10, 60], [0, 100], { extrapolateRight: "clamp" })));

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "130px 54px 100px 54px",
      }}
    >
      {/* Top Header */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: "#A855F7", marginBottom: 12 }}>
          MATHEMATICAL FREQUENCY MATRIX
        </div>
        <div style={{ fontSize: 64, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1.5 }}>
          Mathable Sound Reactive
        </div>
      </div>

      {/* Central Metric Dial with Audio Waveform */}
      <div
        style={{
          width: "100%",
          maxWidth: 920,
          background: "linear-gradient(135deg, rgba(168, 85, 247, 0.14) 0%, rgba(15, 23, 42, 0.94) 100%)",
          border: "1.5px solid rgba(168, 85, 247, 0.45)",
          borderRadius: 36,
          padding: "44px",
          backdropFilter: "blur(28px)",
          boxShadow: "0 25px 80px rgba(168, 85, 247, 0.25)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div style={{ fontSize: 104, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>
          {count}
          <span style={{ color: "#00F0FF", fontSize: 52 }}>%</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "rgba(248, 250, 252, 0.95)", letterSpacing: 1.5 }}>
          DETERMINISTIC CODE-DRIVEN ANIMATION
        </div>

        {/* Real-time Mathematical Waveform Display */}
        <div style={{ width: "100%", marginTop: 8 }}>
          <div style={{ fontSize: 14, color: "#64748B", fontFamily: "monospace", textAlign: "center", marginBottom: 14 }}>
            HARMONIC SINE OSCILLATOR (55Hz / 82.5Hz / 165Hz / 330Hz)
          </div>
          <MathableWaveform frame={frame} count={38} color="#00F0FF" height={90} />
        </div>

        {/* Dual Metric Cards */}
        <div style={{ display: "flex", gap: 20, width: "100%", marginTop: 10 }}>
          <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.04)", borderRadius: 20, padding: "24px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 14, color: "#64748B", fontWeight: 800 }}>DISPATCH TIME</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#10B981", marginTop: 4 }}>&lt; 40ms</div>
            <div style={{ fontSize: 15, color: "rgba(248, 250, 252, 0.6)", marginTop: 2 }}>Instant Remotion Render</div>
          </div>
          <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.04)", borderRadius: 20, padding: "24px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 14, color: "#64748B", fontWeight: 800 }}>AUDIO BED MATCH</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#A855F7", marginTop: 4 }}>120 BPM</div>
            <div style={{ fontSize: 15, color: "rgba(248, 250, 252, 0.6)", marginTop: 2 }}>Exact 60s Synchronized Loop</div>
          </div>
        </div>
      </div>

      {/* Bottom Math Synthesis Formula */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 16,
          padding: "16px 32px",
          fontFamily: "monospace",
          fontSize: 16,
          color: "rgba(248, 250, 252, 0.7)",
        }}
      >
        AUDIO EVAL: aevalsrc = 0.22*sin(2π*55*t) + 0.12*sin(2π*82.5*t) + 0.08*sin(2π*165*t)
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// SCENE 5: EPIC FINALE & CALL TO ACTION (48s - 60s / Frames 1440 - 1800)
// =========================================================================
const Scene5_CallToAction: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const localFrame = frame - 1440;
  const btnScale = spring({ frame: localFrame - 15, fps, config: { damping: 10, stiffness: 120 } });
  const shimmerX = interpolate(localFrame, [20, 80], [-100, 250], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "130px 54px 100px 54px",
        textAlign: "center",
      }}
    >
      {/* Top Badge */}
      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: "#00F0FF" }}>
        META GRAPH API CERTIFIED
      </div>

      {/* Center Section: Threads Crest + Headline + CTA Button */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            transform: `scale(${spring({ frame: localFrame, fps, config: { damping: 9 } })}) rotate(${Math.sin(frame / 20) * 8}deg)`,
            marginBottom: 36,
          }}
        >
          <ThreadsLogo size={180} color="#FFFFFF" glow={true} />
        </div>

        <div style={{ fontSize: 72, fontWeight: 900, color: "#FFFFFF", letterSpacing: -2, maxWidth: 940, lineHeight: 1.1, marginBottom: 44 }}>
          BUILD WITH THE <br />
          <span
            style={{
              background: "linear-gradient(135deg, #00F0FF, #10B981)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            THREADS API TODAY
          </span>
        </div>

        {/* Glossy Gradient Button */}
        <div
          style={{
            transform: `scale(${btnScale})`,
            position: "relative",
            width: "100%",
            maxWidth: 720,
            height: 104,
            borderRadius: 9999,
            background: "linear-gradient(90deg, #00F0FF, #A855F7)",
            boxShadow: "0 0 60px rgba(0, 240, 255, 0.6), 0 20px 40px rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${shimmerX}%`,
              width: 160,
              background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)",
              transform: "skewX(-25deg)",
            }}
          />
          <span style={{ fontSize: 30, fontWeight: 900, color: "#050811", letterSpacing: 1 }}>
            CONNECT TO THREADS API →
          </span>
        </div>
      </div>

      {/* Bottom Authenticated User Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          borderRadius: 9999,
          padding: "14px 32px",
        }}
      >
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 12px #10B981" }} />
        <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(248, 250, 252, 0.9)" }}>
          Authenticated Developer: <strong style={{ color: "#FFFFFF" }}>@{threadsData.user.username}</strong> ({threadsData.user.name})
        </span>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// MAIN ROOT COMPOSITION: 60-Second Threads Motion Animation
// =========================================================================
export const ThreadsMotion60s: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background Cyber Grid Flow
  const gridShiftY = (frame * 1.5) % 60;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050811",
        color: "#F8FAFC",
        fontFamily: "'Segoe UI', -apple-system, Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* 1. MASTER 60-SECOND MATHABLE AUDIO SOUNDTRACK */}
      <Audio
        src={staticFile("threads_master_audio.wav")}
        volume={(f) =>
          interpolate(f, [0, 20, 1750, 1800], [0, 0.85, 0.85, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />

      {/* 2. SYNCHRONIZED SFX IMPACTS & WHOOSHES AT KEY SCENE TRANSITIONS */}
      {/* Act 1 Intro */}
      <Sequence from={0} durationInFrames={45}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={60} durationInFrames={45}>
        <Audio src={staticFile("sfx/impact.wav")} volume={0.7} />
      </Sequence>

      {/* Act 2 Profile reveal */}
      <Sequence from={360} durationInFrames={45}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={390} durationInFrames={45}>
        <Audio src={staticFile("sfx/impact.wav")} volume={0.75} />
      </Sequence>

      {/* Act 3 Terminal & Code Typing */}
      <Sequence from={720} durationInFrames={45}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={750} durationInFrames={30}>
        <Audio src={staticFile("sfx/click.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={780} durationInFrames={30}>
        <Audio src={staticFile("sfx/click.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={820} durationInFrames={45}>
        <Audio src={staticFile("sfx/impact.wav")} volume={0.7} />
      </Sequence>

      {/* Act 4 Mathable Sound & Analytics */}
      <Sequence from={1080} durationInFrames={45}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={1140} durationInFrames={45}>
        <Audio src={staticFile("sfx/impact.wav")} volume={0.75} />
      </Sequence>

      {/* Act 5 Climax & CTA */}
      <Sequence from={1440} durationInFrames={45}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={1480} durationInFrames={45}>
        <Audio src={staticFile("sfx/impact.wav")} volume={0.85} />
      </Sequence>

      {/* 3. CINEMATIC BACKGROUND: Cyber Grid + Deep Ambient Nebulae */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(0, 240, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 240, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          backgroundPosition: `0px ${gridShiftY}px`,
          pointerEvents: "none",
        }}
      />

      {/* Radial Atmospheric Ambient Glows */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          left: "50%",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
          filter: "blur(90px)",
          pointerEvents: "none",
        }}
      />

      {/* 4. PERSISTENT PROGRESS BAR (0s -> 60s) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${(frame / 1800) * 100}%`,
          height: 6,
          background: "linear-gradient(90deg, #00F0FF, #A855F7, #10B981)",
          zIndex: 100,
        }}
      />

      {/* Top Telemetry Header */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 54,
          right: 54,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 90,
          fontSize: 16,
          fontFamily: "monospace",
          color: "rgba(248, 250, 252, 0.65)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThreadsLogo size={26} color="#00F0FF" glow={false} />
          <span>THREADS GRAPH API / ME</span>
        </div>
        <div>
          <span>{Math.floor(frame / 30)}s / 60s</span>
        </div>
      </div>

      {/* 5. FIVE DISTINCT 12-SECOND SCENES (0 - 1800 frames) */}
      <Sequence from={0} durationInFrames={360}>
        <Scene1_Awakening frame={frame} fps={fps} />
      </Sequence>

      <Sequence from={360} durationInFrames={360}>
        <Scene2_ProfileTelemetry frame={frame} fps={fps} />
      </Sequence>

      <Sequence from={720} durationInFrames={360}>
        <Scene3_TerminalPublishing frame={frame} fps={fps} />
      </Sequence>

      <Sequence from={1080} durationInFrames={360}>
        <Scene4_MathableSound frame={frame} fps={fps} />
      </Sequence>

      <Sequence from={1440} durationInFrames={360}>
        <Scene5_CallToAction frame={frame} fps={fps} />
      </Sequence>
    </AbsoluteFill>
  );
};

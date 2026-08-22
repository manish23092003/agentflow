import React, { useRef, useMemo, useEffect, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import * as THREE from 'three';

// ─── Color System ─────────────────────────────────────────────────────────────
// Pure black + Cyan + Amber. No purple. No generic AI gradients.
const C = {
  bg: '#000000',
  surface: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',
  cyan: '#22d3ee',
  cyanDim: 'rgba(34,211,238,0.12)',
  amber: '#f59e0b',
  amberDim: 'rgba(245,158,11,0.12)',
  green: '#4ade80',
  greenDim: 'rgba(74,222,128,0.10)',
  rose: '#fb7185',
  roseDim: 'rgba(251,113,133,0.10)',
  text: '#fafafa',
  textMuted: '#71717a',
  textFaint: '#3f3f46',
};

// ─── 3D: Data Globe ───────────────────────────────────────────────────────────
// Represents "researching the web" — a globe with data connection arcs
// Each arc is a source-to-destination connection, like data being retrieved

const GlobeScene = () => {
  const groupRef = useRef<THREE.Group>(null);

  // Latitude/longitude grid points on a sphere
  const { gridPoints, arcPairs } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const R = 2.0;
    // Spiral distribution for even spacing
    const N = 120;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;
      pts.push(new THREE.Vector3(R * r * Math.cos(theta), R * y, R * r * Math.sin(theta)));
    }

    // Pick 18 random arcs between distant points (data connections)
    const arcs: [THREE.Vector3, THREE.Vector3][] = [];
    const used = new Set<number>();
    let attempts = 0;
    while (arcs.length < 18 && attempts < 200) {
      attempts++;
      const a = Math.floor(Math.random() * N);
      const b = Math.floor(Math.random() * N);
      if (a === b || used.has(a * N + b)) continue;
      if (pts[a].distanceTo(pts[b]) < 1.5) continue; // must be far apart
      used.add(a * N + b);
      arcs.push([pts[a], pts[b]]);
    }
    return { gridPoints: pts, arcPairs: arcs };
  }, []);

  // Build arc geometries (great-circle arcs lifted above surface)
  const arcGeometries = useMemo(() =>
    arcPairs.map(([a, b]) => {
      const curve = new THREE.QuadraticBezierCurve3(
        a,
        new THREE.Vector3(
          (a.x + b.x) * 0.5 * 1.6,
          (a.y + b.y) * 0.5 * 1.6,
          (a.z + b.z) * 0.5 * 1.6,
        ),
        b
      );
      const points = curve.getPoints(50);
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      return geom;
    }), [arcPairs]);

  // Points geometry for the globe dots
  const dotsGeometry = useMemo(() => {
    const positions = new Float32Array(gridPoints.length * 3);
    gridPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [gridPoints]);

  // Animated pulsing arc - one arc glows bright at a time
  const [activeArc, setActiveArc] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActiveArc(a => (a + 1) % arcPairs.length), 800);
    return () => clearInterval(id);
  }, [arcPairs.length]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Globe wire dots */}
      <points geometry={dotsGeometry}>
        <pointsMaterial
          size={0.045}
          color="#22d3ee"
          transparent
          opacity={0.45}
          sizeAttenuation
        />
      </points>

      {/* Dim arcs */}
      {arcGeometries.map((geom, i) => (
        // @ts-expect-error - Ignore R3F intrinsic element type error
        <line key={i} geometry={geom}>
          <lineBasicMaterial
            color={i === activeArc ? '#22d3ee' : '#0e4a52'}
            transparent
            opacity={i === activeArc ? 1.0 : 0.25}
          />
        </line>
      ))}

      {/* Active arc bright dot at destination */}
      {arcPairs[activeArc] && (
        <mesh position={arcPairs[activeArc][1]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#22d3ee" />
        </mesh>
      )}
    </group>
  );
};

const DataGlobe = () => (
  <Canvas
    camera={{ position: [0, 0, 5.5], fov: 50 }}
    style={{ background: 'transparent', width: '100%', height: '100%' }}
    gl={{ antialias: true, alpha: true }}
  >
    <ambientLight intensity={0.2} />
    <pointLight position={[4, 4, 4]} color="#22d3ee" intensity={2} />
    <pointLight position={[-4, -4, -4]} color="#f59e0b" intensity={0.5} />
    <Suspense fallback={null}>
      <GlobeScene />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.1}
          luminanceSmoothing={0.5}
          intensity={1.6}
          radius={0.7}
        />
      </EffectComposer>
    </Suspense>
    <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
  </Canvas>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fade = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] as const },
  }),
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

// ─── Typewriter ───────────────────────────────────────────────────────────────

const WORDS = ['deep insights', 'cited reports', 'accurate answers', 'sourced analysis', 'verified data'];
const Typewriter = () => {
  const [wi, setWi] = useState(0);
  const [txt, setTxt] = useState('');
  const [del, setDel] = useState(false);

  useEffect(() => {
    const word = WORDS[wi];
    let t: ReturnType<typeof setTimeout>;
    if (!del && txt.length < word.length)       t = setTimeout(() => setTxt(word.slice(0, txt.length + 1)), 65);
    else if (!del && txt.length === word.length) t = setTimeout(() => setDel(true), 2400);
    else if (del && txt.length > 0)              t = setTimeout(() => setTxt(txt.slice(0, -1)), 35);
    else { setDel(false); setWi(i => (i + 1) % WORDS.length); }
    return () => clearTimeout(t);
  }, [txt, del, wi]);

  return (
    <span style={{ color: C.cyan }}>
      {txt}<span style={{ borderRight: `2px solid ${C.cyan}`, marginLeft: 2, animation: 'cursor-blink 1s step-end infinite' }} />
    </span>
  );
};

// ─── Counter ──────────────────────────────────────────────────────────────────

const Counter = ({ to, suffix = '' }: { to: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let s = 0; const step = to / 60;
    const id = setInterval(() => { s += step; if (s >= to) { setVal(to); clearInterval(id); } else setVal(Math.floor(s)); }, 16);
    return () => clearInterval(id);
  }, [inView, to]);
  return <span ref={ref}>{val}{suffix}</span>;
};

// ─── Terminal Component ───────────────────────────────────────────────────────

const TERMINAL_LINES = [
  { t: 0,    color: C.textMuted,  text: '$ agentflow research --goal "AI hiring trends India 2026"' },
  { t: 600,  color: C.cyan,       text: '▸ Initializing research session...' },
  { t: 1200, color: C.textMuted,  text: '  Searching: Tavily AI / Google / Bing News' },
  { t: 1800, color: C.text,       text: '  ✓ Found: TechCrunch India — "TCS announces 40K freshers freeze"' },
  { t: 2400, color: C.text,       text: '  ✓ Found: Reuters — "Infosys Q2 headcount down 6.3%"' },
  { t: 3000, color: C.amber,      text: '  ⚡ Premium dataset available: NASSCOM Tech Report 2026' },
  { t: 3600, color: C.amber,      text: '     Cost: 0.05 USDC  |  Waiting for your approval...' },
  { t: 4200, color: C.green,      text: '  ✓ You approved. Processing x402 payment via Algorand...' },
  { t: 4800, color: C.green,      text: '  ✓ Payment settled. Resource unlocked.' },
  { t: 5400, color: C.cyan,       text: '▸ Synthesizing report from 14 sources...' },
  { t: 6000, color: C.green,      text: '  ✓ Report ready — 1,847 words, 14 citations' },
];

const Terminal = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timers = TERMINAL_LINES.map((l, i) =>
      setTimeout(() => setShown(i + 1), l.t)
    );
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <div ref={ref} style={{
      background: '#0a0a0a',
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: '0.78rem',
    }}>
      {/* Title bar */}
      <div style={{ background: '#111', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.border}` }}>
        {['#ef4444','#f59e0b','#22d3ee'].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />
        ))}
        <span style={{ color: C.textFaint, marginLeft: 8, fontSize: '0.7rem', letterSpacing: '0.05em' }}>agentflow — research agent</span>
      </div>

      {/* Lines */}
      <div style={{ padding: '20px 24px', minHeight: 280, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TERMINAL_LINES.slice(0, shown).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            style={{ color: line.color, lineHeight: 1.6, whiteSpace: 'pre' }}
          >
            {line.text}
          </motion.div>
        ))}
        {shown < TERMINAL_LINES.length && (
          <span style={{ color: C.textMuted }}>
            █<span style={{ animation: 'cursor-blink 0.8s step-end infinite' }} />
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Bento Feature Cards ──────────────────────────────────────────────────────

const BENTO = [
  {
    span: '1 / span 2', rowspan: '1', icon: '🔍',
    title: 'Autonomous web research',
    desc: 'Give it a question. Gemini AI reads dozens of sources, decides what\'s relevant, discards noise, and synthesises a picture of the truth.',
    accent: C.cyan, accentDim: C.cyanDim,
    tag: 'GEMINI AI'
  },
  {
    span: '3', rowspan: '1', icon: '🛡️',
    title: 'Policy engine',
    desc: 'Deterministic rules govern every payment. The AI can suggest. Only you can approve.',
    accent: C.amber, accentDim: C.amberDim,
    tag: 'SECURE'
  },
  {
    span: '1', rowspan: '1', icon: '⚡',
    title: 'x402 micro-payments',
    desc: 'Pay per source, not per month. Algorand USDC settles in seconds.',
    accent: C.green, accentDim: C.greenDim,
    tag: 'ALGORAND'
  },
  {
    span: '2 / span 2', rowspan: '1', icon: '📡',
    title: 'Live event stream',
    desc: 'Every source found, every decision taken, every cent spent — streamed to your browser the instant it happens.',
    accent: C.rose, accentDim: C.roseDim,
    tag: 'REAL-TIME'
  },
];

const BentoCard = ({ b, i }: { b: typeof BENTO[0]; i: number }) => {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      variants={fade} custom={i}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        gridColumn: b.span,
        padding: '28px 28px',
        borderRadius: 18,
        background: hov ? b.accentDim : C.surface,
        border: `1px solid ${hov ? b.accent + '40' : C.border}`,
        transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? `0 20px 50px ${b.accent}15` : 'none',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{b.icon}</span>
        <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', color: b.accent, background: b.accentDim, border: `1px solid ${b.accent}30`, padding: '3px 8px', borderRadius: 99 }}>{b.tag}</span>
      </div>
      <h3 style={{ color: C.text, fontWeight: 700, fontSize: '1rem', marginBottom: 10, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{b.title}</h3>
      <p style={{ color: C.textMuted, fontSize: '0.85rem', lineHeight: 1.75, margin: 0 }}>{b.desc}</p>
    </motion.div>
  );
};

// ─── Marquee ──────────────────────────────────────────────────────────────────

const MARQUEE_ITEMS = ['Gemini AI', 'Algorand Testnet', 'x402 Payments', 'Tavily Search', 'Human-in-the-Loop', 'USDC Micro-payments', 'Real-time SSE', 'Markdown Reports', 'Policy Engine'];

const Marquee = () => (
  <div style={{ overflow: 'hidden', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '14px 0', position: 'relative' }}>
    <div style={{ display: 'flex', gap: 0, animation: 'marquee 30s linear infinite', width: 'max-content', whiteSpace: 'nowrap' }}>
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span key={i} style={{ padding: '0 32px', color: C.textMuted, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.cyan, opacity: 0.6, display: 'inline-block' }} />
          {item}
        </span>
      ))}
    </div>
  </div>
);

// ─── Main Landing ─────────────────────────────────────────────────────────────

export const Landing = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const globeY = useTransform(scrollY, [0, 600], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: C.text }}>

      {/* ── Subtle noise texture overlay ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.025, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '200px' }} />

      {/* ── Dot-grid background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* ── Glow blobs ── */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '60%', height: '60%', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '60%', height: '60%', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2.5rem', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', background: 'rgba(0,0,0,0.85)', borderBottom: `1px solid ${C.border}` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#000', letterSpacing: '-0.05em' }}>AF</div>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.025em' }}>AgentFlow</span>
          <span style={{ fontSize: '0.65rem', color: C.textFaint, fontWeight: 600, letterSpacing: '0.08em', marginLeft: 4, border: `1px solid ${C.textFaint}`, borderRadius: 4, padding: '1px 6px' }}>BETA</span>
        </div>

        <nav style={{ display: 'flex', gap: 6 }}>
          {[['Dashboard', '/'], ['History', '/history'], ['Payments', '/payments']].map(([label, path]) => (
            <button key={label} onClick={() => navigate(path)}
              style={{ background: 'transparent', color: C.textMuted, border: 'none', padding: '7px 14px', fontSize: '0.83rem', fontWeight: 500, cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.surface; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; }}
            >{label}</button>
          ))}
          <button onClick={() => navigate('/research/new')}
            style={{ background: C.cyan, color: '#000', border: 'none', borderRadius: 8, padding: '7px 18px', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '-0.01em' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >Start research →</button>
        </nav>
      </motion.nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', paddingTop: 60, gap: 0, zIndex: 1, maxWidth: 1360, margin: '0 auto', padding: '60px 3rem 0' }}>
        {/* Left: text */}
        <motion.div
          style={{ opacity: heroOpacity }}
          initial="hidden" animate="show" variants={stagger}
        >
          <motion.div variants={fade} custom={0} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${C.border}`, borderRadius: 999, padding: '5px 14px', marginBottom: 28, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block', boxShadow: `0 0 8px ${C.green}` }} />
            LIVE RESEARCH AGENT
          </motion.div>

          <motion.h1 variants={fade} custom={1}
            style={{ fontSize: 'clamp(3rem, 5.5vw, 4.5rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 24 }}>
            Research the web.<br />
            Get <Typewriter />
          </motion.h1>

          <motion.p variants={fade} custom={2}
            style={{ color: C.textMuted, fontSize: '1.05rem', lineHeight: 1.8, maxWidth: 440, marginBottom: 40 }}>
            An autonomous AI agent that finds, evaluates and synthesises research from the open web — and pays for premium data sources only when you approve it.
          </motion.p>

          <motion.div variants={fade} custom={3} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/research/new')}
              style={{ background: C.cyan, color: '#000', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 36px ${C.cyan}30`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Start a research session
              <span style={{ fontSize: 16 }}>→</span>
            </button>
            <button onClick={() => navigate('/')}
              style={{ background: 'transparent', color: C.text, border: `1px solid ${C.borderStrong}`, borderRadius: 10, padding: '13px 24px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surface; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >View Dashboard</button>
          </motion.div>

          {/* Social proof line */}
          <motion.div variants={fade} custom={4} style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: -8 }}>
              {['#22d3ee','#f59e0b','#4ade80','#fb7185','#a78bfa'].map((c, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid #000', marginLeft: i > 0 ? -10 : 0, opacity: 0.85 }} />
              ))}
            </div>
            <span style={{ color: C.textMuted, fontSize: '0.8rem' }}>Built for researchers, analysts & founders</span>
          </motion.div>
        </motion.div>

        {/* Right: 3D Globe */}
        <motion.div
          style={{ y: globeY, height: 500, position: 'relative' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <DataGlobe />
          {/* Floating annotation cards */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: '15%', left: '0%', background: 'rgba(0,0,0,0.85)', border: `1px solid ${C.cyan}30`, borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(12px)', pointerEvents: 'none' }}
          >
            <div style={{ fontSize: '0.65rem', color: C.cyan, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>SOURCE FOUND</div>
            <div style={{ fontSize: '0.78rem', color: C.text, fontWeight: 500 }}>Reuters — Infosys Q2 data</div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1 }}
            style={{ position: 'absolute', bottom: '20%', right: '2%', background: 'rgba(0,0,0,0.85)', border: `1px solid ${C.amber}30`, borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(12px)', pointerEvents: 'none' }}
          >
            <div style={{ fontSize: '0.65rem', color: C.amber, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>APPROVAL NEEDED</div>
            <div style={{ fontSize: '0.78rem', color: C.text, fontWeight: 500 }}>NASSCOM Report — 0.05 USDC</div>
          </motion.div>
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 2 }}
            style={{ position: 'absolute', top: '50%', right: '0%', background: 'rgba(0,0,0,0.85)', border: `1px solid ${C.green}30`, borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(12px)', pointerEvents: 'none' }}
          >
            <div style={{ fontSize: '0.65rem', color: C.green, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>PAYMENT SETTLED</div>
            <div style={{ fontSize: '0.78rem', color: C.text, fontWeight: 500 }}>0.05 USDC · Algorand tx</div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Marquee ── */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: 0 }}>
        <Marquee />
      </div>

      {/* ── STATS ── */}
      <section style={{ position: 'relative', zIndex: 2, padding: '80px 3rem', maxWidth: 1360, margin: '0 auto' }}>
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: C.border, borderRadius: 20, overflow: 'hidden' }}
        >
          {[
            { value: 50, suffix: '+', label: 'Sources per session', sub: 'Free + premium data combined' },
            { value: 100, suffix: '%', label: 'Transparent decisions', sub: 'Every action logged in real time' },
            { value: 30, suffix: 's', label: 'Time to start', sub: 'Just type your research goal' },
            { value: 0, suffix: ' clicks', label: 'Needed from you', sub: 'Unless payment approval needed' },
          ].map((s, i) => (
            <motion.div key={i} variants={fade} custom={i}
              style={{ padding: '36px 28px', background: C.bg, textAlign: 'center' }}>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: C.text, letterSpacing: '-0.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: '0.875rem', marginTop: 12, marginBottom: 4 }}>{s.label}</div>
              <div style={{ color: C.textMuted, fontSize: '0.78rem', lineHeight: 1.5 }}>{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── BENTO FEATURES ── */}
      <section style={{ position: 'relative', zIndex: 2, padding: '60px 3rem 100px', maxWidth: 1360, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={stagger} style={{ marginBottom: 48, maxWidth: 560 }}>
          <motion.p variants={fade} style={{ color: C.cyan, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.14em', marginBottom: 14 }}>WHAT IT DOES</motion.p>
          <motion.h2 variants={fade} custom={1} style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 16 }}>
            An agent that does the work.<br /><span style={{ color: C.textMuted }}>You just ask.</span>
          </motion.h2>
          <motion.p variants={fade} custom={2} style={{ color: C.textMuted, lineHeight: 1.7, fontSize: '0.9rem' }}>
            AgentFlow automates every step of deep research — search, evaluation, payment, synthesis. Built with security and transparency as first principles.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} variants={stagger}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {BENTO.map((b, i) => <BentoCard key={i} b={b} i={i} />)}
        </motion.div>
      </section>

      {/* ── TERMINAL: HOW IT WORKS ── */}
      <section style={{ position: 'relative', zIndex: 2, padding: '0 3rem 120px', maxWidth: 1360, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ color: C.amber, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.14em', marginBottom: 14 }}>UNDER THE HOOD</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 24 }}>
              Watch the agent think<br /><span style={{ color: C.textMuted }}>in real time</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              style={{ color: C.textMuted, lineHeight: 1.75, fontSize: '0.9rem', marginBottom: 28 }}>
              AgentFlow streams every decision live — what it found, what it skipped, what it wants to buy, and what you approved. You always know what it's doing and why.
            </motion.p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: '🔍', text: 'Searches free web sources', color: C.cyan },
                { icon: '⚡', text: 'Proposes premium purchases', color: C.amber },
                { icon: '✅', text: 'Waits for your approval', color: C.green },
                { icon: '📋', text: 'Writes the final report', color: C.rose },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.3, duration: 0.4 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.875rem', color: C.textMuted }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{item.icon}</span>
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <Terminal />
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', zIndex: 2, padding: '0 3rem 120px', maxWidth: 1360, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
          style={{ borderRadius: 24, padding: '80px 64px', border: `1px solid ${C.border}`, background: C.surface, position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
          {/* Background decoration */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: '1px', background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)` }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, height: 400, background: `radial-gradient(circle, ${C.cyanDim} 0%, transparent 70%)`, pointerEvents: 'none', filter: 'blur(40px)' }} />

          <motion.h2 variants={fade} style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16, position: 'relative' }}>
            Ready to research smarter?
          </motion.h2>
          <motion.p variants={fade} custom={1} style={{ color: C.textMuted, fontSize: '1rem', marginBottom: 40, maxWidth: 460, margin: '0 auto 40px', lineHeight: 1.7, position: 'relative' }}>
            Public web research is always free. Premium data sources cost a few cents — and only when you say so.
          </motion.p>
          <motion.div variants={fade} custom={2} style={{ position: 'relative' }}>
            <button onClick={() => navigate('/research/new')}
              style={{ background: C.cyan, color: '#000', border: 'none', borderRadius: 12, padding: '16px 40px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s', letterSpacing: '-0.01em' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 48px ${C.cyan}35`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Start your first research →
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position: 'relative', zIndex: 2, borderTop: `1px solid ${C.border}`, padding: '40px 3rem', maxWidth: 1360, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: C.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#000' }}>AF</div>
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>AgentFlow</span>
        </div>
        <div style={{ display: 'flex', gap: 24, color: C.textMuted, fontSize: '0.78rem' }}>
          {['Dashboard', 'History', 'Approvals', 'Payments'].map(p => (
            <button key={p} onClick={() => navigate('/' + p.toLowerCase())}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.text)}
              onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
            >{p}</button>
          ))}
        </div>
        <p style={{ color: C.textFaint, fontSize: '0.75rem' }}>Gemini AI · Algorand · x402</p>
      </footer>

      <style>{`
        @keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
};

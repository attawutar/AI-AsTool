import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

// ─── Socket singleton ─────────────────────────────────────────────────────────
let _socket = null
function getSocket() {
  if (!_socket) {
    _socket = io(window.location.origin, { transports: ['websocket', 'polling'] })
  }
  return _socket
}

// ─── useLocalStorage hook ─────────────────────────────────────────────────────
function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) : defaultValue }
    catch { return defaultValue }
  })
  const set = useCallback(v => {
    setValue(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])
  return [value, set]
}

// ─── Icebreaker questions ─────────────────────────────────────────────────────
const QUESTIONS = [
  { q: 'If you could have any superpower, what would it be and why?', cat: '🎉 Fun' },
  { q: "What's your most unpopular opinion?", cat: '🎉 Fun' },
  { q: 'What would you do first if you won the lottery tomorrow?', cat: '🎉 Fun' },
  { q: 'If you could only eat one food forever, what would it be?', cat: '🎉 Fun' },
  { q: 'Would you rather have no internet for a month or no AC for a month in Thailand?', cat: '🎉 Fun' },
  { q: "What's the most embarrassing song on your playlist?", cat: '🎉 Fun' },
  { q: 'If your life had a theme song, what would it be?', cat: '🎨 Creative' },
  { q: 'If you were an animal, which one and why?', cat: '🎨 Creative' },
  { q: 'Describe your ideal Saturday in exactly 3 words.', cat: '🎨 Creative' },
  { q: "What's a skill you've always wanted to learn but never started?", cat: '🎨 Creative' },
  { q: 'If you could swap lives with anyone for one day, who would it be?', cat: '🎨 Creative' },
  { q: 'What one thing changed your perspective on life?', cat: '💭 Deep' },
  { q: "What are you proud of that you rarely talk about?", cat: '💭 Deep' },
  { q: 'What does success look like to you in 5 years?', cat: '💭 Deep' },
  { q: 'Who has had the biggest impact on your life, and how?', cat: '💭 Deep' },
  { q: 'What advice would you give your 16-year-old self?', cat: '💭 Deep' },
  { q: 'What did you imagine university life would be like vs. reality?', cat: '🎓 Campus' },
  { q: "What's the most useful thing you've learned at university so far?", cat: '🎓 Campus' },
  { q: 'If you could add one course to the curriculum, what would it be?', cat: '🎓 Campus' },
  { q: "What's your go-to stress relief during exam season?", cat: '🎓 Campus' },
  { q: "What's the best thing about being at CMKL?", cat: '🎓 Campus' },
  { q: 'Share one thing nobody here knows about you.', cat: '🤝 Team' },
  { q: "What's your hidden talent?", cat: '🤝 Team' },
  { q: 'Describe yourself in one emoji and explain why.', cat: '🤝 Team' },
  { q: 'What one thing do you want to accomplish at this event today?', cat: '🤝 Team' },
  { q: "What's your favourite way to contribute to a team?", cat: '🤝 Team' },
]

const WHEEL_COLORS = ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ec4899','#6366f1','#ef4444','#14b8a6','#f97316','#a855f7']

// ─── Shared UI ────────────────────────────────────────────────────────────────
function AnimatedBg() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0f1e]" />
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
      <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-indigo-500/8 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  )
}

function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-5 ${className}`}>
      {children}
    </div>
  )
}

function GlowButton({ children, onClick, variant = 'primary', className = '', disabled = false, size = 'md' }) {
  const base = 'font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-base', lg: 'px-6 py-3 text-lg' }
  const variants = {
    primary: 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105',
    secondary: 'bg-white/[0.08] text-white border border-white/10 hover:bg-white/[0.14]',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/20 hover:scale-105',
    success: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105',
    ghost: 'text-white/60 hover:text-white hover:bg-white/[0.06]',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

function Logo({ size = 'md' }) {
  const s = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-5xl' }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`font-black tracking-tight ${s[size]}`}>
        <span className="text-white">CMKL </span>
        <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Event Helper</span>
      </div>
      <div className="h-0.5 w-16 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full" />
    </div>
  )
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin inline-block" />
}

function BackBtn({ onBack }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-4 transition-colors">
      ← Back
    </button>
  )
}

function CodeDisplay({ code }) {
  return (
    <div className="text-center">
      <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Room Code</p>
      <div className="text-5xl font-black tracking-[0.3em] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
        {code}
      </div>
    </div>
  )
}

// ─── EmojiParticles ───────────────────────────────────────────────────────────
function EmojiParticles({ emojis = ['🎉','⭐','🎊','✨'] }) {
  const items = Array.from({ length: 12 }, (_, i) => ({
    emoji: emojis[i % emojis.length], id: i,
    x: Math.random() * 100, delay: Math.random() * 2, dur: 2 + Math.random() * 2
  }))
  return (
    <>
      <style>{`@keyframes emojiPop{0%{transform:translateY(0) scale(0);opacity:1}100%{transform:translateY(-120px) scale(1.4);opacity:0}}`}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {items.map(p => (
          <div key={p.id} className="absolute text-2xl" style={{
            left: `${p.x}%`, bottom: '20%',
            animation: `emojiPop ${p.dur}s ease-out ${p.delay}s infinite`
          }}>{p.emoji}</div>
        ))}
      </div>
    </>
  )
}

// ─── WelcomeScreen ────────────────────────────────────────────────────────────
function WelcomeScreen({ onSelect }) {
  const cards = [
    { id: 'host',          icon: '🎯', label: 'Group Randomizer', sub: 'Host a session',      color: 'from-cyan-500 to-blue-600' },
    { id: 'participant',   icon: '👥', label: 'Group Randomizer', sub: 'Join as participant',  color: 'from-blue-500 to-indigo-600' },
    { id: 'poll',          icon: '🗳️', label: 'Live Poll',        sub: 'Real-time voting',     color: 'from-violet-500 to-purple-600' },
    { id: 'scoreboard',    icon: '🏆', label: 'Team Scoreboard',  sub: 'Live leaderboard',     color: 'from-amber-500 to-orange-600' },
    { id: 'timer',         icon: '⏱️', label: 'Countdown Timer',  sub: 'Projector-ready',      color: 'from-emerald-500 to-teal-600' },
    { id: 'lucky-draw',    icon: '🎰', label: 'Lucky Draw',       sub: 'Prize raffle',         color: 'from-pink-500 to-rose-600' },
    { id: 'spin-wheel',    icon: '🎡', label: 'Spin the Wheel',   sub: 'Random selection',     color: 'from-fuchsia-500 to-pink-600' },
    { id: 'icebreaker',    icon: '🧊', label: 'Icebreaker',       sub: 'Random questions',     color: 'from-sky-500 to-cyan-600' },
    { id: 'seating',       icon: '🪑', label: 'Seating Planner',  sub: 'Table assignments',    color: 'from-lime-500 to-green-600' },
    { id: 'qr-generator',  icon: '🔗', label: 'QR Generator',     sub: 'Instant QR codes',     color: 'from-slate-500 to-gray-600' },
  ]
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4">
      <AnimatedBg />
      <Logo size="lg" />
      <p className="text-white/40 text-sm mt-3 mb-8">Your all-in-one event toolkit</p>
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map(c => (
          <button key={c.id} onClick={() => onSelect(c.id)}
            className="group flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-200 text-left">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}>
              {c.icon}
            </div>
            <div>
              <div className="text-white font-semibold text-sm">{c.label}</div>
              <div className="text-white/40 text-xs">{c.sub}</div>
            </div>
            <div className="ml-auto text-white/20 group-hover:text-white/50 transition-colors text-lg">›</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Group Randomizer: Host ───────────────────────────────────────────────────
function HostScreen({ onBack }) {
  const socket = getSocket()
  const [phase, setPhase] = useState('creating')
  const [roomCode, setRoomCode] = useState('')
  const [participants, setParticipants] = useState([])
  const [groups, setGroups] = useState(null)
  const [numGroups, setNumGroups] = useState(2)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    socket.emit('create-room', ({ success, roomCode: code, error: err }) => {
      if (success) { setRoomCode(code); setPhase('lobby') }
      else setError(err || 'Failed to create room')
    })
    socket.on('room-update', ({ participants: p, groups: g }) => { setParticipants(p); setGroups(g) })
    socket.on('groups-randomized', ({ groups: g }) => { setGroups(g); setPhase('results') })
    return () => { socket.off('room-update'); socket.off('groups-randomized') }
  }, [])

  const randomize = () => {
    setLoading(true)
    socket.emit('set-num-groups', { numGroups })
    socket.emit('randomize-groups', ({ success, error: e }) => {
      setLoading(false)
      if (!success) setError(e || 'Randomize failed')
    })
  }
  const reset = () => { socket.emit('reset-groups'); setGroups(null); setPhase('lobby') }

  if (phase === 'creating') return (
    <div className="min-h-screen flex items-center justify-center"><AnimatedBg /><Spinner /></div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-md">
        <BackBtn onBack={onBack} />
        <Logo /><div className="mt-6" />

        {phase === 'lobby' && (
          <>
            <GlassCard className="mb-4 text-center">
              <CodeDisplay code={roomCode} />
              <p className="text-white/40 text-xs mt-2">Participants visit this URL and enter the code</p>
            </GlassCard>
            <GlassCard className="mb-4">
              <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Participants ({participants.length})</p>
              {participants.length === 0
                ? <p className="text-white/30 text-sm text-center py-4">Waiting for people to join…</p>
                : <div className="flex flex-wrap gap-2">{participants.map(p => (
                    <span key={p.id} className="px-2.5 py-1 rounded-full bg-white/[0.07] text-white/80 text-sm">{p.name}</span>
                  ))}</div>}
            </GlassCard>
            {participants.length >= 2 && (
              <GlassCard className="mb-4">
                <label className="text-white/50 text-xs uppercase tracking-widest block mb-2">Number of Groups</label>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: Math.min(participants.length, 8) - 1 }, (_, i) => i + 2).map(n => (
                    <button key={n} onClick={() => setNumGroups(n)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${numGroups === n ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' : 'bg-white/[0.07] text-white/60 hover:bg-white/[0.12]'}`}>{n}</button>
                  ))}
                </div>
              </GlassCard>
            )}
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <GlowButton onClick={randomize} disabled={participants.length < 2 || loading} className="w-full">
              {loading ? <Spinner /> : '🎲 Randomize Groups'}
            </GlowButton>
          </>
        )}

        {phase === 'results' && groups && (
          <>
            <EmojiParticles emojis={['🎉','⭐','🎊','✨']} />
            <div className="space-y-3 mb-5">
              {groups.map((g, gi) => (
                <GlassCard key={gi}>
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">{g.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.members.map(m => (
                      <span key={m.id} className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white/90 text-sm border border-white/10">{m.name}</span>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
            <GlowButton onClick={reset} variant="secondary" className="w-full">↩ Reset & Reshuffle</GlowButton>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Group Randomizer: Participant ────────────────────────────────────────────
function ParticipantJoinScreen({ onBack }) {
  const socket = getSocket()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)
  const [groups, setGroups] = useState(null)
  const [participants, setParticipants] = useState([])
  const [myGroupIndex, setMyGroupIndex] = useState(-1)

  useEffect(() => {
    socket.on('room-update', ({ participants: p, groups: g }) => { setParticipants(p); if (g) setGroups(g) })
    socket.on('groups-randomized', ({ groups: g }) => setGroups(g))
    socket.on('host-left', () => { setError('Host ended the session.'); setJoined(false) })
    return () => { socket.off('room-update'); socket.off('groups-randomized'); socket.off('host-left') }
  }, [])

  const join = () => {
    if (!code.trim() || !name.trim()) return setError('Enter both a code and your name.')
    setLoading(true); setError('')
    socket.emit('join-room', { roomCode: code.toUpperCase(), name: name.trim() }, ({ success, error: e, groups: g, myGroupIndex: mgi }) => {
      setLoading(false)
      if (success) { setJoined(true); if (g) { setGroups(g); setMyGroupIndex(mgi ?? -1) } }
      else setError(e || 'Could not join.')
    })
  }

  if (!joined) return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <BackBtn onBack={onBack} />
        <Logo /><div className="mt-8" />
        <GlassCard>
          <h2 className="text-white font-bold text-lg mb-4">Join a Session</h2>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Room Code" maxLength={4}
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 mb-3 text-center font-mono text-2xl tracking-widest uppercase outline-none focus:border-cyan-500/50" />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={30}
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 mb-4 outline-none focus:border-cyan-500/50"
            onKeyDown={e => e.key === 'Enter' && join()} />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <GlowButton onClick={join} disabled={loading} className="w-full">
            {loading ? <Spinner /> : 'Join →'}
          </GlowButton>
        </GlassCard>
      </div>
    </div>
  )

  if (groups) {
    const myGroup = myGroupIndex >= 0 ? groups[myGroupIndex] : null
    return (
      <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
        <EmojiParticles />
        <div className="w-full max-w-sm">
          <Logo /><div className="mt-6" />
          {myGroup && (
            <GlassCard className="mb-4 text-center border-cyan-500/30">
              <p className="text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-1">You are in</p>
              <p className="text-white text-3xl font-black">{myGroup.name}</p>
            </GlassCard>
          )}
          <GlassCard>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">All Groups</p>
            {groups.map((g, i) => (
              <div key={i} className={`mb-3 p-3 rounded-xl ${i === myGroupIndex ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/[0.03]'}`}>
                <p className="text-white/60 text-xs font-semibold mb-1">{g.name}</p>
                <div className="flex flex-wrap gap-1.5">{g.members.map(m => <span key={m.id} className="px-2 py-0.5 rounded-full bg-white/[0.08] text-white/80 text-xs">{m.name}</span>)}</div>
              </div>
            ))}
          </GlassCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <Logo /><div className="mt-8" />
        <GlassCard className="text-center">
          <div className="flex justify-center mb-4"><Spinner /></div>
          <p className="text-white font-semibold mb-1">You're in! Waiting for host…</p>
          <p className="text-white/40 text-sm mb-3">Room: <span className="font-mono text-white/70">{code}</span></p>
          <p className="text-white/50 text-xs">{participants.length} participant{participants.length !== 1 ? 's' : ''} joined</p>
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.4, 0.8].forEach(t => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.connect(g); g.connect(ctx.destination)
      osc.frequency.value = 880
      g.gain.setValueAtTime(0.3, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3)
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.3)
    })
  } catch {}
}

function TimerScreen({ onBack }) {
  const [totalSecs, setTotalSecs] = useLocalStorage('cmkl_timer_secs', 300)
  const [remaining, setRemaining] = useState(totalSecs)
  const [running, setRunning] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [customMin, setCustomMin] = useState('')
  const [customSec, setCustomSec] = useState('')
  const iRef = useRef(null)

  const presets = [60, 180, 300, 600, 900, 1200, 1800]
  const presetLabel = s => s >= 3600 ? `${s/3600}h` : `${s/60}m`

  const setTimer = secs => {
    clearInterval(iRef.current); setRunning(false)
    setTotalSecs(secs); setRemaining(secs)
  }

  useEffect(() => { setRemaining(totalSecs) }, [totalSecs])

  useEffect(() => {
    if (running) {
      iRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(iRef.current); setRunning(false); playBeep(); return 0 }
          return r - 1
        })
      }, 1000)
    } else clearInterval(iRef.current)
    return () => clearInterval(iRef.current)
  }, [running])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const pct = totalSecs > 0 ? remaining / totalSecs : 1
  const R = 90, C = 2 * Math.PI * R
  const isLow = pct < 0.25 && remaining > 0
  const isDone = remaining === 0
  const strokeColor = isDone ? '#ef4444' : isLow ? '#f59e0b' : 'url(#tGrad)'

  const applyCustom = () => {
    const total = (parseInt(customMin) || 0) * 60 + (parseInt(customSec) || 0)
    if (total > 0) { setTimer(total); setCustomMin(''); setCustomSec('') }
  }

  const timerContent = (
    <div className={`flex flex-col items-center ${fullscreen ? 'h-screen justify-center bg-[#0a0f1e]' : ''}`}>
      {!fullscreen && <BackBtn onBack={onBack} />}
      <div className="relative flex items-center justify-center" style={{ width: fullscreen ? 360 : 220, height: fullscreen ? 360 : 220 }}>
        <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90">
          <defs>
            <linearGradient id="tGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle cx="110" cy="110" r={R} fill="none" stroke={strokeColor} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.8s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-black tabular-nums text-white ${fullscreen ? 'text-8xl' : 'text-5xl'}`}>{mm}:{ss}</div>
          {isDone && <p className="text-red-400 text-sm mt-1 animate-pulse font-semibold">Time's up!</p>}
        </div>
      </div>

      {!fullscreen && (
        <>
          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            {presets.map(p => (
              <button key={p} onClick={() => setTimer(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${totalSecs === p ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' : 'bg-white/[0.07] text-white/60 hover:bg-white/[0.12]'}`}>
                {presetLabel(p)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-3 items-center">
            <input value={customMin} onChange={e => setCustomMin(e.target.value)} placeholder="mm" maxLength={2}
              className="w-14 bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1.5 text-white text-center text-sm outline-none focus:border-cyan-500/50" />
            <span className="text-white/40 font-bold">:</span>
            <input value={customSec} onChange={e => setCustomSec(e.target.value)} placeholder="ss" maxLength={2}
              className="w-14 bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1.5 text-white text-center text-sm outline-none focus:border-cyan-500/50" />
            <GlowButton onClick={applyCustom} size="sm" variant="secondary">Set</GlowButton>
          </div>
        </>
      )}

      <div className={`flex gap-3 ${fullscreen ? 'mt-10' : 'mt-5'}`}>
        <GlowButton onClick={() => setRunning(r => !r)} size={fullscreen ? 'lg' : 'md'} disabled={isDone}>
          {running ? '⏸ Pause' : '▶ Start'}
        </GlowButton>
        <GlowButton onClick={() => { clearInterval(iRef.current); setRunning(false); setRemaining(totalSecs) }} variant="secondary" size={fullscreen ? 'lg' : 'md'}>
          ↩ Reset
        </GlowButton>
        {!fullscreen && <GlowButton onClick={() => setFullscreen(true)} variant="secondary" size="md">⛶</GlowButton>}
      </div>
      {fullscreen && (
        <button onClick={() => setFullscreen(false)} className="mt-8 text-white/30 hover:text-white/60 text-sm transition-colors">
          Exit fullscreen
        </button>
      )}
    </div>
  )

  if (fullscreen) return timerContent

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">{timerContent}</div>
    </div>
  )
}

// ─── Live Poll ────────────────────────────────────────────────────────────────
const POLL_COLORS = ['#06b6d4','#8b5cf6','#10b981','#f59e0b']

function PollScreen({ onBack }) {
  const [mode, setMode] = useState('landing')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [pollCode, setPollCode] = useState('')
  const [pollData, setPollData] = useState(null)
  const [voted, setVoted] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    const s = getSocket()
    s.on('poll-update', ({ votes, total }) => setPollData(d => d ? { ...d, votes, total } : d))
    s.on('poll-ended', () => setEnded(true))
    return () => { s.off('poll-update'); s.off('poll-ended') }
  }, [])

  const createPoll = () => {
    const opts = options.map(o => o.trim()).filter(Boolean)
    if (!question.trim() || opts.length < 2) return setError('Add a question and at least 2 options.')
    setLoading(true); setError('')
    getSocket().emit('create-poll', { question: question.trim(), options: opts }, ({ success, code, error: e }) => {
      setLoading(false)
      if (success) { setPollCode(code); setPollData({ question: question.trim(), options: opts, votes: new Array(opts.length).fill(0), total: 0 }); setMode('hosting') }
      else setError(e || 'Failed to create poll')
    })
  }

  const joinPoll = () => {
    if (!joinCode.trim()) return setError('Enter a poll code.')
    setLoading(true); setError('')
    getSocket().emit('join-poll', { code: joinCode.toUpperCase() }, ({ success, question: q, options: opts, votes, voted: v, total, error: e }) => {
      setLoading(false)
      if (success) { setPollData({ question: q, options: opts, votes, total: total || 0 }); setVoted(v || false); setMode(v ? 'voted' : 'voting') }
      else setError(e || 'Poll not found')
    })
  }

  const submitVote = idx => {
    getSocket().emit('submit-vote', { code: joinCode.toUpperCase(), optionIndex: idx }, ({ success, error: e }) => {
      if (success) { setVoted(true); setMode('voted') }
      else setError(e || 'Could not submit vote')
    })
  }

  const resetPoll = () => { getSocket().emit('reset-poll', { code: pollCode }); setEnded(false) }
  const endPoll = () => getSocket().emit('end-poll', { code: pollCode })

  if (mode === 'landing') return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <BackBtn onBack={onBack} />
        <Logo /><div className="mt-8" />
        <div className="space-y-3">
          <GlowButton onClick={() => setMode('host-setup')} className="w-full" size="lg">🗳️ Create a Poll (Host)</GlowButton>
          <GlowButton onClick={() => setMode('join')} variant="secondary" className="w-full" size="lg">📊 Join a Poll (Vote)</GlowButton>
        </div>
      </div>
    </div>
  )

  if (mode === 'host-setup') return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <BackBtn onBack={() => setMode('landing')} />
        <Logo /><div className="mt-6" />
        <GlassCard>
          <h2 className="text-white font-bold mb-4">Create Poll</h2>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Your question…"
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 mb-4 outline-none focus:border-cyan-500/50" />
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Answer Options</p>
          {options.map((o, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={o} onChange={e => { const a=[...options]; a[i]=e.target.value; setOptions(a) }} placeholder={`Option ${i+1}`}
                className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-cyan-500/50 text-sm" />
              {options.length > 2 && <button onClick={() => setOptions(options.filter((_,j)=>j!==i))} className="text-white/30 hover:text-red-400 text-xl px-1">×</button>}
            </div>
          ))}
          {options.length < 4 && <button onClick={() => setOptions([...options,''])} className="text-cyan-400 text-sm hover:text-cyan-300 mb-4 block">+ Add option</button>}
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <GlowButton onClick={createPoll} disabled={loading} className="w-full mt-1">
            {loading ? <Spinner /> : '🚀 Start Poll'}
          </GlowButton>
        </GlassCard>
      </div>
    </div>
  )

  if (mode === 'hosting' && pollData) return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-md">
        <BackBtn onBack={() => { endPoll(); setMode('landing') }} />
        <Logo /><div className="mt-6" />
        <GlassCard className="mb-4 text-center">
          <CodeDisplay code={pollCode} />
          <p className="text-white/40 text-xs mt-1">Participants open app → "Live Poll" → "Join a Poll"</p>
        </GlassCard>
        <GlassCard className="mb-4">
          <p className="text-white font-semibold mb-1">{pollData.question}</p>
          <p className="text-white/40 text-xs mb-4">{pollData.total} vote{pollData.total!==1?'s':''} · {ended ? 'Poll ended' : 'Live'}</p>
          {pollData.options.map((opt,i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/80">{opt}</span>
                <span className="text-white/50">{pollData.votes[i]} ({pollData.total>0?Math.round(pollData.votes[i]/pollData.total*100):0}%)</span>
              </div>
              <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{width:`${pollData.total>0?pollData.votes[i]/pollData.total*100:0}%`,background:POLL_COLORS[i]}} />
              </div>
            </div>
          ))}
        </GlassCard>
        <div className="flex gap-3">
          <GlowButton onClick={resetPoll} variant="secondary" className="flex-1">↩ Reset Votes</GlowButton>
          <GlowButton onClick={endPoll} variant="danger" className="flex-1" disabled={ended}>🔒 End Poll</GlowButton>
        </div>
      </div>
    </div>
  )

  if (mode === 'join') return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <BackBtn onBack={() => setMode('landing')} />
        <Logo /><div className="mt-8" />
        <GlassCard>
          <h2 className="text-white font-bold mb-4">Join a Poll</h2>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Poll Code" maxLength={4}
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 mb-4 text-center font-mono text-2xl tracking-widest uppercase outline-none focus:border-cyan-500/50" />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <GlowButton onClick={joinPoll} disabled={loading} className="w-full">{loading ? <Spinner /> : 'Join →'}</GlowButton>
        </GlassCard>
      </div>
    </div>
  )

  if (mode === 'voting' && pollData) return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <Logo /><div className="mt-8" />
        <GlassCard>
          <p className="text-white font-bold text-lg mb-5">{pollData.question}</p>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="space-y-3">
            {pollData.options.map((opt,i) => (
              <button key={i} onClick={() => submitVote(i)}
                className="w-full py-3 px-4 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.12] text-white text-left transition-all hover:border-white/20">
                <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold mr-3 text-white" style={{background:POLL_COLORS[i]}}>{i+1}</span>
                {opt}
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )

  if ((mode === 'voted') && pollData) return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <Logo /><div className="mt-6" />
        <GlassCard className="mb-4 text-center border-emerald-500/30">
          <p className="text-emerald-400 text-2xl font-black">✓ Vote cast!</p>
          <p className="text-white/40 text-sm mt-1">Watch live results below</p>
        </GlassCard>
        <GlassCard>
          <p className="text-white font-semibold mb-1">{pollData.question}</p>
          <p className="text-white/40 text-xs mb-4">{pollData.total} vote{pollData.total!==1?'s':''}</p>
          {pollData.options.map((opt,i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/80">{opt}</span>
                <span className="text-white/50">{pollData.total>0?Math.round(pollData.votes[i]/pollData.total*100):0}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{width:`${pollData.total>0?pollData.votes[i]/pollData.total*100:0}%`,background:POLL_COLORS[i]}} />
              </div>
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  )

  return null
}

// ─── Team Scoreboard ──────────────────────────────────────────────────────────
function ScoreboardScreen({ onBack }) {
  const [mode, setMode] = useState('landing')
  const [teamInputs, setTeamInputs] = useState(['','','',''])
  const [sbCode, setSbCode] = useState('')
  const [teams, setTeams] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const s = getSocket()
    s.on('scoreboard-update', ({ teams: t }) => setTeams([...t]))
    return () => s.off('scoreboard-update')
  }, [])

  const createSb = () => {
    const valid = teamInputs.map(t => t.trim()).filter(Boolean)
    if (valid.length < 2) return setError('Add at least 2 teams.')
    setLoading(true); setError('')
    getSocket().emit('create-scoreboard', { teams: valid }, ({ success, code, teams: t, error: e }) => {
      setLoading(false)
      if (success) { setSbCode(code); setTeams(t); setMode('hosting') }
      else setError(e || 'Failed')
    })
  }

  const joinSb = () => {
    if (!joinCode.trim()) return setError('Enter a code.')
    setLoading(true); setError('')
    getSocket().emit('join-scoreboard', { code: joinCode.toUpperCase() }, ({ success, teams: t, error: e }) => {
      setLoading(false)
      if (success) { setTeams(t); setMode('watching') }
      else setError(e || 'Not found')
    })
  }

  const updateScore = (idx, delta) => getSocket().emit('update-score', { code: sbCode, teamIndex: idx, delta })
  const resetSb = () => getSocket().emit('reset-scoreboard', { code: sbCode })

  const sorted = [...teams].map((t,i) => ({...t,origIdx:i})).sort((a,b) => b.score - a.score)
  const rankColor = r => ['text-yellow-400','text-slate-300','text-amber-600'][r] || 'text-white/40'
  const rankBadge = r => ['🥇','🥈','🥉'][r] || `#${r+1}`

  if (mode === 'landing') return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <BackBtn onBack={onBack} />
        <Logo /><div className="mt-8" />
        <div className="space-y-3">
          <GlowButton onClick={() => setMode('host-setup')} className="w-full" size="lg">🏆 Create Scoreboard (Host)</GlowButton>
          <GlowButton onClick={() => setMode('join')} variant="secondary" className="w-full" size="lg">👁️ Watch Live</GlowButton>
        </div>
      </div>
    </div>
  )

  if (mode === 'host-setup') return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <BackBtn onBack={() => setMode('landing')} />
        <Logo /><div className="mt-6" />
        <GlassCard>
          <h2 className="text-white font-bold mb-4">Team Names</h2>
          {teamInputs.map((t,i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={t} onChange={e => { const a=[...teamInputs]; a[i]=e.target.value; setTeamInputs(a) }} placeholder={`Team ${i+1}`}
                className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-cyan-500/50 text-sm" />
              {teamInputs.length > 2 && <button onClick={() => setTeamInputs(teamInputs.filter((_,j)=>j!==i))} className="text-white/30 hover:text-red-400 text-xl px-1">×</button>}
            </div>
          ))}
          {teamInputs.length < 8 && <button onClick={() => setTeamInputs([...teamInputs,''])} className="text-cyan-400 text-sm hover:text-cyan-300 mb-4 block">+ Add team</button>}
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <GlowButton onClick={createSb} disabled={loading} className="w-full mt-2">
            {loading ? <Spinner /> : '🚀 Start Scoreboard'}
          </GlowButton>
        </GlassCard>
      </div>
    </div>
  )

  if (mode === 'hosting') return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-md">
        <BackBtn onBack={() => setMode('landing')} />
        <Logo /><div className="mt-4" />
        <GlassCard className="mb-4 text-center">
          <CodeDisplay code={sbCode} />
          <p className="text-white/40 text-xs mt-1">Participants open app → "Team Scoreboard" → "Watch Live"</p>
        </GlassCard>
        <div className="space-y-2 mb-4">
          {sorted.map((team, rank) => (
            <GlassCard key={team.origIdx} className={`flex items-center gap-3 py-3 ${rank===0?'border-yellow-400/20':''}`}>
              <span className={`text-xl font-black w-8 text-center ${rankColor(rank)}`}>{rankBadge(rank)}</span>
              <span className="text-white font-semibold flex-1 truncate">{team.name}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => updateScore(team.origIdx,-1)} className="w-8 h-8 rounded-lg bg-white/[0.07] text-white/60 hover:bg-red-500/20 hover:text-red-400 font-bold text-lg transition-all">−</button>
                <span className="text-white font-black text-2xl w-12 text-center tabular-nums">{team.score}</span>
                <button onClick={() => updateScore(team.origIdx,1)} className="w-8 h-8 rounded-lg bg-white/[0.07] text-white/60 hover:bg-emerald-500/20 hover:text-emerald-400 font-bold text-lg transition-all">+</button>
                <button onClick={() => updateScore(team.origIdx,5)} className="px-2 h-8 rounded-lg bg-white/[0.07] text-white/60 hover:bg-emerald-500/20 hover:text-emerald-400 text-xs font-bold transition-all">+5</button>
              </div>
            </GlassCard>
          ))}
        </div>
        <GlowButton onClick={resetSb} variant="secondary" className="w-full">↩ Reset All Scores</GlowButton>
      </div>
    </div>
  )

  if (mode === 'join') return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <BackBtn onBack={() => setMode('landing')} />
        <Logo /><div className="mt-8" />
        <GlassCard>
          <h2 className="text-white font-bold mb-4">Watch Scoreboard</h2>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Scoreboard Code" maxLength={4}
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 mb-4 text-center font-mono text-2xl tracking-widest uppercase outline-none focus:border-cyan-500/50" />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <GlowButton onClick={joinSb} disabled={loading} className="w-full">{loading ? <Spinner /> : 'Watch →'}</GlowButton>
        </GlassCard>
      </div>
    </div>
  )

  if (mode === 'watching') return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <Logo /><div className="mt-6" />
        <p className="text-white/40 text-xs text-center mb-4 uppercase tracking-widest">Live Scoreboard</p>
        <div className="space-y-2">
          {sorted.map((team,rank) => (
            <GlassCard key={team.origIdx} className={`flex items-center gap-3 ${rank===0?'border-yellow-400/20':''}`}>
              <span className={`text-xl font-black w-8 text-center ${rankColor(rank)}`}>{rankBadge(rank)}</span>
              <span className="text-white font-semibold flex-1">{team.name}</span>
              <span className="text-white font-black text-2xl tabular-nums">{team.score}</span>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )

  return null
}

// ─── Spin the Wheel ───────────────────────────────────────────────────────────
function SpinWheelScreen({ onBack }) {
  const [items, setItems] = useLocalStorage('cmkl_wheel_items', ['Team A','Team B','Team C','Team D'])
  const [newItem, setNewItem] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const canvasRef = useRef(null)
  const rotRef = useRef(0)
  const rafRef = useRef(null)

  const draw = useCallback((angle) => {
    const canvas = canvasRef.current
    if (!canvas || !items.length) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2
    const r = Math.min(cx, cy) - 22
    const n = items.length, arc = (2*Math.PI)/n
    ctx.clearRect(0,0,W,H)
    items.forEach((item,i) => {
      const s = angle+i*arc, e = s+arc
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,s,e); ctx.closePath()
      ctx.fillStyle = WHEEL_COLORS[i%WHEEL_COLORS.length]; ctx.fill()
      ctx.strokeStyle='#0a0f1e'; ctx.lineWidth=2; ctx.stroke()
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(s+arc/2)
      ctx.textAlign='right'; ctx.fillStyle='#fff'
      ctx.font=`bold ${Math.min(15,Math.max(9,Math.floor(260/n)))}px sans-serif`
      ctx.fillText(item.length>14?item.slice(0,14)+'…':item, r-10, 5); ctx.restore()
    })
    ctx.beginPath(); ctx.arc(cx,cy,16,0,2*Math.PI)
    ctx.fillStyle='#0a0f1e'; ctx.fill()
    ctx.strokeStyle='#475569'; ctx.lineWidth=2; ctx.stroke()
    // Pointer at top
    ctx.beginPath()
    ctx.moveTo(cx-12, cy-r-8); ctx.lineTo(cx+12, cy-r-8); ctx.lineTo(cx, cy-r+6)
    ctx.closePath(); ctx.fillStyle='#fbbf24'; ctx.fill()
  }, [items])

  useEffect(() => { draw(rotRef.current) }, [items, draw])

  const spin = () => {
    if (spinning || items.length < 2) return
    setSpinning(true); setWinner(null)
    const n = items.length, arc = (2*Math.PI)/n
    const winnerIdx = Math.floor(Math.random()*n)
    const targetTheta = -Math.PI/2 - (winnerIdx+0.5)*arc
    const current = rotRef.current
    const diff = ((targetTheta-current)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)
    const final = current + (5+Math.floor(Math.random()*4))*2*Math.PI + diff
    const duration = 4000+Math.random()*1500
    const t0 = performance.now()
    const animate = now => {
      const t = Math.min((now-t0)/duration,1)
      const ease = 1-Math.pow(1-t,4)
      const cur = current+(final-current)*ease
      rotRef.current=cur; draw(cur)
      if (t<1) { rafRef.current=requestAnimationFrame(animate) }
      else { rotRef.current=final; setWinner(items[winnerIdx]); setSpinning(false) }
    }
    rafRef.current=requestAnimationFrame(animate)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const addItem = () => {
    const v = newItem.trim()
    if (v) { setItems([...items,v]); setNewItem('') }
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-md">
        <BackBtn onBack={onBack} />
        <Logo /><div className="mt-6" />
        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} width={300} height={300} className="rounded-full shadow-2xl shadow-purple-500/20 cursor-pointer" onClick={spin} />
        </div>
        {winner && (
          <GlassCard className="mb-4 text-center border-yellow-400/30">
            <EmojiParticles emojis={['🎉','⭐','🎊','🏆']} />
            <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Winner!</p>
            <p className="text-white text-3xl font-black">{winner}</p>
          </GlassCard>
        )}
        <GlowButton onClick={spin} disabled={spinning||items.length<2} className="w-full mb-4" size="lg">
          {spinning ? '🎡 Spinning…' : '🎡 Spin!'}
        </GlowButton>
        <GlassCard>
          <p className="text-white/50 text-xs uppercase tracking-widest mb-3">Wheel Items ({items.length})</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {items.map((item,i) => (
              <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border border-white/10 bg-white/[0.05]">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:WHEEL_COLORS[i%WHEEL_COLORS.length]}} />
                <span className="text-white/80">{item}</span>
                <button onClick={() => setItems(items.filter((_,j)=>j!==i))} className="text-white/30 hover:text-red-400 text-xs ml-0.5">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add item…"
              className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-cyan-500/50 text-sm"
              onKeyDown={e => e.key==='Enter' && addItem()} />
            <GlowButton onClick={addItem} size="sm">Add</GlowButton>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Icebreaker ───────────────────────────────────────────────────────────────
function IcebreakerScreen({ onBack }) {
  const [cat, setCat] = useState('All')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [used, setUsed] = useState([])
  const [customQs, setCustomQs] = useLocalStorage('cmkl_icebreaker_custom', [])
  const [newQ, setNewQ] = useState('')

  const allCats = ['All', ...Array.from(new Set(QUESTIONS.map(q => q.cat)))]
  const pool = [...QUESTIONS, ...customQs.map(q => ({q, cat:'✏️ Custom'}))].filter(q => cat==='All'||q.cat===cat)
  const remaining = pool.filter((_,i) => !used.includes(i))
  const current = remaining.length>0 ? remaining[idx%remaining.length] : null

  const next = () => {
    if (!current) return
    const poolIdx = pool.indexOf(current)
    setUsed(u=>[...u,poolIdx]); setFlipped(false); setIdx(i=>i+1)
  }
  const reset = () => { setUsed([]); setIdx(0); setFlipped(false) }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <BackBtn onBack={onBack} />
        <Logo /><div className="mt-6" />
        <div className="flex gap-1.5 flex-wrap mb-4">
          {allCats.map(c => (
            <button key={c} onClick={() => {setCat(c);setIdx(0);setFlipped(false)}}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${cat===c?'bg-gradient-to-r from-cyan-500 to-purple-500 text-white':'bg-white/[0.07] text-white/50 hover:bg-white/[0.12]'}`}>
              {c}
            </button>
          ))}
        </div>
        {current ? (
          <GlassCard className="mb-4 min-h-44 flex flex-col items-center justify-center text-center cursor-pointer select-none" onClick={() => setFlipped(true)}>
            {flipped
              ? <p className="text-white text-xl font-semibold leading-relaxed px-2">{current.q}</p>
              : <div className="flex flex-col items-center gap-3">
                  <div className="text-5xl">🃏</div>
                  <p className="text-white/50 text-sm">Tap to reveal</p>
                  <span className="text-xs px-3 py-1 rounded-full bg-white/[0.07] text-white/40">{current.cat}</span>
                </div>}
          </GlassCard>
        ) : (
          <GlassCard className="mb-4 text-center min-h-44 flex flex-col items-center justify-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-white/60 text-sm">All questions used!</p>
            <GlowButton onClick={reset} variant="secondary" size="sm" className="mt-3">Reset</GlowButton>
          </GlassCard>
        )}
        <p className="text-white/30 text-xs text-center mb-4">{remaining.length} remaining · {used.length} shown</p>
        <div className="flex gap-3 mb-6">
          <GlowButton onClick={next} disabled={!current} className="flex-1">Next Question →</GlowButton>
          <GlowButton onClick={reset} variant="ghost" size="md" title="Reset">↩</GlowButton>
        </div>
        <GlassCard>
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Add Custom Question</p>
          <div className="flex gap-2">
            <input value={newQ} onChange={e=>setNewQ(e.target.value)} placeholder="Your question…"
              className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-cyan-500/50 text-sm"
              onKeyDown={e => { if(e.key==='Enter'&&newQ.trim()){setCustomQs([...customQs,newQ.trim()]);setNewQ('')} }} />
            <GlowButton size="sm" onClick={() => {if(newQ.trim()){setCustomQs([...customQs,newQ.trim()]);setNewQ('')}}}>Add</GlowButton>
          </div>
          {customQs.length>0 && (
            <div className="mt-3 space-y-1.5">
              {customQs.map((q,i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-white/40">
                  <span className="flex-1 leading-relaxed">• {q}</span>
                  <button onClick={() => setCustomQs(customQs.filter((_,j)=>j!==i))} className="text-white/20 hover:text-red-400 flex-shrink-0 mt-0.5">×</button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Seating Planner ─────────────────────────────────────────────────────────
function SeatingScreen({ onBack }) {
  const [names, setNames] = useState('')
  const [numTables, setNumTables] = useState(4)
  const [seatsPerTable, setSeatsPerTable] = useState(5)
  const [tables, setTables] = useState(null)
  const [error, setError] = useState('')

  const assign = () => {
    const parsed = names.split(/[\n,]+/).map(n=>n.trim()).filter(Boolean)
    if (parsed.length < 2) return setError('Enter at least 2 names.')
    const maxSeats = numTables * seatsPerTable
    if (parsed.length > maxSeats) return setError(`Only ${maxSeats} total seats (${numTables} tables x ${seatsPerTable}). Increase tables or seats.`)
    setError('')
    const shuffled = [...parsed].sort(()=>Math.random()-0.5)
    const result = Array.from({length:numTables},(_,i)=>({label:`Table ${i+1}`,members:[]}))
    shuffled.forEach((name,i) => result[i%numTables].members.push(name))
    setTables(result)
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-2xl">
        <BackBtn onBack={onBack} />
        <Logo /><div className="mt-6" />
        {!tables ? (
          <div className="max-w-md mx-auto">
            <GlassCard>
              <h2 className="text-white font-bold mb-4">Seating Planner</h2>
              <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Names (one per line or comma-separated)</p>
              <textarea value={names} onChange={e=>setNames(e.target.value)} rows={8} placeholder={"Alice\nBob\nCarlie\n(paste your list here)"}
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 mb-4 outline-none focus:border-cyan-500/50 text-sm resize-none" />
              <div className="flex gap-4 mb-5">
                <div className="flex-1">
                  <label className="text-white/50 text-xs uppercase tracking-widest block mb-2">Tables</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[2,3,4,5,6,8,10].map(n=>(
                      <button key={n} onClick={()=>setNumTables(n)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${numTables===n?'bg-gradient-to-r from-cyan-500 to-purple-500 text-white':'bg-white/[0.07] text-white/60 hover:bg-white/[0.12]'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-white/50 text-xs uppercase tracking-widest block mb-2">Seats / table</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[2,3,4,5,6,8,10].map(n=>(
                      <button key={n} onClick={()=>setSeatsPerTable(n)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${seatsPerTable===n?'bg-gradient-to-r from-cyan-500 to-purple-500 text-white':'bg-white/[0.07] text-white/60 hover:bg-white/[0.12]'}`}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <GlowButton onClick={assign} className="w-full">Assign Seats</GlowButton>
            </GlassCard>
          </div>
        ) : (
          <>
            <EmojiParticles emojis={['chair','tada','sparkles','confetti']} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
              {tables.map((table,ti) => (
                <GlassCard key={ti}>
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">{table.label}</p>
                  <div className="space-y-1.5">
                    {table.members.map((m,mi) => (
                      <div key={mi} className="flex items-center gap-2 text-sm">
                        <span className="text-white/30 text-xs w-4 text-right">{mi+1}</span>
                        <span className="text-white/90">{m}</span>
                      </div>
                    ))}
                    {Array.from({length:seatsPerTable-table.members.length}).map((_,ei) => (
                      <div key={`e${ei}`} className="h-5 rounded border border-dashed border-white/[0.06]" />
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
            <div className="flex gap-3 max-w-sm mx-auto">
              <GlowButton onClick={assign} className="flex-1">Re-randomize</GlowButton>
              <GlowButton onClick={()=>setTables(null)} variant="secondary" className="flex-1">Edit</GlowButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Lucky Draw ───────────────────────────────────────────────────────────────
function LuckyDrawScreen({ onBack }) {
  const [participants, setParticipants] = useLocalStorage('cmkl_ld_participants', [])
  const [prizes, setPrizes] = useLocalStorage('cmkl_ld_prizes', [])
  const [phase, setPhase] = useState('setup')
  const [results, setResults] = useState([])
  const [drawingName, setDrawingName] = useState('')
  const [currentPrizeIdx, setCurrentPrizeIdx] = useState(0)
  const [nameInput, setNameInput] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  const [prizeName, setPrizeName] = useState('')
  const [prizeAmount, setPrizeAmount] = useState(1)
  const [prizeEmoji, setPrizeEmoji] = useState('gift')
  const [activeTab, setActiveTab] = useState('participants')
  const intervalRef  = useRef(null)
  const cancelledRef = useRef(false)
  const poolRef      = useRef([])
  const queueRef     = useRef([])
  const prizeIdxRef  = useRef(0)
  const existingRef  = useRef([])

  const buildPrizeQueue = plist => {
    const q = []
    plist.forEach(p => { for (let i=0;i<(p.amount||1);i++) q.push(p) })
    return q
  }

  const startDraw = () => {
    const q = buildPrizeQueue(prizes)
    if (!q.length || !participants.length) return
    cancelledRef.current = false
    setResults([]); setCurrentPrizeIdx(0)
    doDraw([...participants], q, 0, [])
  }

  const doDraw = (pool, queue, idx, existing) => {
    if (cancelledRef.current) return
    if (idx>=queue.length || pool.length===0) { setPhase('result'); return }
    poolRef.current=pool; queueRef.current=queue; prizeIdxRef.current=idx; existingRef.current=existing
    setPhase('drawing'); setCurrentPrizeIdx(idx)
    let tick=0
    intervalRef.current = setInterval(()=>{
      setDrawingName(pool[Math.floor(Math.random()*pool.length)]); tick++
      if (tick>=15) {
        clearInterval(intervalRef.current)
        const wi=Math.floor(Math.random()*pool.length), winner=pool[wi]
        const newPool=pool.filter((_,i)=>i!==wi), newResults=[...existing,{winner,prize:queue[idx]}]
        setDrawingName(winner); setResults(newResults)
        setTimeout(()=>doDraw(newPool,queue,idx+1,newResults),1800)
      }
    },60)
  }

  const handleSkipAll = () => {
    cancelledRef.current=true; clearInterval(intervalRef.current)
    let pool=[...poolRef.current]
    const queue=queueRef.current, startIdx=prizeIdxRef.current
    let allResults=[...existingRef.current]
    for (let i=startIdx; i<queue.length && pool.length>0; i++) {
      const wi=Math.floor(Math.random()*pool.length)
      allResults=[...allResults,{winner:pool[wi],prize:queue[i]}]
      pool=pool.filter((_,j)=>j!==wi)
    }
    setResults(allResults); setPhase('result')
  }

  const addName = () => { const v=nameInput.trim(); if(v&&!participants.includes(v)){setParticipants([...participants,v]);setNameInput('')} }
  const addBulk = () => {
    const newNames=bulkInput.split(/[\n,]+/).map(n=>n.trim()).filter(n=>n&&!participants.includes(n))
    if(newNames.length){setParticipants([...participants,...newNames]);setBulkInput('')}
  }
  const addPrize = () => {
    if(!prizeName.trim()) return
    setPrizes([...prizes,{name:prizeName.trim(),amount:prizeAmount,emoji:prizeEmoji}]); setPrizeName(''); setPrizeAmount(1)
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-md">
        <BackBtn onBack={onBack} />
        <Logo /><div className="mt-6" />
        {phase==='setup' && (
          <>
            <div className="flex gap-1.5 mb-4">
              {['participants','prizes'].map(t=>(
                <button key={t} onClick={()=>setActiveTab(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${activeTab===t?'bg-gradient-to-r from-cyan-500 to-purple-500 text-white':'bg-white/[0.07] text-white/50 hover:bg-white/[0.12]'}`}>
                  {t} ({t==='participants'?participants.length:prizes.length})
                </button>
              ))}
            </div>
            {activeTab==='participants' && (
              <GlassCard className="mb-4">
                <div className="flex gap-2 mb-3">
                  <input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Add name"
                    className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-cyan-500/50 text-sm"
                    onKeyDown={e=>e.key==='Enter'&&addName()} />
                  <GlowButton onClick={addName} size="sm">Add</GlowButton>
                </div>
                <textarea value={bulkInput} onChange={e=>setBulkInput(e.target.value)} rows={3} placeholder="Paste names (comma or newline)"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 mb-2 outline-none focus:border-cyan-500/50 text-sm resize-none" />
                <GlowButton onClick={addBulk} variant="secondary" size="sm" className="mb-3">Import Bulk</GlowButton>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {participants.map((p,i)=>(
                    <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.07] text-white/80 text-xs">
                      {p}<button onClick={()=>setParticipants(participants.filter((_,j)=>j!==i))} className="text-white/30 hover:text-red-400 ml-0.5">x</button>
                    </span>
                  ))}
                </div>
              </GlassCard>
            )}
            {activeTab==='prizes' && (
              <GlassCard className="mb-4">
                <div className="flex gap-2 mb-1">
                  <input value={prizeEmoji} onChange={e=>setPrizeEmoji(e.target.value)} maxLength={2}
                    className="w-12 bg-white/[0.06] border border-white/10 rounded-xl px-2 py-2 text-center text-lg outline-none" />
                  <input value={prizeName} onChange={e=>setPrizeName(e.target.value)} placeholder="Prize name"
                    className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-cyan-500/50 text-sm" />
                  <input type="number" value={prizeAmount} onChange={e=>setPrizeAmount(Math.max(1,parseInt(e.target.value)||1))} min={1}
                    className="w-14 bg-white/[0.06] border border-white/10 rounded-xl px-2 py-2 text-white text-center outline-none text-sm" />
                  <GlowButton onClick={addPrize} size="sm">Add</GlowButton>
                </div>
                <p className="text-white/30 text-xs mb-3">Emoji / Name / Qty</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {prizes.map((p,i)=>(
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span>{p.emoji}</span>
                      <span className="text-white/80 flex-1">{p.name}</span>
                      <span className="text-white/40 text-xs">x{p.amount}</span>
                      <button onClick={()=>setPrizes(prizes.filter((_,j)=>j!==i))} className="text-white/20 hover:text-red-400">x</button>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
            <GlowButton onClick={startDraw} disabled={!participants.length||!prizes.length} className="w-full" size="lg">
              Start Lucky Draw!
            </GlowButton>
          </>
        )}
        {phase==='drawing' && (
          <GlassCard className="text-center py-10">
            <p className="text-white/50 text-sm mb-1 uppercase tracking-widest">Drawing for</p>
            <p className="text-white text-xl font-bold mb-6">{queueRef.current[currentPrizeIdx]?.emoji} {queueRef.current[currentPrizeIdx]?.name}</p>
            <div className="text-5xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent animate-pulse min-h-16 mb-6">
              {drawingName}
            </div>
            <GlowButton onClick={handleSkipAll} variant="secondary" size="sm">Skip All</GlowButton>
          </GlassCard>
        )}
        {phase==='result' && (
          <>
            <EmojiParticles emojis={['tada','confetti','star','trophy']} />
            <div className="space-y-3 mb-5">
              {results.map((r,i)=>(
                <GlassCard key={i} className="flex items-center gap-3">
                  <span className="text-2xl">{r.prize.emoji}</span>
                  <div className="flex-1">
                    <p className="text-white/50 text-xs">{r.prize.name}</p>
                    <p className="text-white font-bold">{r.winner}</p>
                  </div>
                  <span className="text-yellow-400 text-xl">trophy</span>
                </GlassCard>
              ))}
            </div>
            <GlowButton onClick={()=>{setPhase('setup');setResults([])}} variant="secondary" className="w-full">New Draw</GlowButton>
          </>
        )}
      </div>
    </div>
  )
}

// ─── QR Generator ─────────────────────────────────────────────────────────────
function QRGeneratorScreen({ onBack }) {
  const [url, setUrl] = useLocalStorage('cmkl_qr_url', '')
  const [label, setLabel] = useLocalStorage('cmkl_qr_label', '')
  const [size, setSize] = useLocalStorage('cmkl_qr_size', 300)
  const qrSrc = url.trim()
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url.trim())}&bgcolor=0a0f1e&color=ffffff&margin=20`
    : null
  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><AnimatedBg />
      <div className="w-full max-w-sm">
        <BackBtn onBack={onBack} />
        <Logo /><div className="mt-8" />
        <GlassCard className="mb-4">
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 mb-3 outline-none focus:border-cyan-500/50" />
          <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Label (optional)"
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 mb-3 outline-none focus:border-cyan-500/50 text-sm" />
          <div className="flex gap-2">
            {[200,300,400,600].map(s=>(
              <button key={s} onClick={()=>setSize(s)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${size===s?'bg-gradient-to-r from-cyan-500 to-purple-500 text-white':'bg-white/[0.07] text-white/50 hover:bg-white/[0.12]'}`}>
                {s}px
              </button>
            ))}
          </div>
        </GlassCard>
        {qrSrc && (
          <GlassCard className="flex flex-col items-center">
            {label && <p className="text-white font-semibold mb-3">{label}</p>}
            <img src={qrSrc} alt="QR Code" className="rounded-xl" style={{width:Math.min(size,280),height:Math.min(size,280)}} />
            <p className="text-white/30 text-xs mt-3 text-center break-all">{url}</p>
          </GlassCard>
        )}
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('welcome')
  const back = () => setScreen('welcome')
  return (
    <div className="text-white">
      {screen==='welcome'      && <WelcomeScreen onSelect={setScreen} />}
      {screen==='host'         && <HostScreen onBack={back} />}
      {screen==='participant'  && <ParticipantJoinScreen onBack={back} />}
      {screen==='timer'        && <TimerScreen onBack={back} />}
      {screen==='poll'         && <PollScreen onBack={back} />}
      {screen==='scoreboard'   && <ScoreboardScreen onBack={back} />}
      {screen==='spin-wheel'   && <SpinWheelScreen onBack={back} />}
      {screen==='icebreaker'   && <IcebreakerScreen onBack={back} />}
      {screen==='seating'      && <SeatingScreen onBack={back} />}
      {screen==='lucky-draw'   && <LuckyDrawScreen onBack={back} />}
      {screen==='qr-generator' && <QRGeneratorScreen onBack={back} />}
    </div>
  )
}

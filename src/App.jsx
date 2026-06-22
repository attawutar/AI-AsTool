import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin)

let _socket = null
function getSocket() {
  if (!_socket || _socket.disconnected) _socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
  return _socket
}
function resetSocket() { if (_socket) { _socket.disconnect(); _socket = null } }

function getJoinCodeFromURL() { return new URLSearchParams(window.location.search).get('join') || '' }
function clearJoinCodeFromURL() {
  const url = new URL(window.location.href)
  url.searchParams.delete('join')
  window.history.replaceState({}, '', url.toString())
}

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) : defaultValue } catch { return defaultValue }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }, [key, value])
  return [value, setValue]
}

const GROUP_COLORS = [
  { bg:'from-cyan-500/20 to-blue-600/20',    border:'border-cyan-500/40',   label:'text-cyan-300',   badge:'from-cyan-500 to-blue-600',   glow:'shadow-cyan-500/50'   },
  { bg:'from-purple-500/20 to-indigo-600/20',border:'border-purple-500/40', label:'text-purple-300', badge:'from-purple-500 to-indigo-600',glow:'shadow-purple-500/50' },
  { bg:'from-emerald-500/20 to-teal-600/20', border:'border-emerald-500/40',label:'text-emerald-300',badge:'from-emerald-500 to-teal-600', glow:'shadow-emerald-500/50'},
  { bg:'from-orange-500/20 to-red-600/20',   border:'border-orange-500/40', label:'text-orange-300', badge:'from-orange-500 to-red-600',  glow:'shadow-orange-500/50' },
  { bg:'from-pink-500/20 to-rose-600/20',    border:'border-pink-500/40',   label:'text-pink-300',   badge:'from-pink-500 to-rose-600',  glow:'shadow-pink-500/50'   },
  { bg:'from-yellow-500/20 to-amber-600/20', border:'border-yellow-500/40', label:'text-yellow-300', badge:'from-yellow-500 to-amber-600',glow:'shadow-yellow-500/50' },
]
const AVATAR_COLORS = [
  'from-cyan-500 to-blue-600','from-purple-500 to-indigo-600','from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600','from-pink-500 to-rose-600','from-yellow-400 to-orange-500',
]
const DEFAULT_EMOJIS = ['🏆','🥇','🎁','💎','🎀','🌟','🎊','🏅','💰','🎯']
const EMOJI_PICKER   = ['🏆','🥇','🥈','🥉','🎁','💎','🎀','🌟','🎊','🏅','💰','🎯','🎮','🎵','🍕','☕','🌈','❤️','🔥','⚡','🎂','🛍️','✈️','📱','💻','🎓','🐉','🦄','🍀','🎪']
const DRAW_EMOJIS    = ['🎰','🎲','⭐','✨','🎊','🎉','🌟','💫','🔥','⚡','🎯','🏆','🥇','🎁','💎','🎀','🌈','💰','🍀','🦄']

function EmojiParticles() {
  const [particles, setParticles] = useState([])
  const idRef = useRef(0)
  useEffect(() => {
    const spawn = () => {
      const id = idRef.current++
      const duration = 900 + Math.floor(Math.random() * 500)
      setParticles(prev => [...prev.slice(-30), { id, duration, emoji: DRAW_EMOJIS[Math.floor(Math.random() * DRAW_EMOJIS.length)], x: Math.random() * 100, y: Math.random() * 100, size: 22 + Math.floor(Math.random() * 30), rotate: Math.floor(Math.random() * 60) - 30 }])
      setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), duration + 50)
    }
    const timer = setInterval(spawn, 120)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <style>{`@keyframes emoji-pop{0%{transform:scale(0) rotate(var(--r));opacity:0}35%{transform:scale(1.25) rotate(calc(var(--r)*-0.5));opacity:1}65%{transform:scale(1) rotate(0deg);opacity:.75}100%{transform:scale(.4) rotate(var(--r));opacity:0}}`}</style>
      {particles.map(p => <span key={p.id} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, fontSize:`${p.size}px`, lineHeight:1, '--r':`${p.rotate}deg`, animation:`emoji-pop ${p.duration}ms ease-out forwards`, userSelect:'none' }}>{p.emoji}</span>)}
    </div>
  )
}

function AnimatedBg() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse"/>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl animate-pulse" style={{animationDelay:'1.5s'}}/>
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay:'3s'}}/>
      <div className="absolute inset-0 opacity-20" style={{backgroundImage:'linear-gradient(rgba(6,182,212,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.04) 1px,transparent 1px)',backgroundSize:'60px 60px'}}/>
    </div>
  )
}
function GlassCard({ children, className='' }) {
  return <div className={`backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl ${className}`}>{children}</div>
}
function GlowButton({ children, onClick, disabled, variant='cyan', size='md', className='' }) {
  const v = { cyan:'from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30', purple:'from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 shadow-purple-500/30', gold:'from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 shadow-yellow-500/30', emerald:'from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/30' }
  const s = { sm:'px-4 py-2 text-sm', md:'px-6 py-3', lg:'px-8 py-4 text-lg' }
  return <button onClick={onClick} disabled={disabled} className={`relative font-semibold text-white rounded-xl ${s[size]} bg-gradient-to-r ${v[variant]} shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none ${className}`}>{children}</button>
}
function Logo({ size='md' }) {
  const s = { sm:'text-2xl', md:'text-4xl', lg:'text-5xl' }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`font-black tracking-tight ${s[size]}`}><span className="text-white">CMKL </span><span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Event Helper</span></div>
      <div className="h-0.5 w-16 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"/>
    </div>
  )
}
function Spinner({ size='md' }) {
  const s = { sm:'w-8 h-8', md:'w-16 h-16', lg:'w-24 h-24' }
  return (
    <div className={`relative ${s[size]}`}>
      <div className="absolute inset-0 rounded-full border-2 border-white/10"/>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin"/>
      <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-400 animate-spin" style={{animationDirection:'reverse',animationDuration:'0.75s'}}/>
    </div>
  )
}

function WelcomeScreen({ onHost, onParticipant, onLuckyDraw, onQR }) {
  const cards = [
    { icon:'🎯', label:'Group Randomizer — Host',        sub:'Create a room & manage groups',          color:'cyan',    onClick:onHost        },
    { icon:'👥', label:'Group Randomizer — Participant', sub:'Join a room by entering the room code',  color:'purple',  onClick:onParticipant },
    { icon:'🎰', label:'Lucky Draw',                     sub:'Add participants & prizes, then draw!',  color:'gold',    onClick:onLuckyDraw   },
    { icon:'🔗', label:'QR Code Generator',              sub:'Turn any link into a scannable QR code', color:'emerald', onClick:onQR          },
  ]
  const palette = { cyan:'from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/20 hover:to-blue-600/20 border-cyan-500/20 hover:border-cyan-400/40', purple:'from-purple-500/10 to-indigo-600/10 hover:from-purple-500/20 hover:to-indigo-600/20 border-purple-500/20 hover:border-purple-400/40', gold:'from-yellow-500/10 to-orange-600/10 hover:from-yellow-500/20 hover:to-orange-600/20 border-yellow-500/20 hover:border-yellow-400/40', emerald:'from-emerald-500/10 to-teal-600/10 hover:from-emerald-500/20 hover:to-teal-600/20 border-emerald-500/20 hover:border-emerald-400/40' }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"><AnimatedBg/>
      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-md">
        <div className="text-center space-y-4"><div className="text-7xl animate-bounce" style={{animationDuration:'2s'}}>🎓</div><Logo size="lg"/><p className="text-slate-400 text-base leading-relaxed">Real-time event tools<br/>for workshops, classes &amp; activities</p></div>
        <div className="w-full space-y-3">{cards.map(c=><GlassCard key={c.label} className="p-1"><button onClick={c.onClick} className={`w-full p-5 rounded-xl bg-gradient-to-r border transition-all duration-200 group ${palette[c.color]}`}><div className="flex items-center gap-4"><div className="text-3xl">{c.icon}</div><div className="text-left flex-1"><div className="text-white font-bold text-lg">{c.label}</div><div className="text-slate-500 text-sm">{c.sub}</div></div><div className="text-xl text-slate-500">→</div></div></button></GlassCard>)}</div>
        <p className="text-slate-700 text-xs">Powered by Socket.io · Real-time across all devices</p>
      </div>
    </div>
  )
}

function HostScreen({ onBack }) {
  const [phase,setPhase]=useState('creating'),[roomCode,setRoomCode]=useState(''),[participants,setParticipants]=useState([]),[numGroups,setNumGroups]=useState(2),[groups,setGroups]=useState(null),[randomizing,setRandomizing]=useState(false)
  const socketRef=useRef(null)
  useEffect(()=>{
    const s=getSocket();socketRef.current=s
    s.emit('create-room',res=>{ if(res.success){setRoomCode(res.roomCode);setPhase('dashboard')} })
    const onRU=({participants,groups})=>{setParticipants(participants);setGroups(groups)}
    const onGR=({groups})=>setGroups(groups)
    s.on('room-update',onRU);s.on('groups-randomized',onGR)
    return()=>{s.off('room-update',onRU);s.off('groups-randomized',onGR)}
  },[])
  const handleRandomize=()=>{ const s=socketRef.current;if(!s)return;setRandomizing(true);s.emit('set-num-groups',{numGroups});s.emit('randomize-groups',res=>{setRandomizing(false);if(!res?.success)alert(res?.error||'Failed')}) }
  const handleReset=()=>{setGroups(null);socketRef.current?.emit('reset-groups')}
  if(phase==='creating') return <div className="min-h-screen flex items-center justify-center"><AnimatedBg/><div className="relative z-10 text-center space-y-4"><Spinner size="lg"/><p className="text-slate-400 animate-pulse">Creating your room…</p></div></div>
  return (
    <div className="min-h-screen p-4 md:p-6"><AnimatedBg/>
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6"><button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm">← Exit room</button><Logo size="sm"/><div className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>Live</div></div>
        <div className="grid md:grid-cols-5 gap-5">
          <div className="md:col-span-2 space-y-4">
            <GlassCard className="p-6 text-center"><p className="text-slate-500 text-xs uppercase tracking-widest mb-3">Room Code</p><div className="text-6xl font-black tracking-[0.3em] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent py-4">{roomCode}</div><p className="text-slate-500 text-xs mt-1">Share this code with participants</p></GlassCard>
            <GlassCard className="p-6"><p className="text-slate-500 text-xs uppercase tracking-widest mb-4">Group Settings</p><div className="mb-5"><p className="text-slate-300 text-sm mb-2.5">Number of groups</p><div className="flex gap-2 flex-wrap">{[2,3,4,5,6].map(n=><button key={n} onClick={()=>setNumGroups(n)} className={`w-11 h-11 rounded-xl font-bold text-sm transition-all ${numGroups===n?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30':'bg-white/5 border border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-white'}`}>{n}</button>)}</div></div>{!groups?(<><GlowButton onClick={handleRandomize} disabled={participants.length<2||randomizing} variant="cyan" size="lg" className="w-full">{randomizing?<span className="flex items-center justify-center gap-2"><Spinner size="sm"/>Randomizing…</span>:'🎲 Randomize Groups'}</GlowButton>{participants.length<2&&<p className="text-slate-600 text-xs text-center mt-2">Need at least 2 participants</p>}</>):<GlowButton onClick={handleReset} variant="purple" size="lg" className="w-full">🔄 Re-randomize</GlowButton>}</GlassCard>
          </div>
          <div className="md:col-span-3 space-y-4">
            {!groups&&<GlassCard className="p-6"><div className="flex items-center justify-between mb-4"><p className="text-slate-500 text-xs uppercase tracking-widest">Participants</p><span className="bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 text-xs px-2.5 py-1 rounded-full">{participants.length} joined</span></div>{participants.length===0?<div className="text-center py-10 space-y-3"><div className="text-5xl opacity-30">👥</div><p className="text-slate-500 text-sm">Waiting for participants…</p><div className="flex justify-center gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{animationDelay:`${i*0.2}s`}}/>)}</div></div>:<div className="space-y-2 max-h-80 overflow-y-auto pr-1">{participants.map((p,i)=><div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"><div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i%AVATAR_COLORS.length]} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>{p.name[0]?.toUpperCase()}</div><span className="text-white text-sm font-medium">{p.name}</span><span className="ml-auto text-slate-700 text-xs font-mono">#{i+1}</span></div>)}</div>}</GlassCard>}
            {groups&&<GlassCard className="p-6"><div className="flex items-center justify-between mb-4"><p className="text-slate-500 text-xs uppercase tracking-widest">Groups</p><span className="text-xs text-emerald-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"/>Sent to participants</span></div><div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">{groups.map((group,gi)=>{const c=GROUP_COLORS[gi%GROUP_COLORS.length];return(<div key={gi} className={`p-4 rounded-xl bg-gradient-to-r ${c.bg} border ${c.border}`}><div className={`font-bold text-sm mb-2.5 flex items-center gap-2 ${c.label}`}><span className={`w-2 h-2 rounded-full bg-gradient-to-r ${c.badge}`}/>{group.name}<span className="text-slate-500 font-normal ml-auto">{group.members.length} members</span></div><div className="flex flex-wrap gap-1.5">{group.members.map(m=><span key={m.id} className="text-xs bg-white/10 border border-white/10 px-2.5 py-1 rounded-full text-white">{m.name}</span>)}</div></div>)})}</div></GlassCard>}
          </div>
        </div>
      </div>
    </div>
  )
}

function ParticipantJoinScreen({ onBack, onJoined, initialCode='' }) {
  const [roomCode,setRoomCode]=useState(initialCode),[name,setName]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false)
  const handleJoin=()=>{
    if(!roomCode.trim())return setError('Please enter a room code.')
    if(!name.trim())return setError('Please enter your name.')
    setError('');setLoading(true)
    const s=getSocket()
    s.emit('join-room',{roomCode:roomCode.toUpperCase().trim(),name:name.trim()},res=>{
      setLoading(false)
      if(res.success)onJoined({name:name.trim(),roomCode:roomCode.toUpperCase().trim(),socketId:s.id,initialGroups:res.groups??null,myGroupIndex:res.myGroupIndex??-1})
      else setError(res.error||'Could not join room.')
    })
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"><AnimatedBg/>
      <div className="relative z-10 w-full max-w-sm">
        <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1.5 mb-6">← Back</button>
        <GlassCard className="p-8">
          <div className="text-center mb-8"><div className="text-4xl mb-3">🚀</div><Logo size="md"/><p className="text-slate-500 text-sm mt-2">Join a room</p></div>
          <div className="space-y-4">
            <div><label className="text-slate-400 text-sm mb-1.5 block">Room Code</label><input type="text" value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4))} placeholder="AB3X" maxLength={4} className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-white placeholder-slate-700 text-center text-3xl font-black tracking-[0.5em] uppercase transition-all" onKeyDown={e=>e.key==='Enter'&&handleJoin()}/></div>
            <div><label className="text-slate-400 text-sm mb-1.5 block">Your Name</label><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Alice" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 text-white placeholder-slate-700 transition-all" onKeyDown={e=>e.key==='Enter'&&handleJoin()}/></div>
            {error&&<div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">⚠️ {error}</div>}
            <GlowButton onClick={handleJoin} disabled={loading} variant="purple" size="lg" className="w-full">{loading?<span className="flex items-center justify-center gap-2"><Spinner size="sm"/>Joining…</span>:'🚀 Join Room'}</GlowButton>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

function ParticipantWaitingScreen({ name, roomCode, socketId, onGroupsAssigned }) {
  const [dots,setDots]=useState(0)
  useEffect(()=>{
    const s=getSocket()
    const onGR=({groups})=>{ const idx=groups.findIndex(g=>g.members.some(m=>m.id===socketId||m.name===name));onGroupsAssigned({groups,myGroupIndex:idx>=0?idx:0}) }
    s.on('groups-randomized',onGR);s.on('host-left',()=>alert('The host has ended the session.'))
    const timer=setInterval(()=>setDots(d=>(d+1)%4),600)
    return()=>{s.off('groups-randomized',onGR);clearInterval(timer)}
  },[name,socketId,onGroupsAssigned])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"><AnimatedBg/>
      <div className="relative z-10 w-full max-w-sm text-center">
        <GlassCard className="p-10">
          <div className="relative mx-auto w-28 h-28 mb-8">
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" style={{animationDuration:'2s'}}/>
            <div className="absolute inset-2 rounded-full border border-purple-500/20 animate-ping" style={{animationDuration:'2.5s',animationDelay:'0.5s'}}/>
            <div className="absolute inset-0 animate-spin" style={{animationDuration:'4s'}}><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 w-3 h-3 bg-cyan-400 rounded-full"/></div>
            <div className="absolute inset-0 animate-spin" style={{animationDuration:'3s',animationDirection:'reverse'}}><div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 w-2 h-2 bg-purple-400 rounded-full"/></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center"><span className="text-4xl">🎓</span></div>
          </div>
          <Logo size="md"/>
          <div className="mt-6 space-y-2"><p className="text-white text-xl font-semibold">Hey <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{name}</span>!</p><p className="text-slate-400 text-sm">Waiting for the host to randomize groups{'.'.repeat(dots+1)}</p></div>
          <div className="mt-8 flex justify-center gap-2">{[0,1,2,3,4].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 animate-bounce" style={{animationDelay:`${i*0.12}s`}}/>)}</div>
          <div className="mt-6"><span className="text-slate-700 text-xs">Room: </span><span className="text-slate-500 font-mono text-xs tracking-widest">{roomCode}</span></div>
        </GlassCard>
      </div>
    </div>
  )
}

function ParticipantResultScreen({ name, groups, myGroupIndex, onBack }) {
  const myGroup=groups?.[myGroupIndex],c=GROUP_COLORS[myGroupIndex%GROUP_COLORS.length]
  const [revealed,setRevealed]=useState(false)
  useEffect(()=>{const t=setTimeout(()=>setRevealed(true),300);return()=>clearTimeout(t)},[])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden"><AnimatedBg/>
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">{Array.from({length:16},(_,i)=><div key={i} className="absolute w-2 h-2 rounded-full animate-bounce" style={{left:`${(i/16)*100}%`,top:`-${Math.random()*10+5}%`,backgroundColor:['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ec4899','#6366f1'][i%6],animationDelay:`${i*0.08}s`,animationDuration:`${0.7+(i%3)*0.2}s`}}/>)}</div>
      <div className="relative z-20 w-full max-w-sm text-center">
        <GlassCard className={`p-8 transition-all duration-700 ${revealed?'opacity-100 translate-y-0':'opacity-0 translate-y-8'}`}>
          <div className="text-5xl mb-2 animate-bounce" style={{animationDuration:'1s'}}>🎉</div><Logo size="md"/>
          <div className="mt-5 space-y-1"><p className="text-slate-400 text-sm">Results are in, <span className="text-white font-semibold">{name}</span>!</p><p className="text-slate-300">You've been placed in</p></div>
          <div className={`my-7 inline-flex items-center justify-center w-full py-6 px-8 rounded-2xl bg-gradient-to-r ${c.badge} shadow-2xl ${c.glow}`}><span className="text-white text-4xl font-black">{myGroup?.name||`Group ${myGroupIndex+1}`}</span></div>
          {myGroup?.members?.length>0&&<div className={`p-4 rounded-xl bg-gradient-to-r ${c.bg} border ${c.border} mb-6`}><p className={`text-xs ${c.label} font-medium mb-3 uppercase tracking-widest`}>Your teammates</p><div className="flex flex-wrap justify-center gap-2">{myGroup.members.map(m=><span key={m.id} className={`px-3 py-1.5 rounded-full text-sm font-medium ${m.name===name?'bg-white text-slate-900 ring-2 ring-white/50':'bg-white/10 border border-white/10 text-white'}`}>{m.name===name?'⭐ ':''}{m.name}</span>)}</div></div>}
          <button onClick={onBack} className="text-slate-600 hover:text-slate-300 text-sm transition-colors">← Back to home</button>
        </GlassCard>
      </div>
    </div>
  )
}

function parseBulkNames(text) {
  return [...new Set(text.split(/[\n,;]+/).map(s=>s.trim()).filter(s=>s.length>0))]
}
const DEFAULT_PRIZES = [{ name:'', amount:1, emoji:'🏆' }]

function LuckyDrawScreen({ onBack }) {
  const [phase,setPhase]=useState('setup')
  const [participants,setParticipants]=useLocalStorage('cmkl_ld_participants',[])
  const [prizes,setPrizes]=useLocalStorage('cmkl_ld_prizes',DEFAULT_PRIZES)
  const [inputMode,setInputMode]=useState('one'),[nameInput,setNameInput]=useState(''),[bulkInput,setBulkInput]=useState(''),[bulkPreview,setBulkPreview]=useState([]),[emojiPickerIdx,setEmojiPickerIdx]=useState(null),[drawingName,setDrawingName]=useState(''),[currentPrizeIdx,setCurrentPrizeIdx]=useState(0),[results,setResults]=useState([])
  const intervalRef=useRef(null),cancelledRef=useRef(false),poolRef=useRef([]),queueRef=useRef([]),prizeIdxRef=useRef(0),existingRef=useRef([])

  useEffect(()=>{setBulkPreview(parseBulkNames(bulkInput))},[bulkInput])
  useEffect(()=>{
    if(emojiPickerIdx===null)return
    const h=()=>setEmojiPickerIdx(null)
    setTimeout(()=>document.addEventListener('click',h),0)
    return()=>document.removeEventListener('click',h)
  },[emojiPickerIdx])

  const buildPrizeQueue=list=>{const q=[];list.forEach((p,i)=>{if(p.name.trim())for(let j=0;j<Math.max(1,Number(p.amount)||1);j++)q.push({name:p.name.trim(),emoji:p.emoji||DEFAULT_EMOJIS[i%DEFAULT_EMOJIS.length],index:i})});return q}
  const totalPrizes=buildPrizeQueue(prizes).length
  const addOne=()=>{const t=nameInput.trim();if(!t)return;setParticipants(p=>p.includes(t)?p:[...p,t]);setNameInput('')}
  const addBulk=()=>{if(!bulkPreview.length)return;setParticipants(prev=>{const ex=new Set(prev);return[...prev,...bulkPreview.filter(n=>!ex.has(n))]});setBulkInput('')}
  const removeParticipant=name=>setParticipants(p=>p.filter(x=>x!==name))
  const clearAll=()=>setParticipants([])
  const updatePrize=(i,field,value)=>setPrizes(p=>p.map((x,idx)=>idx===i?{...x,[field]:value}:x))
  const addPrize=()=>setPrizes(p=>[...p,{name:'',amount:1,emoji:DEFAULT_EMOJIS[p.length%DEFAULT_EMOJIS.length]}])
  const removePrize=i=>setPrizes(p=>p.filter((_,idx)=>idx!==i))

  const startDraw=()=>{const q=buildPrizeQueue(prizes);if(!q.length||!participants.length)return;cancelledRef.current=false;setResults([]);setCurrentPrizeIdx(0);doDraw([...participants],q,0,[])}

  const doDraw=(pool,queue,idx,existing)=>{
    if(cancelledRef.current)return
    if(idx>=queue.length||pool.length===0){setPhase('result');return}
    poolRef.current=pool;queueRef.current=queue;prizeIdxRef.current=idx;existingRef.current=existing
    setPhase('drawing');setCurrentPrizeIdx(idx);let tick=0
    intervalRef.current=setInterval(()=>{
      setDrawingName(pool[Math.floor(Math.random()*pool.length)]);tick++
      if(tick>=10){
        clearInterval(intervalRef.current)
        const wi=Math.floor(Math.random()*pool.length),winner=pool[wi]
        const newPool=pool.filter((_,i)=>i!==wi),newResults=[...existing,{winner,prize:queue[idx]}]
        setDrawingName(winner);setResults(newResults)
        setTimeout(()=>doDraw(newPool,queue,idx+1,newResults),1500)
      }
    },50)
  }

  const handleSkipAll=()=>{
    cancelledRef.current=true;clearInterval(intervalRef.current)
    let pool=[...poolRef.current];const queue=queueRef.current,startIdx=prizeIdxRef.current;let allResults=[...existingRef.current]
    for(let i=startIdx;i<queue.length&&pool.length>0;i++){const wi=Math.floor(Math.random()*pool.length);allResults=[...allResults,{winner:pool[wi],prize:queue[i]}];pool=pool.filter((_,j)=>j!==wi)}
    setResults(allResults);setPhase('result')
  }

  useEffect(()=>()=>clearInterval(intervalRef.current),[])
  const currentPrize=buildPrizeQueue(prizes)[currentPrizeIdx]

  if(phase==='setup') return (
    <div className="min-h-screen p-4 md:p-6"><AnimatedBg/>
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6"><button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm">← Back</button><Logo size="sm"/><div className="text-2xl">🎰</div></div>
        <div className="text-center mb-8"><h1 className="text-3xl font-black text-white mb-1">Lucky Draw</h1><p className="text-slate-500 text-sm">Your participants and prizes are saved automatically 💾</p></div>
        <div className="grid md:grid-cols-2 gap-5">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4"><p className="text-slate-400 text-xs uppercase tracking-widest">Participants</p><div className="flex items-center gap-2">{participants.length>0&&<button onClick={clearAll} className="text-slate-600 hover:text-red-400 text-xs transition-colors">Clear all</button>}<span className="text-cyan-400 text-xs bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">{participants.length} added</span></div></div>
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">{['one','bulk'].map(m=><button key={m} onClick={()=>setInputMode(m)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${inputMode===m?'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30':'text-slate-500 hover:text-slate-300'}`}>{m==='one'?'✏️ One by one':'📋 Bulk paste'}</button>)}</div>
            {inputMode==='one'&&<div className="flex gap-2 mb-4"><input type="text" value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addOne()} placeholder="Enter name and press Enter…" className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500/40 focus:outline-none text-white placeholder-slate-700 text-sm transition-all"/><button onClick={addOne} className="px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all text-sm font-semibold">+ Add</button></div>}
            {inputMode==='bulk'&&<div className="mb-4 space-y-2"><textarea value={bulkInput} onChange={e=>setBulkInput(e.target.value)} placeholder={'Paste names separated by:\n• New lines\n• Commas  (Alice, Bob, Carol)\n• Semicolons  (Alice; Bob; Carol)'} rows={5} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500/40 focus:outline-none text-white placeholder-slate-600 text-sm resize-none transition-all leading-relaxed"/>{bulkPreview.length>0&&<div className="px-3 py-2 rounded-xl bg-cyan-500/5 border border-cyan-500/15"><p className="text-cyan-400 text-xs mb-1.5">{bulkPreview.length} name{bulkPreview.length!==1?'s':''} detected:</p><p className="text-slate-400 text-xs leading-relaxed">{bulkPreview.slice(0,10).join(', ')}{bulkPreview.length>10?` +${bulkPreview.length-10} more`:''}</p></div>}<button onClick={addBulk} disabled={!bulkPreview.length} className="w-full py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold">+ Add {bulkPreview.length>0?`${bulkPreview.length} participants`:'participants'}</button></div>}
            {participants.length===0?<div className="text-center py-8 text-slate-700 text-sm">No participants yet</div>:<div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">{participants.map((name,i)=><div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] group"><div className={`w-6 h-6 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i%AVATAR_COLORS.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>{name[0]?.toUpperCase()}</div><span className="text-white text-sm flex-1 truncate">{name}</span><span className="text-slate-700 text-xs font-mono flex-shrink-0">#{i+1}</span><button onClick={()=>removeParticipant(name)} className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs flex-shrink-0">✕</button></div>)}</div>}
          </GlassCard>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4"><p className="text-slate-400 text-xs uppercase tracking-widest">Prizes</p><span className="text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full">{totalPrizes} total</span></div>
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 mb-4">{prizes.map((prize,i)=><div key={i} className="flex items-center gap-2"><div className="relative flex-shrink-0"><button onClick={e=>{e.stopPropagation();setEmojiPickerIdx(emojiPickerIdx===i?null:i)}} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:border-yellow-500/40 transition-all text-xl flex items-center justify-center">{prize.emoji}</button>{emojiPickerIdx===i&&<div onClick={e=>e.stopPropagation()} className="absolute left-0 top-11 z-50 p-2 rounded-xl bg-slate-900 border border-white/10 shadow-2xl grid grid-cols-6 gap-1 w-48">{EMOJI_PICKER.map(em=><button key={em} onClick={()=>{updatePrize(i,'emoji',em);setEmojiPickerIdx(null)}} className="w-7 h-7 rounded-lg hover:bg-white/10 text-base flex items-center justify-center transition-all">{em}</button>)}</div>}</div><input type="text" value={prize.name} onChange={e=>updatePrize(i,'name',e.target.value)} placeholder="Prize name…" className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/40 focus:outline-none text-white placeholder-slate-700 text-sm transition-all min-w-0"/><div className="flex items-center gap-1 flex-shrink-0"><span className="text-slate-600 text-xs">×</span><input type="number" value={prize.amount} min={1} max={99} onChange={e=>updatePrize(i,'amount',Math.max(1,parseInt(e.target.value)||1))} className="w-14 px-2 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/40 focus:outline-none text-white text-sm text-center transition-all"/></div>{prizes.length>1&&<button onClick={()=>removePrize(i)} className="text-slate-700 hover:text-red-400 transition-colors text-xs flex-shrink-0">✕</button>}</div>)}</div>
            <button onClick={addPrize} className="w-full py-2 rounded-xl border border-dashed border-white/10 text-slate-600 hover:border-yellow-500/30 hover:text-yellow-400 transition-all text-sm">+ Add prize</button>
          </GlassCard>
        </div>
        <div className="mt-6 text-center"><GlowButton onClick={startDraw} disabled={participants.length===0||!prizes.some(p=>p.name.trim())} variant="gold" size="lg" className="px-16">🎰 Start Lucky Draw</GlowButton>{participants.length===0&&<p className="text-slate-600 text-xs mt-2">Add at least 1 participant</p>}</div>
      </div>
    </div>
  )

  if(phase==='drawing') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden"><AnimatedBg/><EmojiParticles/>
      <div className="relative z-10 w-full max-w-sm text-center space-y-6">
        {currentPrize&&<div className="space-y-1"><p className="text-slate-500 text-xs uppercase tracking-widest">Drawing for</p><div className="flex items-center justify-center gap-3"><span className="text-4xl">{currentPrize.emoji}</span><span className="text-white text-2xl font-bold">{currentPrize.name}</span></div><p className="text-slate-600 text-xs">Prize {currentPrizeIdx+1} of {buildPrizeQueue(prizes).length}</p></div>}
        <GlassCard className="p-8 border-yellow-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 animate-pulse"/>
          <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-slate-950/80 to-transparent z-10"/>
          <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-slate-950/80 to-transparent z-10"/>
          <div className="relative z-20"><div className="text-6xl font-black tracking-tight py-4 min-h-[5rem] flex items-center justify-center"><span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent" style={{filter:'drop-shadow(0 0 20px rgba(251,191,36,0.5))'}}>{drawingName||'…'}</span></div></div>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent z-30"/>
        </GlassCard>
        <button onClick={handleSkipAll} className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-yellow-500/40 hover:text-yellow-300 text-slate-400 text-sm font-medium transition-all flex items-center justify-center gap-2"><span>⏭</span> Skip all &amp; show results</button>
        {results.length>0&&<div className="space-y-2 text-left"><p className="text-slate-600 text-xs uppercase tracking-widest text-center">Winners so far</p>{results.map((r,i)=><div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]"><div className="flex items-center gap-2"><span className={`w-5 h-5 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i%AVATAR_COLORS.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>{r.winner[0]?.toUpperCase()}</span><span className="text-white text-sm">{r.winner}</span></div><span className="text-yellow-400 text-sm font-medium flex items-center gap-1.5 flex-shrink-0"><span>{r.prize.emoji}</span>{r.prize.name}</span></div>)}</div>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-4 md:p-6 overflow-hidden"><AnimatedBg/>
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">{Array.from({length:30},(_,i)=><div key={i} className="absolute w-2 h-2 rounded-sm animate-bounce" style={{left:`${(i/30)*100}%`,top:`${-5-(i%5)*3}%`,backgroundColor:['#fbbf24','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#10b981'][i%6],animationDelay:`${(i*0.07)%1}s`,animationDuration:`${0.6+(i%4)*0.15}s`,transform:`rotate(${i*15}deg)`}}/>)}</div>
      <div className="relative z-20 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6"><button onClick={()=>{setPhase('setup');setResults([])}} className="text-slate-500 hover:text-white transition-colors text-sm">← Draw again</button><Logo size="sm"/><button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm">Home</button></div>
        <div className="text-center mb-8 space-y-2"><div className="text-5xl animate-bounce" style={{animationDuration:'1.5s'}}>🎉</div><h2 className="text-3xl font-black text-white">Draw Complete!</h2><p className="text-slate-500 text-sm">{results.length} winner{results.length!==1?'s':''} selected</p></div>
        <div className="space-y-3">{results.map((r,i)=><GlassCard key={i} className="p-5 border-yellow-500/10"><div className="flex items-center gap-4"><div className="text-4xl">{r.prize.emoji}</div><div className="flex-1"><div className="text-yellow-300 font-bold text-lg">{r.prize.name}</div><div className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5"><span className={`w-6 h-6 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i%AVATAR_COLORS.length]} flex items-center justify-center text-xs font-bold text-white`}>{r.winner[0]?.toUpperCase()}</span>{r.winner}</div></div><div className="text-slate-700 font-mono text-sm">#{i+1}</div></div></GlassCard>)}</div>
        <div className="mt-8 flex justify-center gap-3"><GlowButton onClick={()=>{setPhase('setup');setResults([])}} variant="gold">🎰 Draw Again</GlowButton><GlowButton onClick={onBack} variant="purple">🏠 Home</GlowButton></div>
      </div>
    </div>
  )
}

function QRGeneratorScreen({ onBack }) {
  const [url,setUrl]=useLocalStorage('cmkl_qr_url',''),[label,setLabel]=useLocalStorage('cmkl_qr_label',''),[size,setSize]=useLocalStorage('cmkl_qr_size',300)
  const [qrUrl,setQrUrl]=useState(''),[copied,setCopied]=useState(false),[fullscreen,setFullscreen]=useState(false)
  const debounceRef=useRef(null)
  useEffect(()=>{
    clearTimeout(debounceRef.current)
    if(!url.trim()){setQrUrl('');return}
    debounceRef.current=setTimeout(()=>setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url.trim())}&margin=10`),600)
    return()=>clearTimeout(debounceRef.current)
  },[url,size])
  const copyLink=()=>navigator.clipboard.writeText(url.trim()).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})
  const downloadQR=()=>{const a=document.createElement('a');a.href=qrUrl;a.download=`qrcode-${label||'link'}.png`;a.target='_blank';a.click()}
  const hasUrl=url.trim().length>0
  return (
    <>
      {fullscreen&&qrUrl&&<div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8 cursor-pointer" onClick={()=>setFullscreen(false)}><img src={qrUrl} alt="QR Code" className="w-72 h-72 md:w-96 md:h-96" style={{imageRendering:'pixelated'}}/>{label&&<p className="mt-6 text-slate-900 text-2xl font-bold text-center">{label}</p>}{url&&<p className="mt-2 text-slate-500 text-sm text-center max-w-sm break-all">{url}</p>}<p className="mt-8 text-slate-400 text-xs">Tap anywhere to close</p></div>}
      <div className="min-h-screen p-4 md:p-6"><AnimatedBg/>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6"><button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm">← Back</button><Logo size="sm"/><div className="text-2xl">🔗</div></div>
          <div className="text-center mb-8"><h1 className="text-3xl font-black text-white mb-1">QR Code Generator</h1><p className="text-slate-500 text-sm">Your last link is saved automatically 💾</p></div>
          <div className="grid md:grid-cols-5 gap-5">
            <div className="md:col-span-3 space-y-4">
              <GlassCard className="p-6 space-y-4">
                <div><label className="text-slate-400 text-sm mb-1.5 block">Link / URL</label><div className="flex gap-2"><input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://forms.google.com/…" className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-white placeholder-slate-700 text-sm transition-all"/>{hasUrl&&<button onClick={copyLink} className={`px-4 py-3 rounded-xl border transition-all text-sm font-medium flex-shrink-0 ${copied?'bg-emerald-500/20 border-emerald-500/40 text-emerald-400':'bg-white/5 border-white/10 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400'}`}>{copied?'✓ Copied':'Copy'}</button>}</div></div>
                <div><label className="text-slate-400 text-sm mb-1.5 block">Label <span className="text-slate-600">(optional)</span></label><input type="text" value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Post-event Evaluation Form" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-white placeholder-slate-700 text-sm transition-all"/></div>
                <div><label className="text-slate-400 text-sm mb-2 block">QR Size</label><div className="flex gap-2">{[200,300,400,600].map(s=><button key={s} onClick={()=>setSize(s)} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${size===s?'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300':'bg-white/5 border border-white/10 text-slate-500 hover:border-emerald-500/20 hover:text-slate-300'}`}>{s}px</button>)}</div></div>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-slate-600 text-xs uppercase tracking-widest mb-3">Quick examples</p>
                <div className="space-y-1.5">{[{icon:'📋',label:'Google Form',hint:'https://forms.gle/…'},{icon:'🔗',label:'Website link',hint:'https://yoursite.com'},{icon:'📱',label:'LINE / WhatsApp group',hint:'https://line.me/ti/g/…'},{icon:'📁',label:'Google Drive / Docs',hint:'https://drive.google.com/…'}].map(ex=><button key={ex.label} onClick={()=>setUrl(ex.hint)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all text-left group"><span className="text-lg">{ex.icon}</span><span className="text-slate-400 group-hover:text-slate-200 text-sm transition-colors flex-1">{ex.label}</span><span className="text-slate-700 text-xs font-mono truncate max-w-[140px]">{ex.hint}</span></button>)}</div>
              </GlassCard>
            </div>
            <div className="md:col-span-2">
              <GlassCard className="p-6 text-center sticky top-6">
                {!hasUrl?<div className="py-12 space-y-4"><div className="w-40 h-40 mx-auto rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center"><span className="text-5xl opacity-20">🔗</span></div><p className="text-slate-600 text-sm">Enter a URL to generate your QR code</p></div>
                :<div className="space-y-4">
                  <div className="relative inline-block"><div className="p-3 bg-white rounded-2xl shadow-lg shadow-black/30 inline-block"><img key={qrUrl} src={qrUrl} alt="QR Code" width={180} height={180} className="rounded-lg block" style={{imageRendering:'pixelated'}}/></div><div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg"/><div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg"/><div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg"/><div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-lg"/></div>
                  {label&&<p className="text-white font-bold text-base leading-tight">{label}</p>}
                  <p className="text-slate-600 text-xs break-all leading-relaxed">{url.length>60?url.slice(0,60)+'…':url}</p>
                  <div className="flex flex-col gap-2 pt-2"><GlowButton onClick={()=>setFullscreen(true)} variant="emerald" size="md" className="w-full">⛶ Fullscreen / Project</GlowButton><button onClick={downloadQR} className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:text-emerald-400 text-slate-400 text-sm font-medium transition-all">↓ Download PNG</button></div>
                </div>}
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function App() {
  const [screen,setScreen]=useState('welcome'),[participantData,setParticipantData]=useState(null),[groupData,setGroupData]=useState(null),[initialJoinCode,setInitialJoinCode]=useState('')
  useEffect(()=>{ const code=getJoinCodeFromURL();if(code){setInitialJoinCode(code.toUpperCase());setScreen('participant-join');clearJoinCodeFromURL()} },[])
  const goHome=useCallback(()=>{resetSocket();setScreen('welcome');setParticipantData(null);setGroupData(null);setInitialJoinCode('')},[])
  const handleParticipantJoined=useCallback(data=>{ setParticipantData(data);if(data.initialGroups&&data.myGroupIndex>=0){setGroupData({groups:data.initialGroups,myGroupIndex:data.myGroupIndex});setScreen('participant-result')}else setScreen('participant-waiting') },[])
  const handleGroupsAssigned=useCallback(data=>{setGroupData(data);setScreen('participant-result')},[])
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {screen==='welcome'            &&<WelcomeScreen onHost={()=>setScreen('host')} onParticipant={()=>setScreen('participant-join')} onLuckyDraw={()=>setScreen('lucky-draw')} onQR={()=>setScreen('qr-generator')}/>}
      {screen==='host'               &&<HostScreen onBack={goHome}/>}
      {screen==='participant-join'   &&<ParticipantJoinScreen onBack={goHome} onJoined={handleParticipantJoined} initialCode={initialJoinCode}/>}
      {screen==='participant-waiting'&&participantData&&<ParticipantWaitingScreen name={participantData.name} roomCode={participantData.roomCode} socketId={participantData.socketId} onGroupsAssigned={handleGroupsAssigned}/>}
      {screen==='participant-result' &&participantData&&groupData&&<ParticipantResultScreen name={participantData.name} groups={groupData.groups} myGroupIndex={groupData.myGroupIndex} onBack={goHome}/>}
      {screen==='lucky-draw'         &&<LuckyDrawScreen onBack={goHome}/>}
      {screen==='qr-generator'       &&<QRGeneratorScreen onBack={goHome}/>}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

const button = 'rounded-xl px-5 py-3 font-semibold bg-gradient-to-r from-teal-500 to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed'
const input = 'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-cyan-400'
const card = 'rounded-2xl border border-white/10 bg-white/5 p-5'
const storageKey = 'ai-ascend-qna-speaker'
function savedSession() {
  try { return JSON.parse(localStorage.getItem(storageKey)) } catch { return null }
}
function request(socket, event, data) {
  return new Promise(resolve => socket.timeout(8000).emit(event, data, (error, result) =>
    resolve(error ? { success: false, error: 'Connection timed out. Please try again.' } : result)))
}

export default function LiveQuestionsScreen({ socket, onBack }) {
  const params = new URLSearchParams(window.location.search)
  const [code, setCode] = useState(() => params.get('qna')?.toUpperCase() || '')
  const [hostToken, setHostToken] = useState(() => {
    const saved = savedSession()
    return saved && saved.code === params.get('qna')?.toUpperCase() && !params.has('display') ? saved.hostToken : ''
  })
  const [board, setBoard] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [connected, setConnected] = useState(socket.connected)
  const [ready, setReady] = useState(false)
  const [title, setTitle] = useState('Live Q&A')
  const [joinCode, setJoinCode] = useState('')
  const [name, setName] = useState('')
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [presenting, setPresenting] = useState(params.has('display'))
  const pendingQuestion = useRef(null)
  const guestUrl = code ? `${window.location.origin}${window.location.pathname}?qna=${encodeURIComponent(code)}` : ''

  useEffect(() => {
    let active = true
    const join = async () => {
      setConnected(true)
      setReady(false)
      if (!code) return
      const result = await request(socket, 'qna-join', { code, hostToken })
      if (!active) return
      if (result?.success) {
        setBoard(result); setIsHost(result.isHost); setReady(true); setError('')
      } else setError(result?.error || 'Could not join the session.')
    }
    const disconnect = () => { setConnected(false); setReady(false) }
    const update = next => { if (next.code === code) setBoard(next) }
    socket.on('connect', join)
    socket.on('disconnect', disconnect)
    socket.on('qna-update', update)
    if (socket.connected) join()
    return () => {
      active = false
      socket.off('connect', join); socket.off('disconnect', disconnect); socket.off('qna-update', update)
      if (code) socket.emit('qna-leave', { code })
    }
  }, [socket, code, hostToken])

  const openSession = (nextCode, token = '') => {
    setBoard(null); setReady(false); setError(''); setNotice(''); setIsHost(false)
    setHostToken(token); setCode(nextCode); setPresenting(false)
    window.history.replaceState({}, '', `${window.location.pathname}?qna=${encodeURIComponent(nextCode)}`)
  }
  const create = async e => {
    e.preventDefault(); setBusy(true); setError('')
    const result = await request(socket, 'qna-create', { title })
    setBusy(false)
    if (!result?.success) return setError(result?.error || 'Could not create the session.')
    openSession(result.code, result.hostToken)
    try { localStorage.setItem(storageKey, JSON.stringify({ code: result.code, hostToken: result.hostToken })) }
    catch { setNotice('Keep this tab open: this browser could not save speaker access.') }
  }
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    const draft = { text: question.trim(), name: name.trim() }
    if (!pendingQuestion.current || pendingQuestion.current.text !== draft.text || pendingQuestion.current.name !== draft.name)
      pendingQuestion.current = { ...draft, requestId: crypto.randomUUID() }
    const result = await request(socket, 'qna-submit', { code, ...pendingQuestion.current })
    setBusy(false)
    if (!result?.success) return setError(result?.error || 'Could not send your question.')
    pendingQuestion.current = null; setQuestion(''); setNotice('Your question is now on the live board.')
  }
  const remove = async questionId => {
    setBusy(true); setError('')
    const result = await request(socket, 'qna-delete', { code, hostToken, questionId })
    setBusy(false)
    if (!result?.success) setError(result?.error || 'Could not delete the question.')
  }

  return <div className="min-h-screen bg-[#0a0f1e] px-4 py-8 sm:px-8">
    <div className={`mx-auto ${presenting ? 'max-w-7xl' : 'max-w-4xl'}`}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <button onClick={onBack} className="text-white/60 hover:text-white">← Back</button>
        <span role="status" className={`text-sm ${connected && (!code || ready) ? 'text-teal-300' : 'text-amber-300'}`}>
          {connected ? (code && !ready ? 'Joining session…' : '● Live') : 'Reconnecting…'}
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black mb-2">💬 {board?.title || 'Live Q&A'}</h1>
      <p className="text-white/60 mb-6">Guest questions appear instantly and stay until the speaker deletes them.</p>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-4 text-red-300">{error}</p>}
      {notice && <p role="status" className="mb-4 text-teal-300">{notice}</p>}

      {!code ? <div className="grid gap-5 sm:grid-cols-2">
        <form onSubmit={create} className={card}>
          <h2 className="text-xl font-bold mb-2">I’m the speaker</h2>
          <p className="text-white/60 text-sm mb-4">Create a board and share the guest link with your audience.</p>
          <label htmlFor="qna-title" className="block text-sm mb-2">Session title</label>
          <input id="qna-title" className={input} value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required />
          <button className={`${button} w-full mt-4`} disabled={busy || !connected || !title.trim()}>Create question board</button>
          {savedSession()?.code && <button type="button" className="mt-4 text-cyan-300 text-sm" onClick={() => {
            const saved = savedSession(); openSession(saved.code, saved.hostToken)
          }}>Reopen my board ({savedSession().code})</button>}
        </form>
        <form onSubmit={e => { e.preventDefault(); openSession(joinCode.trim().toUpperCase()) }} className={card}>
          <h2 className="text-xl font-bold mb-2">I’m a guest</h2>
          <p className="text-white/60 text-sm mb-4">Scan the speaker’s QR code or enter the session code.</p>
          <label htmlFor="qna-code" className="block text-sm mb-2">Session code</label>
          <input id="qna-code" className={`${input} uppercase tracking-widest`} value={joinCode} onChange={e => setJoinCode(e.target.value)} maxLength={8} required autoCapitalize="characters" />
          <button className={`${button} w-full mt-4`} disabled={!joinCode.trim() || !connected}>Join session</button>
        </form>
      </div> : <>
        <div className={`${card} mb-6 flex flex-wrap items-center gap-5`}>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(guestUrl)}`} alt="Scan to ask a question" width="128" height="128" className="rounded-xl bg-white p-2" />
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-sm">Scan to ask • Session code</p>
            <p className="text-3xl font-black tracking-widest text-cyan-300 my-2">{code}</p>
            <a href={guestUrl} className="text-sm text-white/60 break-all">{guestUrl}</a>
            <div className="flex flex-wrap gap-3 mt-3">
              <button className="text-cyan-300 text-sm" onClick={async () => {
                try { await navigator.clipboard.writeText(guestUrl); setNotice('Guest link copied.') }
                catch { setError('Could not copy. Select and copy the guest link above.') }
              }}>Copy guest link</button>
              <button className="text-cyan-300 text-sm" onClick={() => setPresenting(!presenting)}>{presenting ? 'Exit projector view' : 'Projector view'}</button>
              {isHost && <a className="text-cyan-300 text-sm" href={`${guestUrl}&display=1`} target="_blank" rel="noreferrer">Open display in new tab ↗</a>}
              {!board && <button className="text-cyan-300 text-sm" onClick={() => { setCode(''); window.history.replaceState({}, '', window.location.pathname) }}>Try another code</button>}
            </div>
          </div>
        </div>
        {!isHost && !presenting && board && <form onSubmit={submit} className={`${card} mb-6`}>
          <label htmlFor="qna-name" className="block text-sm mb-2">Name (optional)</label>
          <input id="qna-name" className={`${input} mb-4`} value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Anonymous" />
          <label htmlFor="qna-question" className="block text-sm mb-2">Your question</label>
          <textarea id="qna-question" className={input} rows={3} value={question} onChange={e => setQuestion(e.target.value)} maxLength={500} required placeholder="What would you like to ask the speaker?" />
          <div className="flex justify-between items-center gap-3 mt-3">
            <span className="text-white/40 text-sm">{question.length}/500</span>
            <button className={button} disabled={busy || !ready || !connected || !question.trim()}>{busy ? 'Sending…' : 'Send question'}</button>
          </div>
        </form>}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Questions ({board?.questions.length || 0})</h2>
          {isHost && <span className="text-sm text-teal-300">Speaker controls</span>}
        </div>
        <div className={`grid gap-4 ${presenting ? 'md:grid-cols-2' : ''}`} aria-live="polite" aria-relevant="additions removals">
          {board?.questions.map((q, index) => <article key={q.id} className={`${card} min-w-0`}>
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-white/50 text-sm break-words">#{index + 1} · {q.name}</span>
              {isHost && <button onClick={() => remove(q.id)} disabled={busy || !ready || !connected} aria-label={`Delete question: ${q.text}`} className="shrink-0 rounded-lg px-3 py-2 text-sm text-red-300 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40">Delete</button>}
            </div>
            <p className={`whitespace-pre-wrap break-words leading-relaxed ${presenting ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>{q.text}</p>
          </article>)}
        </div>
        {board && !board.questions.length && <div className={`${card} py-12 text-center text-white/50`}>No questions yet. Scan the QR code to send the first question.</div>}
      </>}
    </div>
  </div>
}

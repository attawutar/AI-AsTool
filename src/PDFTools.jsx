import { useState, useRef, useCallback } from 'react'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import heic2any from 'heic2any'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const readAB = f => new Promise((res,rej) => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsArrayBuffer(f) })
const readDataURL = f => new Promise((res,rej) => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(f) })
const dlPDF = (bytes, name='output.pdf') => { const b=new Blob([bytes],{type:'application/pdf'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(u),1000) }
const dlBlob = (blob, name) => { const u=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=u; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(u),1000) }
const fmtSize = b => b>1e6?`${(b/1e6).toFixed(1)} MB`:b>1e3?`${(b/1e3).toFixed(0)} KB`:`${b} B`

async function getPDFJS() {
  const lib = await import('pdfjs-dist')
  lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  return lib
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Bg() {
  return <div className="fixed inset-0 -z-10 bg-[#0a0f1e]"><div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl animate-pulse"/><div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{animationDelay:'1s'}}/></div>
}
function Card({children,className='', ...rest}){return <div {...rest} className={`rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-5 ${className}`}>{children}</div>}
function Btn({children,onClick,v='primary',className='',disabled=false,size='md'}){
  const sz={sm:'px-3 py-1.5 text-sm',md:'px-5 py-2.5 text-base',lg:'px-6 py-3 text-lg'}
  const vs={primary:'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20 hover:scale-105',secondary:'bg-white/[0.08] text-white border border-white/10 hover:bg-white/[0.14]',danger:'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:scale-105',success:'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:scale-105'}
  return <button onClick={onClick} disabled={disabled} className={`font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${sz[size]} ${vs[v]} ${className}`}>{children}</button>
}
function Spin(){return <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin inline-block"/>}
function Back({onBack}){return <button onClick={onBack} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-4 transition-colors">← Back</button>}

function Drop({accept,multiple=false,onFiles,icon='📁',label}){
  const ref=useRef()
  return (
    <div onClick={()=>ref.current?.click()} className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-white/[0.02] transition-all">
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" onChange={e=>{if(e.target.files.length)onFiles([...e.target.files]);e.target.value=''}}/>
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-white/60 text-sm">{label||`Drop ${multiple?'files':'a file'} here`}</p>
      <p className="text-white/30 text-xs mt-1">or click to browse</p>
    </div>
  )
}

function StatusMsg({status}){
  if(!status)return null
  const is=status.startsWith('✓')
  return <div className={`p-3 rounded-xl text-sm mt-3 ${is?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20':'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{status}</div>
}

// ─── 1. Merge PDFs ────────────────────────────────────────────────────────────
function MergePDF({onBack}){
  const [files,setFiles]=useState([])
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const add = fs => setFiles(p=>[...p,...fs])
  const remove = i => setFiles(f=>f.filter((_,j)=>j!==i))
  const merge = async()=>{
    if(files.length<2)return setStatus('Add at least 2 PDF files.')
    setBusy(true);setStatus('')
    try{
      const out=await PDFDocument.create()
      for(const f of files){const ab=await readAB(f);const src=await PDFDocument.load(ab);const pages=await out.copyPages(src,src.getPageIndices());pages.forEach(p=>out.addPage(p))}
      dlPDF(await out.save(),'merged.pdf')
      setStatus(`✓ Merged ${files.length} files successfully!`)
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">📎 Merge PDFs</h1>
        <Drop accept=".pdf" multiple icon="📄" label="Add PDF files (in order)" onFiles={add}/>
        {files.length>0&&<div className="mt-3 space-y-2">{files.map((f,i)=><div key={i} className="flex items-center gap-2 text-sm"><span className="text-white/70 flex-1 truncate">{f.name}</span><span className="text-white/30">{fmtSize(f.size)}</span><button onClick={()=>remove(i)} className="text-white/30 hover:text-red-400">×</button></div>)}</div>}
        <StatusMsg status={status}/>
        <Btn onClick={merge} disabled={files.length<2||busy} className="w-full mt-4">{busy?<Spin/>:`Merge ${files.length} files`}</Btn>
      </div>
    </div>
  )
}

// ─── 2. Split PDF ─────────────────────────────────────────────────────────────
function SplitPDF({onBack}){
  const [file,setFile]=useState(null)
  const [pages,setPages]=useState(0)
  const [range,setRange]=useState('')
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const load=async([f])=>{setFile(f);setStatus('');try{const ab=await readAB(f);const d=await PDFDocument.load(ab);setPages(d.getPageCount())}catch{setStatus('Could not read PDF.')}}
  const parseRanges=str=>{const nums=new Set();str.split(',').forEach(p=>{p=p.trim();if(p.includes('-')){const[a,b]=p.split('-').map(Number);for(let i=a;i<=b;i++)nums.add(i)}else if(Number(p))nums.add(Number(p))});return [...nums].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b)}
  const split=async()=>{
    if(!file)return
    setBusy(true);setStatus('')
    try{
      const ab=await readAB(file);const src=await PDFDocument.load(ab)
      const idxs=(range.trim()?parseRanges(range):Array.from({length:pages},(_,i)=>i+1)).map(n=>n-1)
      if(!idxs.length)return setStatus('No valid pages specified.'),setBusy(false)
      const out=await PDFDocument.create()
      const copied=await out.copyPages(src,idxs);copied.forEach(p=>out.addPage(p))
      dlPDF(await out.save(),`split_p${idxs[0]+1}-p${idxs[idxs.length-1]+1}.pdf`)
      setStatus(`✓ Extracted ${idxs.length} page(s)!`)
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">✂️ Split PDF</h1>
        {!file?<Drop accept=".pdf" icon="📄" label="Upload a PDF to split" onFiles={load}/>:<>
          <Card className="mb-4"><p className="text-white/70 text-sm truncate">{file.name}</p><p className="text-white/40 text-xs mt-1">{pages} pages · {fmtSize(file.size)}</p></Card>
          <Card className="mb-3">
            <label className="text-white/50 text-xs uppercase tracking-widest block mb-2">Pages to extract (e.g. 1-3, 5, 8-10)</label>
            <input value={range} onChange={e=>setRange(e.target.value)} placeholder={`Leave blank to extract all ${pages} pages`} className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-cyan-500/50 text-sm"/>
          </Card>
        </>}
        <StatusMsg status={status}/>
        {file&&<Btn onClick={split} disabled={busy} className="w-full mt-2">{busy?<Spin/>:'Extract Pages'}</Btn>}
        {file&&<Btn v="secondary" onClick={()=>{setFile(null);setPages(0);setRange('');setStatus('')}} className="w-full mt-2">Choose Different File</Btn>}
      </div>
    </div>
  )
}

// ─── 3. Organize Pages ────────────────────────────────────────────────────────
function OrganizePDF({onBack}){
  const [file,setFile]=useState(null)
  const [order,setOrder]=useState([])
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const load=async([f])=>{setFile(f);setStatus('');try{const ab=await readAB(f);const d=await PDFDocument.load(ab);setOrder(Array.from({length:d.getPageCount()},(_,i)=>i))}catch{setStatus('Could not read PDF.')}}
  const move=(i,dir)=>{const a=[...order];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];setOrder(a)}
  const remove=i=>setOrder(o=>o.filter((_,j)=>j!==i))
  const save=async()=>{
    if(!file||!order.length)return
    setBusy(true);setStatus('')
    try{const ab=await readAB(file);const src=await PDFDocument.load(ab);const out=await PDFDocument.create();const pages=await out.copyPages(src,order);pages.forEach(p=>out.addPage(p));dlPDF(await out.save(),'organized.pdf');setStatus(`✓ Saved ${order.length} pages!`)}
    catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">🗂️ Organize Pages</h1>
        {!file?<Drop accept=".pdf" icon="📄" label="Upload PDF to organize" onFiles={load}/>:<>
          <p className="text-white/40 text-xs mb-3">{order.length} pages remaining</p>
          <div className="space-y-1.5 mb-4 max-h-72 overflow-y-auto">
            {order.map((orig,i)=>(
              <div key={i} className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-2">
                <span className="text-white/30 text-xs w-6">#{i+1}</span>
                <span className="text-white/70 text-sm flex-1">Page {orig+1}</span>
                <button onClick={()=>move(i,-1)} disabled={i===0} className="text-white/30 hover:text-white disabled:opacity-20 px-1">↑</button>
                <button onClick={()=>move(i,1)} disabled={i===order.length-1} className="text-white/30 hover:text-white disabled:opacity-20 px-1">↓</button>
                <button onClick={()=>remove(i)} className="text-white/30 hover:text-red-400 px-1">×</button>
              </div>
            ))}
          </div>
        </>}
        <StatusMsg status={status}/>
        {file&&<Btn onClick={save} disabled={busy||!order.length} className="w-full">{busy?<Spin/>:'Save PDF'}</Btn>}
      </div>
    </div>
  )
}

// ─── 4. Compress PDF ──────────────────────────────────────────────────────────
function CompressPDF({onBack}){
  const [file,setFile]=useState(null)
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const compress=async()=>{
    if(!file)return;setBusy(true);setStatus('')
    try{const ab=await readAB(file);const d=await PDFDocument.load(ab,{updateMetadata:false});const bytes=await d.save({useObjectStreams:true});dlPDF(bytes,'compressed.pdf');const saved=file.size-bytes.length;setStatus(saved>0?`✓ Reduced by ${fmtSize(saved)} (${fmtSize(bytes.length)} total)`:`✓ Re-saved (${fmtSize(bytes.length)} — already optimised)`)}
    catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">🗜️ Compress PDF</h1>
        <p className="text-white/40 text-xs mb-4">Re-encodes the PDF structure. Works best on PDFs with duplicate objects or metadata bloat.</p>
        {!file?<Drop accept=".pdf" icon="📄" label="Upload PDF to compress" onFiles={([f])=>{setFile(f);setStatus('')}}/>:<Card className="mb-4"><p className="text-white/70 text-sm truncate">{file.name}</p><p className="text-white/40 text-xs mt-1">{fmtSize(file.size)}</p></Card>}
        <StatusMsg status={status}/>
        {file&&<><Btn onClick={compress} disabled={busy} className="w-full mt-3">{busy?<Spin/>:'Compress & Download'}</Btn><Btn v="secondary" onClick={()=>{setFile(null);setStatus('')}} className="w-full mt-2">Choose Different File</Btn></>}
      </div>
    </div>
  )
}

// ─── 5. PDF to Images ─────────────────────────────────────────────────────────
function PDFToImage({onBack}){
  const [file,setFile]=useState(null)
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const [previews,setPreviews]=useState([])
  const convert=async()=>{
    if(!file)return;setBusy(true);setStatus('Loading PDF.js…');setPreviews([])
    try{
      const pdfjsLib=await getPDFJS()
      const ab=await readAB(file)
      const pdf=await pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise
      const imgs=[]
      for(let i=1;i<=pdf.numPages;i++){
        setStatus(`Rendering page ${i} of ${pdf.numPages}…`)
        const page=await pdf.getPage(i)
        const vp=page.getViewport({scale:2})
        const canvas=document.createElement('canvas');canvas.width=vp.width;canvas.height=vp.height
        await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise
        const url=canvas.toDataURL('image/jpeg',0.92)
        imgs.push({url,name:`page_${i}.jpg`})
      }
      setPreviews(imgs);setStatus(`✓ ${imgs.length} page(s) converted!`)
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  const dl=(p)=>{const a=document.createElement('a');a.href=p.url;a.download=p.name;a.click()}
  const dlAll=()=>previews.forEach((p,i)=>setTimeout(()=>dl(p),i*200))
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">🖼️ PDF → Images</h1>
        {!file?<Drop accept=".pdf" icon="📄" label="Upload PDF to convert" onFiles={([f])=>{setFile(f);setStatus('');setPreviews([])}}/>:<Card className="mb-4"><p className="text-white/70 text-sm truncate">{file.name}</p><p className="text-white/40 text-xs mt-1">{fmtSize(file.size)}</p></Card>}
        <StatusMsg status={status}/>
        {file&&!previews.length&&<Btn onClick={convert} disabled={busy} className="w-full mt-3">{busy?<Spin/>:'Convert to JPG'}</Btn>}
        {previews.length>0&&<>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {previews.map((p,i)=><div key={i} className="relative cursor-pointer" onClick={()=>dl(p)}><img src={p.url} className="w-full rounded-lg border border-white/10"/><p className="text-white/40 text-xs text-center mt-1">p.{i+1}</p></div>)}
          </div>
          <Btn onClick={dlAll} className="w-full mt-4">⬇ Download All JPGs</Btn>
        </>}
        {file&&<Btn v="secondary" onClick={()=>{setFile(null);setStatus('');setPreviews([])}} className="w-full mt-2">Choose Different File</Btn>}
      </div>
    </div>
  )
}

// ─── 6. Compress Images ───────────────────────────────────────────────────────
function ImageCompress({onBack}){
  const [files,setFiles]=useState([])
  const [quality,setQuality]=useState(0.75)
  const [results,setResults]=useState([])
  const [busy,setBusy]=useState(false)
  const compress=async()=>{
    if(!files.length)return;setBusy(true);setResults([])
    const out=[]
    for(const f of files){
      const url=await readDataURL(f)
      await new Promise(res=>{
        const img=new Image();img.onload=()=>{
          const c=document.createElement('canvas');c.width=img.width;c.height=img.height
          c.getContext('2d').drawImage(img,0,0)
          c.toBlob(b=>{out.push({name:f.name.replace(/\.[^.]+$/,'.jpg'),blob:b,orig:f.size,comp:b.size});res();},'image/jpeg',quality)
        };img.src=url
      })
    }
    setResults(out);setBusy(false)
  }
  const dlAll=()=>results.forEach((r,i)=>setTimeout(()=>dlBlob(r.blob,r.name),i*200))
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">📷 Compress Images</h1>
        <Drop accept="image/*" multiple icon="🖼️" label="Upload images (JPG, PNG, etc.)" onFiles={fs=>setFiles(p=>[...p,...fs])}/>
        {files.length>0&&<div className="mt-3 space-y-1 mb-4">{files.map((f,i)=><div key={i} className="flex items-center gap-2 text-sm"><span className="text-white/70 flex-1 truncate">{f.name}</span><button onClick={()=>setFiles(f=>f.filter((_,j)=>j!==i))} className="text-white/30 hover:text-red-400">×</button></div>)}</div>}
        <Card className="mb-4">
          <label className="text-white/50 text-xs uppercase tracking-widest block mb-2">Quality: {Math.round(quality*100)}%</label>
          <input type="range" min={10} max={95} value={Math.round(quality*100)} onChange={e=>setQuality(e.target.value/100)} className="w-full accent-cyan-500"/>
          <div className="flex justify-between text-white/30 text-xs mt-1"><span>Smaller file</span><span>Better quality</span></div>
        </Card>
        {results.length>0&&<div className="mb-4 space-y-1">{results.map((r,i)=><div key={i} className="text-xs text-white/50">{r.name}: {fmtSize(r.orig)} → {fmtSize(r.comp)} ({Math.round((1-r.comp/r.orig)*100)}% saved)</div>)}</div>}
        <Btn onClick={results.length?dlAll:compress} disabled={!files.length||busy} className="w-full">{busy?<Spin/>:results.length?'⬇ Download All':'Compress'}</Btn>
      </div>
    </div>
  )
}

// ─── 7. Images to PDF ─────────────────────────────────────────────────────────
function ImageToPDF({onBack}){
  const [files,setFiles]=useState([])
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const remove=i=>setFiles(f=>f.filter((_,j)=>j!==i))
  const convert=async()=>{
    if(!files.length)return;setBusy(true);setStatus('')
    try{
      const doc=await PDFDocument.create()
      for(const f of files){
        const ab=await readAB(f)
        let img;if(f.type==='image/png')img=await doc.embedPng(ab);else img=await doc.embedJpg(ab)
        const {width,height}=img.scale(1)
        const page=doc.addPage([width,height])
        page.drawImage(img,{x:0,y:0,width,height})
      }
      dlPDF(await doc.save(),'images.pdf')
      setStatus(`✓ Created PDF from ${files.length} image(s)!`)
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">📄 Images → PDF</h1>
        <Drop accept="image/jpeg,image/png" multiple icon="🖼️" label="Upload JPG or PNG images" onFiles={fs=>setFiles(p=>[...p,...fs])}/>
        {files.length>0&&<div className="mt-3 space-y-1.5 mb-4">{files.map((f,i)=><div key={i} className="flex items-center gap-2 text-sm"><span className="text-white/70 flex-1 truncate">{f.name}</span><span className="text-white/30">{fmtSize(f.size)}</span><button onClick={()=>remove(i)} className="text-white/30 hover:text-red-400">×</button></div>)}</div>}
        <StatusMsg status={status}/>
        <Btn onClick={convert} disabled={!files.length||busy} className="w-full mt-3">{busy?<Spin/>:`Create PDF (${files.length} image${files.length!==1?'s':''})`}</Btn>
      </div>
    </div>
  )
}

// ─── 8. Page Numbers ──────────────────────────────────────────────────────────
function PageNumbers({onBack}){
  const [file,setFile]=useState(null)
  const [start,setStart]=useState(1)
  const [pos,setPos]=useState('bottom-center')
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const positions={'bottom-center':{x:'center',y:20},'bottom-right':{x:'right',y:20},'bottom-left':{x:'left',y:20},'top-center':{x:'center',y:null,top:20}}
  const add=async()=>{
    if(!file)return;setBusy(true);setStatus('')
    try{
      const ab=await readAB(file);const doc=await PDFDocument.load(ab)
      const font=await doc.embedFont(StandardFonts.Helvetica)
      const pages=doc.getPages()
      pages.forEach((page,i)=>{
        const {width,height}=page.getSize()
        const n=`${i+start}`, size=11
        const tw=font.widthOfTextAtSize(n,size)
        const p=positions[pos]
        const x=p.x==='center'?width/2-tw/2:p.x==='right'?width-tw-20:20
        const y=p.top?height-p.top:p.y
        page.drawText(n,{x,y,size,font,color:rgb(0.3,0.3,0.3)})
      })
      dlPDF(await doc.save(),'numbered.pdf')
      setStatus(`✓ Added page numbers to ${pages.length} pages!`)
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">🔢 Add Page Numbers</h1>
        {!file?<Drop accept=".pdf" icon="📄" label="Upload PDF" onFiles={([f])=>{setFile(f);setStatus('')}}/>:<>
          <Card className="mb-4"><p className="text-white/70 text-sm truncate">{file.name}</p></Card>
          <Card className="mb-4 space-y-3">
            <div><label className="text-white/50 text-xs uppercase tracking-widest block mb-1">Start number</label><input type="number" value={start} onChange={e=>setStart(parseInt(e.target.value)||1)} min={1} className="w-24 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none"/></div>
            <div><label className="text-white/50 text-xs uppercase tracking-widest block mb-1">Position</label>
              <div className="flex gap-2 flex-wrap">{Object.keys(positions).map(p=><button key={p} onClick={()=>setPos(p)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${pos===p?'bg-gradient-to-r from-cyan-500 to-purple-500 text-white':'bg-white/[0.07] text-white/60 hover:bg-white/[0.12]'}`}>{p.replace('-',' ')}</button>)}</div>
            </div>
          </Card>
        </>}
        <StatusMsg status={status}/>
        {file&&<Btn onClick={add} disabled={busy} className="w-full mt-2">{busy?<Spin/>:'Add Numbers & Download'}</Btn>}
      </div>
    </div>
  )
}

// ─── 9. Watermark ────────────────────────────────────────────────────────────
function Watermark({onBack}){
  const [file,setFile]=useState(null)
  const [text,setText]=useState('CONFIDENTIAL')
  const [opacity,setOpacity]=useState(0.15)
  const [diagonal,setDiagonal]=useState(true)
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const add=async()=>{
    if(!file||!text.trim())return;setBusy(true);setStatus('')
    try{
      const ab=await readAB(file);const doc=await PDFDocument.load(ab)
      const font=await doc.embedFont(StandardFonts.HelveticaBold)
      doc.getPages().forEach(page=>{
        const {width,height}=page.getSize()
        page.drawText(text.trim(),{x:width/2-font.widthOfTextAtSize(text,36)/2,y:height/2,size:36,font,color:rgb(0.5,0.5,0.5),opacity,rotate:diagonal?degrees(45):degrees(0)})
      })
      dlPDF(await doc.save(),'watermarked.pdf')
      setStatus('✓ Watermark added!')
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">💧 Add Watermark</h1>
        {!file?<Drop accept=".pdf" icon="📄" label="Upload PDF" onFiles={([f])=>{setFile(f);setStatus('')}}/>:<>
          <Card className="mb-4"><p className="text-white/70 text-sm truncate">{file.name}</p></Card>
          <Card className="mb-4 space-y-3">
            <div><label className="text-white/50 text-xs uppercase tracking-widest block mb-1">Watermark text</label><input value={text} onChange={e=>setText(e.target.value)} className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500/50 text-sm"/></div>
            <div><label className="text-white/50 text-xs uppercase tracking-widest block mb-1">Opacity: {Math.round(opacity*100)}%</label><input type="range" min={5} max={80} value={Math.round(opacity*100)} onChange={e=>setOpacity(e.target.value/100)} className="w-full accent-cyan-500"/></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={diagonal} onChange={e=>setDiagonal(e.target.checked)} className="accent-cyan-500"/><span className="text-white/60 text-sm">Diagonal</span></label>
          </Card>
        </>}
        <StatusMsg status={status}/>
        {file&&<Btn onClick={add} disabled={busy||!text.trim()} className="w-full mt-2">{busy?<Spin/>:'Add Watermark & Download'}</Btn>}
      </div>
    </div>
  )
}

// ─── 10. Crop PDF ─────────────────────────────────────────────────────────────
function CropPDF({onBack}){
  const [file,setFile]=useState(null)
  const [margins,setMargins]=useState({top:0,right:0,bottom:0,left:0})
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const setM=(k,v)=>setMargins(m=>({...m,[k]:parseFloat(v)||0}))
  const crop=async()=>{
    if(!file)return;setBusy(true);setStatus('')
    try{
      const ab=await readAB(file);const doc=await PDFDocument.load(ab)
      doc.getPages().forEach(page=>{
        const {width,height}=page.getSize()
        const {top,right,bottom,left}=margins
        page.setCropBox(left,bottom,width-left-right,height-top-bottom)
      })
      dlPDF(await doc.save(),'cropped.pdf')
      setStatus('✓ PDF cropped!')
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">✂️ Crop PDF</h1>
        {!file?<Drop accept=".pdf" icon="📄" label="Upload PDF to crop" onFiles={([f])=>{setFile(f);setStatus('')}}/>:<>
          <Card className="mb-4"><p className="text-white/70 text-sm truncate">{file.name}</p></Card>
          <Card className="mb-4"><p className="text-white/50 text-xs uppercase tracking-widest mb-3">Crop margins (pt)</p>
            <div className="grid grid-cols-2 gap-3">{['top','right','bottom','left'].map(k=><div key={k}><label className="text-white/40 text-xs capitalize block mb-1">{k}</label><input type="number" value={margins[k]} onChange={e=>setM(k,e.target.value)} min={0} className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none"/></div>)}</div>
          </Card>
        </>}
        <StatusMsg status={status}/>
        {file&&<Btn onClick={crop} disabled={busy} className="w-full mt-2">{busy?<Spin/>:'Crop & Download'}</Btn>}
      </div>
    </div>
  )
}

// ─── 11. Password Protect ─────────────────────────────────────────────────────
function ProtectPDF({onBack}){
  const [file,setFile]=useState(null)
  const [pw,setPw]=useState('')
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const protect=async()=>{
    if(!file||!pw)return;setBusy(true);setStatus('')
    try{
      const ab=await readAB(file);const doc=await PDFDocument.load(ab)
      const bytes=await doc.save({userPassword:pw,ownerPassword:pw+'_owner',permissions:{printing:'highResolution',copying:false,modifying:false}})
      dlPDF(bytes,'protected.pdf')
      setStatus('✓ PDF protected with password!')
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">🔒 Password Protect</h1>
        {!file?<Drop accept=".pdf" icon="📄" label="Upload PDF to protect" onFiles={([f])=>{setFile(f);setStatus('')}}/>:<>
          <Card className="mb-4"><p className="text-white/70 text-sm truncate">{file.name}</p></Card>
          <Card className="mb-4"><label className="text-white/50 text-xs uppercase tracking-widest block mb-2">Password</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Enter password…" className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-cyan-500/50"/></Card>
        </>}
        <StatusMsg status={status}/>
        {file&&<Btn onClick={protect} disabled={busy||!pw} className="w-full mt-2">{busy?<Spin/>:'Protect & Download'}</Btn>}
      </div>
    </div>
  )
}

// ─── 12. Sign PDF ─────────────────────────────────────────────────────────────
function SignPDF({onBack}){
  const [file,setFile]=useState(null)
  const [pageNum,setPageNum]=useState(1)
  const [totalPages,setTotalPages]=useState(1)
  const [drawing,setDrawing]=useState(false)
  const [hasSig,setHasSig]=useState(false)
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const canvasRef=useRef()
  const lastPos=useRef(null)
  const load=async([f])=>{setFile(f);setStatus('');try{const ab=await readAB(f);const d=await PDFDocument.load(ab);setTotalPages(d.getPageCount())}catch{}}
  const getPos=(e,c)=>{const r=c.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*(c.width/r.width),y:(t.clientY-r.top)*(c.height/r.height)}}
  const startDraw=e=>{setDrawing(true);lastPos.current=getPos(e,canvasRef.current)}
  const doDraw=e=>{
    if(!drawing)return;e.preventDefault()
    const c=canvasRef.current,ctx=c.getContext('2d'),pos=getPos(e,c)
    ctx.beginPath();ctx.moveTo(lastPos.current.x,lastPos.current.y);ctx.lineTo(pos.x,pos.y)
    ctx.strokeStyle='#06b6d4';ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke()
    lastPos.current=pos;setHasSig(true)
  }
  const stopDraw=()=>setDrawing(false)
  const clearSig=()=>{const c=canvasRef.current;c.getContext('2d').clearRect(0,0,c.width,c.height);setHasSig(false)}
  const sign=async()=>{
    if(!file||!hasSig)return;setBusy(true);setStatus('')
    try{
      const sigDataUrl=canvasRef.current.toDataURL('image/png')
      const ab=await readAB(file);const doc=await PDFDocument.load(ab)
      const sigImg=await doc.embedPng(await(await fetch(sigDataUrl)).arrayBuffer())
      const page=doc.getPages()[pageNum-1]
      const {width,height}=page.getSize()
      const sw=200,sh=80
      page.drawImage(sigImg,{x:width-sw-40,y:40,width:sw,height:sh,opacity:0.9})
      dlPDF(await doc.save(),'signed.pdf')
      setStatus('✓ Signature added!')
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">✍️ Sign PDF</h1>
        {!file?<Drop accept=".pdf" icon="📄" label="Upload PDF to sign" onFiles={load}/>:<>
          <Card className="mb-4"><p className="text-white/70 text-sm truncate">{file.name}</p>
            {totalPages>1&&<div className="mt-2 flex items-center gap-2"><span className="text-white/40 text-xs">Place on page:</span><input type="number" value={pageNum} onChange={e=>setPageNum(Math.min(totalPages,Math.max(1,parseInt(e.target.value)||1)))} min={1} max={totalPages} className="w-16 bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-white text-sm outline-none"/><span className="text-white/30 text-xs">of {totalPages}</span></div>}
          </Card>
          <Card className="mb-4">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Draw your signature</p>
            <canvas ref={canvasRef} width={360} height={140} className="w-full rounded-xl border border-white/10 bg-white/[0.03] cursor-crosshair touch-none"
              onMouseDown={startDraw} onMouseMove={doDraw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={doDraw} onTouchEnd={stopDraw}/>
            <button onClick={clearSig} className="text-white/30 hover:text-white text-xs mt-2">Clear</button>
          </Card>
        </>}
        <StatusMsg status={status}/>
        {file&&<Btn onClick={sign} disabled={busy||!hasSig} className="w-full mt-2">{busy?<Spin/>:'Sign & Download'}</Btn>}
      </div>
    </div>
  )
}

// ─── 13. Fill Form ────────────────────────────────────────────────────────────
function FillForm({onBack}){
  const [file,setFile]=useState(null)
  const [fields,setFields]=useState([])
  const [values,setValues]=useState({})
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const load=async([f])=>{
    setFile(f);setStatus('');setFields([]);setValues({})
    try{
      const ab=await readAB(f);const doc=await PDFDocument.load(ab)
      const form=doc.getForm();const fs=form.getFields()
      if(!fs.length)return setStatus('No fillable fields found in this PDF.')
      setFields(fs.map(f=>({name:f.getName(),type:f.constructor.name})))
      setValues(Object.fromEntries(fs.map(f=>[f.getName(),''])))
    }catch(e){setStatus('Error: '+e.message)}
  }
  const fill=async()=>{
    if(!file)return;setBusy(true);setStatus('')
    try{
      const ab=await readAB(file);const doc=await PDFDocument.load(ab)
      const form=doc.getForm()
      fields.forEach(({name,type})=>{
        if(!values[name])return
        try{if(type.includes('TextField'))form.getTextField(name).setText(values[name]);else if(type.includes('CheckBox')&&values[name]==='true')form.getCheckBox(name).check()}catch{}
      })
      form.flatten()
      dlPDF(await doc.save(),'filled.pdf')
      setStatus('✓ Form filled!')
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">📝 Fill Form</h1>
        {!file?<Drop accept=".pdf" icon="📄" label="Upload PDF with form fields" onFiles={load}/>:<>
          <Card className="mb-4"><p className="text-white/70 text-sm truncate">{file.name}</p></Card>
          {fields.length>0&&<Card className="mb-4 space-y-3 max-h-80 overflow-y-auto">
            {fields.map(({name,type})=><div key={name}><label className="text-white/50 text-xs block mb-1 truncate">{name}</label>
              {type.includes('CheckBox')?<select value={values[name]||''} onChange={e=>setValues(v=>({...v,[name]:e.target.value}))} className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none"><option value="">—</option><option value="true">Checked</option><option value="false">Unchecked</option></select>
              :<input value={values[name]||''} onChange={e=>setValues(v=>({...v,[name]:e.target.value}))} placeholder={name} className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/20 outline-none focus:border-cyan-500/50 text-sm"/>}
            </div>)}
          </Card>}
        </>}
        <StatusMsg status={status}/>
        {file&&fields.length>0&&<Btn onClick={fill} disabled={busy} className="w-full mt-2">{busy?<Spin/>:'Fill & Download'}</Btn>}
      </div>
    </div>
  )
}

// ─── 14. Scan Document ────────────────────────────────────────────────────────
function ScanDocument({onBack}){
  const [captures,setCaptures]=useState([])
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const [streaming,setStreaming]=useState(false)
  const videoRef=useRef();const canvasRef=useRef();const streamRef=useRef()
  const startCam=async()=>{
    try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});streamRef.current=s;videoRef.current.srcObject=s;videoRef.current.play();setStreaming(true)}
    catch{setStatus('Camera access denied.')}
  }
  const stopCam=()=>{streamRef.current?.getTracks().forEach(t=>t.stop());setStreaming(false)}
  const capture=()=>{
    const v=videoRef.current,c=canvasRef.current;c.width=v.videoWidth;c.height=v.videoHeight
    c.getContext('2d').drawImage(v,0,0);setCaptures(p=>[...p,c.toDataURL('image/jpeg',0.9)])
  }
  const createPDF=async()=>{
    if(!captures.length)return;setBusy(true);setStatus('')
    try{
      const doc=await PDFDocument.create()
      for(const url of captures){
        const ab=await(await fetch(url)).arrayBuffer();const img=await doc.embedJpg(ab)
        const {width,height}=img.scale(1);const page=doc.addPage([width,height])
        page.drawImage(img,{x:0,y:0,width,height})
      }
      dlPDF(await doc.save(),'scanned.pdf');setStatus(`✓ PDF created from ${captures.length} scan(s)!`)
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={()=>{stopCam();onBack()}}/>
        <h1 className="text-white font-black text-2xl mb-6">📱 Scan Document</h1>
        {!streaming?<Btn onClick={startCam} className="w-full mb-4">📷 Start Camera</Btn>:<>
          <video ref={videoRef} className="w-full rounded-xl mb-3" playsInline muted/>
          <div className="flex gap-2 mb-4"><Btn onClick={capture} className="flex-1">📸 Capture</Btn><Btn v="secondary" onClick={stopCam} className="flex-1">Stop</Btn></div>
        </>}
        <canvas ref={canvasRef} className="hidden"/>
        {captures.length>0&&<>
          <div className="grid grid-cols-3 gap-2 mb-4">{captures.map((c,i)=><div key={i} className="relative"><img src={c} className="w-full rounded-lg"/><button onClick={()=>setCaptures(cs=>cs.filter((_,j)=>j!==i))} className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button></div>)}</div>
          <Btn onClick={createPDF} disabled={busy} className="w-full mb-2">{busy?<Spin/>:`Create PDF (${captures.length} page${captures.length!==1?'s':''})`}</Btn>
        </>}
        <StatusMsg status={status}/>
      </div>
    </div>
  )
}

// ─── 15. HEIC to JPG ─────────────────────────────────────────────────────────
function HeicToJpg({onBack}){
  const [files,setFiles]=useState([])
  const [results,setResults]=useState([])
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const convert=async()=>{
    if(!files.length)return;setBusy(true);setStatus('');setResults([])
    const out=[]
    for(const f of files){
      setStatus(`Converting ${f.name}…`)
      try{
        const raw=await heic2any({blob:f,toType:'image/jpeg',quality:0.92})
        const blob=Array.isArray(raw)?raw[0]:raw
        out.push({name:f.name.replace(/\.heic$/i,'.jpg'),blob,orig:f.size,comp:blob.size})
      }catch(e){out.push({name:f.name,error:e.message})}
    }
    setResults(out);setStatus(`✓ Converted ${out.filter(r=>!r.error).length} of ${files.length} file(s)!`);setBusy(false)
  }
  const dl=r=>dlBlob(r.blob,r.name)
  const dlAll=()=>results.filter(r=>!r.error).forEach((r,i)=>setTimeout(()=>dl(r),i*200))
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-6">🍎 HEIC → JPG</h1>
        <p className="text-white/40 text-xs mb-4">Converts iPhone HEIC photos to standard JPG format.</p>
        <Drop accept=".heic,.heif,image/heic,image/heif" multiple icon="📷" label="Upload HEIC / HEIF photos" onFiles={fs=>setFiles(p=>[...p,...fs])}/>
        {files.length>0&&<div className="mt-3 space-y-1 mb-4">{files.map((f,i)=><div key={i} className="flex items-center gap-2 text-sm"><span className="text-white/70 flex-1 truncate">{f.name}</span><span className="text-white/30">{fmtSize(f.size)}</span><button onClick={()=>setFiles(f=>f.filter((_,j)=>j!==i))} className="text-white/30 hover:text-red-400">×</button></div>)}</div>}
        {results.length>0&&<div className="mb-3 space-y-1">{results.map((r,i)=>(
          <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${r.error?'bg-red-500/10 text-red-400':'bg-emerald-500/10 text-emerald-400'}`}>
            <span className="flex-1 truncate">{r.name}</span>
            {r.error?<span>Error: {r.error}</span>:<><span>{fmtSize(r.comp)}</span><button onClick={()=>dl(r)} className="underline">Save</button></>}
          </div>
        ))}</div>}
        <StatusMsg status={status}/>
        {files.length>0&&!results.length&&<Btn onClick={convert} disabled={busy} className="w-full mt-3">{busy?<Spin/>:`Convert ${files.length} file(s)`}</Btn>}
        {results.length>0&&<Btn onClick={dlAll} className="w-full mt-3">⬇ Download All JPGs</Btn>}
      </div>
    </div>
  )
}

// ─── 16. Remove Background ───────────────────────────────────────────────────
function RemoveBg({onBack}){
  const [file,setFile]=useState(null)
  const [preview,setPreview]=useState(null)
  const [resultBlob,setResultBlob]=useState(null)
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const load=([f])=>{setFile(f);setResultBlob(null);setStatus('');const u=URL.createObjectURL(f);setPreview(u)}
  const process=async()=>{
    if(!file)return;setBusy(true);setStatus('Loading AI model… (first run may take ~30s)')
    try{
      const {removeBackground}=await import('@imgly/background-removal')
      setStatus('Removing background…')
      const blob=await removeBackground(file,{output:{format:'image/png',quality:0.9}})
      setResultBlob(blob);setStatus('✓ Background removed!')
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }
  const dl=()=>{if(resultBlob)dlBlob(resultBlob,file.name.replace(/\.[^.]+$/,'-nobg.png'))}
  return(
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-md">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-2">✂️ Remove Background</h1>
        <p className="text-white/40 text-xs mb-4">AI-powered, runs entirely in your browser. Outputs transparent PNG.</p>
        {!file?<Drop accept="image/*" icon="🖼️" label="Upload image (JPG, PNG, WebP…)" onFiles={load}/>:<>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><p className="text-white/30 text-xs mb-1 text-center">Original</p><img src={preview} className="w-full rounded-xl border border-white/10"/></div>
            <div><p className="text-white/30 text-xs mb-1 text-center">Result</p>
              {resultBlob
                ?<img src={URL.createObjectURL(resultBlob)} className="w-full rounded-xl border border-white/10" style={{background:'repeating-conic-gradient(#aaa 0% 25%,#eee 0% 50%) 0 0/16px 16px'}}/>
                :<div className="w-full rounded-xl border border-white/10 bg-white/[0.03] aspect-square flex items-center justify-center text-white/20 text-sm">Preview</div>}
            </div>
          </div>
          <Btn v="secondary" onClick={()=>{setFile(null);setPreview(null);setResultBlob(null);setStatus('')}} className="w-full mb-2" size="sm">Choose Different Image</Btn>
        </>}
        <StatusMsg status={status}/>
        {file&&!resultBlob&&<Btn onClick={process} disabled={busy} className="w-full mt-3">{busy?<Spin/>:'Remove Background'}</Btn>}
        {resultBlob&&<Btn onClick={dl} v="success" className="w-full mt-3">⬇ Download PNG</Btn>}
      </div>
    </div>
  )
}

// ─── 17. PDF Editor ──────────────────────────────────────────────────────────
const EDIT_SCALE = 1.5
function PDFEditor({onBack}){
  const [file,setFile]=useState(null)
  const [pdfjsDoc,setPdfjsDoc]=useState(null)
  const [pageCount,setPageCount]=useState(0)
  const [curPage,setCurPage]=useState(1)
  const [tool,setTool]=useState('pen')
  const [color,setColor]=useState('#ef4444')
  const [sw,setSw]=useState(3)
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const annotRef=useRef({})
  const bgRef=useRef()
  const fgRef=useRef()
  const drawRef=useRef(false)
  const lastRef=useRef(null)

  const load=async([f])=>{
    setBusy(true);setStatus('Loading…')
    const ab=await readAB(f)
    const lib=await getPDFJS()
    const doc=await lib.getDocument({data:new Uint8Array(ab)}).promise
    annotRef.current={}
    setPdfjsDoc(doc);setPageCount(doc.numPages);setFile(f);setCurPage(1);setStatus('');setBusy(false)
  }

  useEffect(()=>{
    if(!pdfjsDoc)return
    ;(async()=>{
      const page=await pdfjsDoc.getPage(curPage)
      const vp=page.getViewport({scale:EDIT_SCALE})
      const bg=bgRef.current,fg=fgRef.current
      if(!bg||!fg)return
      bg.width=fg.width=vp.width
      bg.height=fg.height=vp.height
      await page.render({canvasContext:bg.getContext('2d'),viewport:vp}).promise
      const ctx=fg.getContext('2d')
      ctx.clearRect(0,0,fg.width,fg.height)
      const url=annotRef.current[curPage]
      if(url)await new Promise(res=>{const img=new Image();img.onload=()=>{ctx.drawImage(img,0,0);res()};img.src=url})
    })()
  },[pdfjsDoc,curPage])

  const saveCurAnnot=()=>{const fg=fgRef.current;if(fg)annotRef.current[curPage]=fg.toDataURL()}
  const goPage=n=>{saveCurAnnot();setCurPage(n)}

  const getPos=e=>{
    const c=fgRef.current,r=c.getBoundingClientRect(),t=e.touches?.[0]??e
    return{x:(t.clientX-r.left)*(c.width/r.width),y:(t.clientY-r.top)*(c.height/r.height)}
  }

  const onDown=e=>{
    e.preventDefault()
    if(tool==='text'){
      const pos=getPos(e)
      const txt=prompt('Enter text:')
      if(!txt)return
      const ctx=fgRef.current.getContext('2d')
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1
      ctx.font=`bold ${sw*6}px Arial`;ctx.fillStyle=color
      ctx.fillText(txt,pos.x,pos.y)
      return
    }
    drawRef.current=true;lastRef.current=getPos(e)
  }

  const onMove=e=>{
    if(!drawRef.current)return;e.preventDefault()
    const pos=getPos(e)
    const ctx=fgRef.current.getContext('2d')
    ctx.lineCap='round';ctx.lineJoin='round'
    if(tool==='pen'){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.strokeStyle=color;ctx.lineWidth=sw}
    else if(tool==='highlight'){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=0.3;ctx.strokeStyle=color;ctx.lineWidth=sw*8;ctx.lineCap='square'}
    else if(tool==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=1;ctx.lineWidth=sw*10}
    ctx.beginPath();ctx.moveTo(lastRef.current.x,lastRef.current.y);ctx.lineTo(pos.x,pos.y);ctx.stroke()
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1
    lastRef.current=pos
  }

  const onUp=()=>{drawRef.current=false}

  const clearPage=()=>{
    const fg=fgRef.current;fg.getContext('2d').clearRect(0,0,fg.width,fg.height)
    delete annotRef.current[curPage]
  }

  const savePDF=async()=>{
    if(!pdfjsDoc)return;saveCurAnnot()
    setBusy(true);setStatus('Generating PDF…')
    try{
      const doc=await PDFDocument.create()
      for(let i=1;i<=pageCount;i++){
        setStatus(`Page ${i} / ${pageCount}…`)
        const page=await pdfjsDoc.getPage(i)
        const vp1=page.getViewport({scale:1})
        const vp2=page.getViewport({scale:2})
        const c=document.createElement('canvas');c.width=vp2.width;c.height=vp2.height
        await page.render({canvasContext:c.getContext('2d'),viewport:vp2}).promise
        const url=annotRef.current[i]
        if(url)await new Promise(res=>{const img=new Image();img.onload=()=>{c.getContext('2d').drawImage(img,0,0,c.width,c.height);res()};img.src=url})
        const jpgAB=await(await fetch(c.toDataURL('image/jpeg',0.92))).arrayBuffer()
        const embImg=await doc.embedJpg(jpgAB)
        const pdfPage=doc.addPage([vp1.width,vp1.height])
        pdfPage.drawImage(embImg,{x:0,y:0,width:vp1.width,height:vp1.height})
      }
      dlPDF(await doc.save(),file.name.replace(/\.pdf$/i,'-edited.pdf'))
      setStatus('✓ Downloaded!')
    }catch(e){setStatus('Error: '+e.message)}
    setBusy(false)
  }

  const COLORS=['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#000000','#ffffff']
  const TOOL_LIST=[{id:'pen',icon:'✏️',label:'Pen'},{id:'highlight',icon:'🖊️',label:'Highlight'},{id:'eraser',icon:'⚪',label:'Eraser'},{id:'text',icon:'T',label:'Text'}]

  return(
    <div className="min-h-screen flex flex-col items-center py-6 px-4"><Bg/>
      <div className="w-full max-w-2xl">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-2xl mb-4">📝 PDF Editor</h1>
        {!file?(
          <><Drop accept=".pdf" icon="📄" label="Upload PDF to edit" onFiles={load}/><StatusMsg status={status}/>{busy&&<div className="text-center mt-3"><Spin/></div>}</>
        ):(
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-3 p-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl">
              <div className="flex gap-1">
                {TOOL_LIST.map(t=>(
                  <button key={t.id} onClick={()=>setTool(t.id)} title={t.label}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${tool===t.id?'bg-gradient-to-r from-cyan-500 to-purple-500 text-white':'bg-white/[0.07] text-white/60 hover:bg-white/[0.14]'}`}>
                    {t.icon}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-white/10"/>
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map(c=>(
                  <button key={c} onClick={()=>setColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${color===c?'ring-2 ring-white scale-110':''}`}
                    style={{background:c,border:c==='#ffffff'?'1px solid rgba(255,255,255,0.3)':'none'}}/>
                ))}
              </div>
              <div className="w-px h-6 bg-white/10"/>
              <div className="flex items-center gap-1.5">
                <span className="text-white/30 text-xs">Size</span>
                <input type="range" min={1} max={12} value={sw} onChange={e=>setSw(+e.target.value)} className="w-20 accent-cyan-500"/>
              </div>
              <div className="flex-1"/>
              <button onClick={clearPage} className="text-white/30 hover:text-red-400 text-xs transition-colors">Clear page</button>
            </div>

            {/* Page nav */}
            {pageCount>1&&(
              <div className="flex items-center justify-center gap-3 mb-3">
                <button onClick={()=>curPage>1&&goPage(curPage-1)} disabled={curPage===1} className="text-white/40 hover:text-white disabled:opacity-20 text-xl px-2">‹</button>
                <span className="text-white/50 text-sm">Page {curPage} / {pageCount}</span>
                <button onClick={()=>curPage<pageCount&&goPage(curPage+1)} disabled={curPage===pageCount} className="text-white/40 hover:text-white disabled:opacity-20 text-xl px-2">›</button>
              </div>
            )}

            {/* Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-white/10 mb-4 bg-white" style={{touchAction:'none'}}>
              <canvas ref={bgRef} className="w-full block"/>
              <canvas ref={fgRef} className="absolute inset-0 w-full h-full"
                style={{cursor:tool==='eraser'?'cell':tool==='text'?'text':'crosshair'}}
                onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}/>
            </div>

            <StatusMsg status={status}/>
            <div className="flex gap-2 mt-3">
              <Btn v="secondary" onClick={()=>{setFile(null);setPdfjsDoc(null);annotRef.current={}}} className="flex-1" size="sm">← New File</Btn>
              <Btn onClick={savePDF} disabled={busy} className="flex-1">{busy?<Spin/>:'💾 Save & Download'}</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── PDF Tools Hub ────────────────────────────────────────────────────────────
const TOOLS = [
  { id:'merge',         icon:'📎', label:'Merge PDFs',       sub:'Combine multiple files',   comp:MergePDF },
  { id:'split',         icon:'✂️', label:'Split PDF',        sub:'Extract pages',            comp:SplitPDF },
  { id:'organize',      icon:'🗂️', label:'Organize Pages',   sub:'Reorder or delete pages',  comp:OrganizePDF },
  { id:'compress',      icon:'🗜️', label:'Compress PDF',     sub:'Reduce file size',         comp:CompressPDF },
  { id:'pdf-to-image',  icon:'🖼️', label:'PDF → Images',    sub:'Export pages as JPG',      comp:PDFToImage },
  { id:'image-compress',icon:'📷', label:'Compress Images',  sub:'Reduce image size',        comp:ImageCompress },
  { id:'image-to-pdf',  icon:'📄', label:'Images → PDF',    sub:'Create PDF from images',   comp:ImageToPDF },
  { id:'page-number',   icon:'🔢', label:'Page Numbers',     sub:'Add page numbers',         comp:PageNumbers },
  { id:'watermark',     icon:'💧', label:'Watermark',        sub:'Add text watermark',       comp:Watermark },
  { id:'crop',          icon:'⬛', label:'Crop PDF',         sub:'Trim page margins',        comp:CropPDF },
  { id:'protect',       icon:'🔒', label:'Password Protect', sub:'Encrypt with password',    comp:ProtectPDF },
  { id:'sign',          icon:'✍️', label:'Sign PDF',         sub:'Draw & embed signature',   comp:SignPDF },
  { id:'form',          icon:'📝', label:'Fill Form',        sub:'Fill PDF form fields',     comp:FillForm },
  { id:'scan',          icon:'📱', label:'Scan Document',    sub:'Camera to PDF',            comp:ScanDocument },
  { id:'heic-to-jpg',  icon:'🍎', label:'HEIC → JPG',       sub:'Convert iPhone photos',    comp:HeicToJpg },
  { id:'remove-bg',    icon:'✂️', label:'Remove Background', sub:'AI transparent PNG',       comp:RemoveBg },
  { id:'pdf-editor',   icon:'📝', label:'PDF Editor',        sub:'Draw, highlight & annotate', comp:PDFEditor },
]

export default function PDFToolsScreen({ onBack }) {
  const [tool, setTool] = useState(null)
  const ActiveTool = tool ? TOOLS.find(t=>t.id===tool)?.comp : null
  if (ActiveTool) return <ActiveTool onBack={()=>setTool(null)}/>
  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4"><Bg/>
      <div className="w-full max-w-2xl">
        <Back onBack={onBack}/>
        <h1 className="text-white font-black text-3xl text-center mb-1">🗂️ PDF Tools</h1>
        <p className="text-white/40 text-sm text-center mb-8">All tools run in your browser — files never leave your device</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TOOLS.map(t=>(
            <button key={t.id} onClick={()=>setTool(t.id)}
              className="group flex flex-col items-start gap-1.5 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-left">
              <span className="text-3xl">{t.icon}</span>
              <span className="text-white font-semibold text-sm">{t.label}</span>
              <span className="text-white/40 text-xs">{t.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

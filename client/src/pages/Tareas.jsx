import { useState, useEffect, useCallback, Fragment } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import InlineDropdown from '../components/InlineDropdown'

// ── Design tokens (Figma) ──────────────────────────────────────────────────
const SANS  = "'Instrument Sans', sans-serif"
const SERIF = "'Fraunces', serif"
const MONO  = "'DM Mono', monospace"
const INK   = '#0a0a0a'
const T2    = '#3a3a3a'
const T3    = '#6b6b6b'

// ── Constants ──────────────────────────────────────────────────────────────
const PAIS_OPTIONS    = ['Todos','General','Argentina','Bolivia','Chile','Ecuador','Paraguay','Peru','Uruguay']
const BOARD_PRIORITIES = ['Urgente','Alta','Firmando','Baja','Solo documentación']

const FIELD_OPTIONS = {
  prioridad:             ['Urgente','Alta','Firmando','Baja','Hecho','Solo documentación'],
  libreria_intranet:     ['Pendiente','Hecho'],
  documentacion_inicial: ['Pendiente','En curso','✅ Finalizado'],
  finalizado:            ['SÍ','NO'],
}

const PRIORITY_ORDER = { 'Urgente':0,'Alta':1,'Firmando':1.5,'Baja':2,'Solo documentación':2.5,'Hecho':3,'':4 }

const ACCENT_MAP = {
  'Urgente':            { color:'#ff3d3d', tag:'#ffe0e0', dim:'rgba(255,61,61,0.08)',    sublabel:'Atención inmediata' },
  'Alta':               { color:'#ff8c00', tag:'#fff0d6', dim:'rgba(255,140,0,0.08)',    sublabel:'Prioridad elevada'  },
  'Firmando':           { color:'#7b2fff', tag:'#ede9ff', dim:'rgba(123,47,255,0.08)',   sublabel:'Pendiente de firma' },
  'Baja':               { color:'#00c271', tag:'#d6f5e8', dim:'rgba(0,194,113,0.08)',    sublabel:'Sin urgencia'       },
  'Solo documentación': { color:'#8a8a8a', tag:'#f0f0f0', dim:'rgba(138,138,138,0.06)', sublabel:'Solo trámites'      },
}

const COUNTRY_PALETTE = {
  argentina: '#1d4ed8',
  bolivia:   '#15803d',
  chile:     '#b91c1c',
  ecuador:   '#a16207',
  paraguay:  '#6d28d9',
  peru:      '#9f1239',
  uruguay:   '#0e7490',
  general:   '#374151',
  colombia:  '#c2410c',
  venezuela: '#854d0e',
}

const PAIS_CREATE = ['','General','Argentina','Bolivia','Chile','Ecuador','Paraguay','Peru','Uruguay','Colombia','Venezuela']

// ── Helpers ────────────────────────────────────────────────────────────────
function isFullyCompleted(task) {
  return task.prioridad==='Hecho' && task.libreria_intranet==='Hecho' &&
         task.documentacion_inicial==='✅ Finalizado' && task.finalizado==='SÍ'
}

function groupTasks(tasks) {
  const groups = {}, ungrouped = []
  for (const t of tasks) {
    if (t.grupo) { groups[t.grupo] = groups[t.grupo]||[]; groups[t.grupo].push(t) }
    else ungrouped.push(t)
  }
  return { groups, ungrouped }
}

function toSheetsDate(iso) {
  if (!iso) return ''
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function toInputDate(sheets) {
  if (!sheets) return ''
  const p = sheets.split('/')
  if (p.length===3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`
  return ''
}

// ── Badges ─────────────────────────────────────────────────────────────────
function DelayBadge({ dias }) {
  if (dias===null||dias===undefined) return <span style={{ color:T3, fontFamily:MONO, fontSize:9 }}>—</span>
  if (dias<=0) return (
    <span style={{ fontSize:9, fontFamily:MONO, fontWeight:600, color:'#065f46', background:'#d6f5e8', border:`1px solid ${INK}`, padding:'2px 7px' }}>En fecha</span>
  )
  const isLate = dias>30, isNear = dias<=5
  const bg    = isLate ? '#ff3d3d' : isNear ? '#ff8c00' : '#f0f0f0'
  const color = isLate||isNear ? '#fff' : T2
  return (
    <span style={{ fontSize:10, fontFamily:MONO, fontWeight:600, color, background:bg, border:`1px solid ${INK}`, padding:'2px 7px' }}>
      {dias}d
    </span>
  )
}

function CountryBadge({ pais }) {
  if (!pais||pais==='—') return <span style={{ color:T3, fontFamily:MONO, fontSize:9 }}>—</span>
  const bg = COUNTRY_PALETTE[pais.toLowerCase()] || T2
  return (
    <span style={{ fontSize:9, fontFamily:MONO, fontWeight:700, color:'#fff', background:bg, border:`1.5px solid ${INK}`, boxShadow:`1.5px 1.5px 0 ${INK}`, padding:'2px 8px', letterSpacing:0.5, textTransform:'uppercase', flexShrink:0 }}>
      {pais}
    </span>
  )
}

function LinkCell({ url, title, icon }) {
  if (!url) return <span style={{ color:'#ddd', fontSize:12 }}>—</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={title}
       style={{ color:T3, textDecoration:'none', fontSize:14 }}>{icon}</a>
  )
}

// ── Modals ─────────────────────────────────────────────────────────────────
function ModalShell({ children, maxWidth=360, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 }}
         onClick={onClose}>
      <div style={{ background:'#fffdf9', border:`1.5px solid ${INK}`, boxShadow:`6px 6px 0 ${INK}`, width:'100%', maxWidth, padding:24, fontFamily:SANS, maxHeight:'90vh', overflowY:'auto' }}
           onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function NbBtn({ onClick, disabled, children, style={} }) {
  return (
    <button onClick={onClick} disabled={disabled} className="nb-btn"
      style={{ fontFamily:SANS, cursor:'pointer', ...style }}>
      {children}
    </button>
  )
}

function ConfirmModal({ task, onConfirm, onCancel }) {
  return (
    <ModalShell onClose={onCancel}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:28, marginBottom:12 }}>✅</div>
        <h3 style={{ margin:'0 0 8px', fontSize:15, fontWeight:700, color:INK }}>Tarea completada</h3>
        <p style={{ margin:'0 0 6px', fontSize:13, color:T3 }}>Todos los campos están finalizados.</p>
        <p style={{ margin:'0 0 6px', fontSize:13, fontWeight:600, color:INK }}>"{task.tarea}"</p>
        <p style={{ margin:'0 0 20px', fontSize:13, color:T3 }}>¿Mover a <strong>Finalizados</strong>?</p>
        <div style={{ display:'flex', gap:10 }}>
          <NbBtn onClick={onCancel} style={{ flex:1, padding:'8px 0', background:'#fffdf9', color:INK, fontSize:12 }}>Dejar aquí</NbBtn>
          <NbBtn onClick={onConfirm} style={{ flex:1, padding:'8px 0', background:'#00c271', color:'#fff', fontSize:12 }}>Mover a Finalizados</NbBtn>
        </div>
      </div>
    </ModalShell>
  )
}

function ReopenModal({ task, onConfirm, onCancel }) {
  return (
    <ModalShell onClose={onCancel}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:28, marginBottom:12 }}>🔄</div>
        <h3 style={{ margin:'0 0 8px', fontSize:15, fontWeight:700, color:INK }}>Reabrir tarea</h3>
        <p style={{ margin:'0 0 8px', fontSize:13, color:T3 }}>La tarea volverá a la lista de pendientes.</p>
        <p style={{ margin:'0 0 20px', fontSize:13, fontWeight:600, color:INK }}>"{task.tarea}"</p>
        <div style={{ display:'flex', gap:10 }}>
          <NbBtn onClick={onCancel} style={{ flex:1, padding:'8px 0', background:'#fffdf9', color:INK, fontSize:12 }}>Cancelar</NbBtn>
          <NbBtn onClick={onConfirm} style={{ flex:1, padding:'8px 0', background:INK, color:'#fffdf9', fontSize:12 }}>Mover a Pendientes</NbBtn>
        </div>
      </div>
    </ModalShell>
  )
}

function NombreGrupoModal({ taskA, taskB, onConfirm, onCancel }) {
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const truncate = (s,n) => s.length>n ? s.substring(0,n)+'…' : s

  async function handleConfirm() {
    if (!nombre.trim()) return
    setSaving(true)
    await onConfirm(nombre.trim())
  }
  return (
    <ModalShell onClose={onCancel}>
      <h3 style={{ margin:'0 0 6px', fontSize:15, fontWeight:700, color:INK }}>Nombre del grupo</h3>
      <p style={{ margin:'0 0 14px', fontSize:11, color:T3 }}>
        Agrupa "{truncate(taskA.tarea,35)}" y "{truncate(taskB.tarea,35)}"
      </p>
      <input autoFocus type="text" value={nombre}
        onChange={e=>setNombre(e.target.value)}
        onKeyDown={e=>e.key==='Enter'&&nombre.trim()&&!saving&&handleConfirm()}
        placeholder="Ej: Onboarding Ecuador"
        style={{ width:'100%', border:`1.5px solid ${INK}`, boxShadow:`2px 2px 0 ${INK}`, padding:'8px 12px', fontSize:13, fontFamily:SANS, background:'#fff', outline:'none', boxSizing:'border-box', marginBottom:16 }} />
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
        <button onClick={onCancel} style={{ fontSize:12, color:T3, background:'none', border:'none', cursor:'pointer', fontFamily:SANS }}>Cancelar</button>
        <NbBtn onClick={handleConfirm} disabled={!nombre.trim()||saving}
          style={{ padding:'6px 20px', background:INK, color:'#fffdf9', fontSize:12, opacity:(!nombre.trim()||saving)?0.5:1 }}>
          {saving?'Creando...':'Crear grupo'}
        </NbBtn>
      </div>
    </ModalShell>
  )
}

function TaskDetailModal({ task, isFinalizados, onClose, onFieldChange, onComplete, onDelete, onEdit, onReopen }) {
  const { color: accent } = ACCENT_MAP[task.prioridad]||{ color:T3 }
  const isCompleted = isFullyCompleted(task)
  const hasLinks = task.mail||task.mail2||task.documento
  const [notas, setNotas] = useState(task.notas||'')
  const [notasSaving, setNotasSaving] = useState(false)
  const [notasSaved, setNotasSaved] = useState(false)
  const [comentarios, setComentarios] = useState([])
  const [comentariosLoading, setComentariosLoading] = useState(false)
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [savingComentario, setSavingComentario] = useState(false)

  useEffect(() => {
    setComentariosLoading(true)
    fetch(`/api/tareas/${task.rowIndex}/comentarios`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setComentarios(data) })
      .catch(() => {})
      .finally(() => setComentariosLoading(false))
  }, [task.rowIndex])

  async function handleAddComentario() {
    if (!nuevoComentario.trim() || savingComentario) return
    setSavingComentario(true)
    try {
      const res = await fetch(`/api/tareas/${task.rowIndex}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentario: nuevoComentario.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setComentarios(prev => [...prev, data])
      setNuevoComentario('')
    } catch {}
    finally { setSavingComentario(false) }
  }

  async function handleSaveNotas() {
    if (notas === (task.notas||'')) return
    setNotasSaving(true)
    try {
      await onFieldChange(task, 'notas', notas)
      setNotasSaved(true)
      setTimeout(()=>setNotasSaved(false), 2000)
    } finally {
      setNotasSaving(false)
    }
  }

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}
      style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 }}
      onClick={onClose}>
      <motion.div initial={{opacity:0,y:16,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.98}}
        transition={{duration:0.2,ease:[0.4,0,0.2,1]}}
        style={{ width:'100%', maxWidth:460, background:'#fffdf9', border:`1.5px solid ${INK}`, boxShadow:`6px 6px 0 ${INK}`, overflow:'hidden', borderTop:`4px solid ${accent}`, fontFamily:SANS }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'18px 20px 14px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:700, lineHeight:1.4, color:INK, flex:1 }}>{task.tarea}</p>
            <button onClick={onClose} style={{ color:T3, fontSize:20, lineHeight:1, background:'none', border:'none', cursor:'pointer', flexShrink:0, marginTop:-2 }}>×</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, flexWrap:'wrap' }}>
            <CountryBadge pais={task.pais}  />
            <DelayBadge dias={task.dias_retraso} />
            {task.fecha_mail && <span style={{ fontSize:10, fontFamily:MONO, color:T3 }}>{task.fecha_mail}</span>}
          </div>
        </div>
        <div style={{ borderTop:`1px solid rgba(10,10,10,0.08)`, borderBottom:`1px solid rgba(10,10,10,0.08)`, padding:'12px 20px', display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { label:'Prioridad',      field:'prioridad',             opts:FIELD_OPTIONS.prioridad },
            { label:'Lib. Intranet',  field:'libreria_intranet',     opts:FIELD_OPTIONS.libreria_intranet },
            { label:'Documentación',  field:'documentacion_inicial', opts:FIELD_OPTIONS.documentacion_inicial },
            { label:'Finalizado',     field:'finalizado',            opts:FIELD_OPTIONS.finalizado },
          ].map(({ label, field, opts }) => (
            <div key={field} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <span style={{ fontSize:11, color:T3, fontWeight:600, minWidth:90 }}>{label}</span>
              {isFinalizados
                ? <span style={{ fontSize:11, color:T2, fontWeight:600 }}>{task[field]}</span>
                : <InlineDropdown value={task[field]} options={opts} onSave={v=>onFieldChange(task,field,v)} />
              }
            </div>
          ))}
        </div>
        {hasLinks && (
          <div style={{ padding:'10px 20px', display:'flex', gap:12, borderBottom:`1px solid rgba(10,10,10,0.08)` }}>
            <LinkCell url={task.mail}      title="Mail"          icon="✉️" />
            <LinkCell url={task.mail2}     title="Carpeta Drive" icon="📁" />
            <LinkCell url={task.documento} title="Documento"     icon="📄" />
          </div>
        )}
        {/* Notas */}
        <div style={{ padding:'12px 20px', borderBottom:`1px solid rgba(10,10,10,0.08)` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:10, fontFamily:MONO, color:T3, letterSpacing:0.8, textTransform:'uppercase' }}>Notas</span>
            {notas !== (task.notas||'') && (
              <button onClick={handleSaveNotas} disabled={notasSaving}
                style={{ fontSize:10, fontFamily:SANS, fontWeight:600, color:'#fff', background:accent, border:`1px solid ${INK}`, boxShadow:`1px 1px 0 ${INK}`, padding:'2px 10px', cursor:'pointer', opacity:notasSaving?0.6:1 }}>
                {notasSaving ? 'Guardando…' : 'Guardar'}
              </button>
            )}
            {notasSaved && <span style={{ fontSize:10, fontFamily:MONO, color:'#00c271' }}>✓ Guardado</span>}
          </div>
          <textarea
            value={notas}
            onChange={e=>setNotas(e.target.value)}
            onBlur={handleSaveNotas}
            disabled={isFinalizados}
            placeholder={isFinalizados ? 'Sin notas' : 'Agregá anotaciones, comentarios, seguimiento…'}
            rows={3}
            style={{
              width:'100%', boxSizing:'border-box', resize:'vertical',
              border:`1.5px solid ${INK}`, boxShadow:`2px 2px 0 ${INK}`,
              padding:'8px 10px', fontSize:12, fontFamily:SANS, fontWeight:500,
              background: isFinalizados ? '#f8f8f8' : '#fff',
              color:INK, outline:'none', lineHeight:1.5,
              opacity: isFinalizados ? 0.7 : 1,
            }}
          />
        </div>

        {/* Bitácora */}
        <div style={{ padding:'12px 20px', borderBottom:`1px solid rgba(10,10,10,0.08)` }}>
          <span style={{ fontSize:10, fontFamily:MONO, color:T3, letterSpacing:0.8, textTransform:'uppercase' }}>Bitácora</span>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4, maxHeight:150, overflowY:'auto' }}>
            {comentariosLoading ? (
              <span style={{ fontSize:11, color:T3 }}>Cargando…</span>
            ) : comentarios.length === 0 ? (
              <span style={{ fontSize:11, color:T3 }}>Sin entradas aún</span>
            ) : comentarios.map(c => (
              <div key={c.id} style={{ background:'#f8f8f8', border:`1px solid rgba(10,10,10,0.1)`, padding:'6px 10px' }}>
                <div style={{ fontSize:9, fontFamily:MONO, color:T3, marginBottom:3 }}>
                  {new Date(c.fecha_hora).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                </div>
                <div style={{ fontSize:12, color:INK, lineHeight:1.4 }}>{c.comentario}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, marginTop:8 }}>
            <input
              type="text"
              value={nuevoComentario}
              onChange={e => setNuevoComentario(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComentario()}
              placeholder="Nueva entrada…"
              style={{ flex:1, border:`1.5px solid ${INK}`, padding:'6px 10px', fontSize:12, fontFamily:SANS, background:'#fff', outline:'none' }}
            />
            <button onClick={handleAddComentario}
              disabled={!nuevoComentario.trim() || savingComentario}
              style={{ fontSize:11, fontWeight:600, fontFamily:SANS, color:'#fff', background:accent, border:`1px solid ${INK}`, boxShadow:`1px 1px 0 ${INK}`, padding:'0 12px', cursor:'pointer', opacity:(!nuevoComentario.trim()||savingComentario)?0.5:1 }}>
              {savingComentario ? '…' : '+ Agregar'}
            </button>
          </div>
        </div>

        <div style={{ padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <button onClick={()=>{onDelete(task);onClose()}}
            style={{ fontSize:11, color:'#ff3d3d', background:'none', border:'none', cursor:'pointer', fontWeight:500, fontFamily:SANS }}>
            Eliminar
          </button>
          <div style={{ display:'flex', gap:8 }}>
            {isFinalizados && (
              <NbBtn onClick={()=>{onReopen(task);onClose()}} style={{ fontSize:11, padding:'5px 12px', background:'#fffdf9', color:INK }}>Reabrir →</NbBtn>
            )}
            {!isFinalizados && isCompleted && (
              <NbBtn onClick={()=>{onComplete(task);onClose()}} style={{ fontSize:11, padding:'5px 12px', background:'#00c271', color:'#fff' }}>Archivar →</NbBtn>
            )}
            <NbBtn onClick={()=>{onEdit(task);onClose()}} style={{ fontSize:11, padding:'5px 14px', background:INK, color:'#fffdf9' }}>Editar</NbBtn>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function TareaFormModal({ title, initial={}, onClose, onSave }) {
  const [tarea,setPrioridad_]=[useState(initial.tarea||'')]
  // local aliases
  const [tareaV,setTarea]         = useState(initial.tarea||'')
  const [pais,setPais]            = useState(initial.pais||'')
  const [prioridad,setPrioridad]  = useState(initial.prioridad||'Alta')
  const [fecha,setFecha]          = useState(toInputDate(initial.fecha_mail))
  const [mail,setMail]            = useState(initial.mail||'')
  const [mail2,setMail2]          = useState(initial.mail2||'')
  const [documento,setDocumento]  = useState(initial.documento||'')
  const [grupo,setGrupo]          = useState(initial.grupo||'')
  const [saving,setSaving]        = useState(false)
  const [error,setError]          = useState('')

  async function handleSave() {
    if (!tareaV.trim()) { setError('La tarea es requerida'); return }
    setSaving(true); setError('')
    try {
      await onSave({ tarea:tareaV.trim(), pais, prioridad, fecha_mail:toSheetsDate(fecha), mail:mail.trim(), mail2:mail2.trim(), documento:documento.trim(), grupo:grupo.trim() })
    } catch(err) { setError(err.message); setSaving(false) }
  }

  const inputStyle = { width:'100%', border:`1.5px solid ${INK}`, padding:'7px 10px', fontSize:12, fontFamily:SANS, background:'#fff', outline:'none', boxSizing:'border-box' }
  const labelStyle = { display:'block', fontSize:10, fontWeight:600, color:T3, marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }

  return (
    <ModalShell maxWidth={440} onClose={onClose}>
      <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:INK }}>{title}</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div>
          <label style={labelStyle}>Tarea *</label>
          <textarea autoFocus value={tareaV} onChange={e=>setTarea(e.target.value)} rows={2}
            placeholder="Descripción de la tarea..."
            style={{ ...inputStyle, resize:'none' }} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={labelStyle}>Prioridad</label>
            <select value={prioridad} onChange={e=>setPrioridad(e.target.value)} style={inputStyle}>
              {['Urgente','Alta','Firmando','Baja','Hecho','Solo documentación'].map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>País</label>
            <select value={pais} onChange={e=>setPais(e.target.value)} style={inputStyle}>
              {PAIS_CREATE.map(p=><option key={p} value={p}>{p||'—'}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Fecha</label>
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Grupo</label>
          <input type="text" value={grupo} onChange={e=>setGrupo(e.target.value)} placeholder="Nombre del grupo (opcional)" style={inputStyle} />
        </div>
        <div style={{ borderTop:`1.5px solid ${INK}`, paddingTop:12, display:'flex', flexDirection:'column', gap:10 }}>
          <p style={{ margin:0, fontSize:9, fontWeight:700, color:T3, textTransform:'uppercase', letterSpacing:1 }}>Links (opcional)</p>
          {[['Email Link',mail,setMail],['Carpeta Drive',mail2,setMail2],['Documento',documento,setDocumento]].map(([lbl,val,setter])=>(
            <div key={lbl}>
              <label style={labelStyle}>{lbl}</label>
              <input type="url" value={val} onChange={e=>setter(e.target.value)} placeholder="https://..."
                style={{ ...inputStyle, fontFamily:MONO, fontSize:11 }} />
            </div>
          ))}
        </div>
      </div>
      {error && <p style={{ marginTop:12, fontSize:11, color:'#ff3d3d', border:'1px solid #ff3d3d', padding:'6px 12px', background:'#fff5f5' }}>{error}</p>}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
        <button onClick={onClose} style={{ fontSize:12, color:T3, background:'none', border:'none', cursor:'pointer', fontFamily:SANS }}>Cancelar</button>
        <NbBtn onClick={handleSave} disabled={saving} style={{ padding:'7px 20px', background:INK, color:'#fffdf9', fontSize:12, opacity:saving?0.6:1 }}>
          {saving?'Guardando...':'Guardar cambios'}
        </NbBtn>
      </div>
    </ModalShell>
  )
}

function NuevaTareaModal({ onClose, onCreated }) {
  const [tarea,setTarea]         = useState('')
  const [pais,setPais]           = useState('')
  const [prioridad,setPrioridad] = useState('Alta')
  const [fecha,setFecha]         = useState('')
  const [saving,setSaving]       = useState(false)
  const [error,setError]         = useState('')

  async function handleSave() {
    if (!tarea.trim()) { setError('La tarea es requerida'); return }
    setSaving(true); setError('')
    try {
      const fechaSheets = fecha ? fecha.split('-').reverse().join('/') : ''
      const res = await fetch('/api/tareas', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tarea:tarea.trim(), pais, prioridad, fecha_mail:fechaSheets }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'Error al crear')
      onCreated()
    } catch(err) { setError(err.message); setSaving(false) }
  }

  const inputStyle = { width:'100%', border:`1.5px solid ${INK}`, padding:'7px 10px', fontSize:12, fontFamily:SANS, background:'#fff', outline:'none', boxSizing:'border-box' }
  const labelStyle = { display:'block', fontSize:10, fontWeight:600, color:T3, marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }

  return (
    <ModalShell maxWidth={440} onClose={onClose}>
      <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:INK }}>Nueva tarea</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div>
          <label style={labelStyle}>Tarea *</label>
          <textarea autoFocus value={tarea} onChange={e=>setTarea(e.target.value)} rows={2}
            placeholder="Descripción de la tarea..."
            style={{ ...inputStyle, resize:'none' }} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={labelStyle}>Prioridad</label>
            <select value={prioridad} onChange={e=>setPrioridad(e.target.value)} style={inputStyle}>
              {['Urgente','Alta','Firmando','Baja','Solo documentación'].map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>País</label>
            <select value={pais} onChange={e=>setPais(e.target.value)} style={inputStyle}>
              {PAIS_CREATE.map(p=><option key={p} value={p}>{p||'—'}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Fecha</label>
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inputStyle} />
        </div>
      </div>
      {error && <p style={{ marginTop:12, fontSize:11, color:'#ff3d3d', border:'1px solid #ff3d3d', padding:'6px 12px', background:'#fff5f5' }}>{error}</p>}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
        <button onClick={onClose} style={{ fontSize:12, color:T3, background:'none', border:'none', cursor:'pointer', fontFamily:SANS }}>Cancelar</button>
        <NbBtn onClick={handleSave} disabled={saving} style={{ padding:'7px 20px', background:'#ff3d3d', color:'#fff', fontSize:12, opacity:saving?0.6:1 }}>
          {saving?'Guardando...':'Crear tarea'}
        </NbBtn>
      </div>
    </ModalShell>
  )
}

// ── Cola de trabajo ─────────────────────────────────────────────────────────
function ColaPanel({ cola, onClose, onMover, onQuitar, onAbrirDetalle }) {
  return (
    <>
      <motion.div
        key="cola-overlay"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        transition={{ duration:0.18 }}
        style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.45)', zIndex:60 }}
        onClick={onClose}
      />
      <motion.div
        key="cola-panel"
        initial={{ x:420 }} animate={{ x:0 }} exit={{ x:420 }}
        transition={{ type:'spring', damping:30, stiffness:300 }}
        style={{
          position:'fixed', top:0, right:0, bottom:0, width:400,
          background:'#fffdf9', borderLeft:`1.5px solid ${INK}`,
          boxShadow:`-6px 0 0 ${INK}`, zIndex:61,
          display:'flex', flexDirection:'column', fontFamily:SANS,
        }}
        onClick={e=>e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:`1.5px solid ${INK}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:13, fontWeight:700, color:INK }}>Cola de trabajo</span>
            <span style={{ fontSize:10, fontFamily:MONO, color:'#fffdf9', background:INK, padding:'1px 7px', border:`1px solid ${INK}` }}>{cola.length}</span>
          </div>
          <button onClick={onClose} style={{ color:T3, fontSize:22, lineHeight:1, background:'none', border:'none', cursor:'pointer' }}>×</button>
        </div>

        {/* Lista */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          {cola.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px', color:T3, fontSize:12, lineHeight:1.6 }}>
              <div style={{ fontSize:24, marginBottom:10 }}>📋</div>
              Hacé clic en <strong>+</strong> sobre cualquier tarea para agregarla a la cola
            </div>
          ) : cola.map((task, idx) => {
            const accent = ACCENT_MAP[task.prioridad]?.color || INK
            return (
              <div key={task.rowIndex} style={{
                background: idx===0 ? '#fffdf9' : '#f8f8f8',
                border:`1.5px solid ${INK}`,
                boxShadow: idx===0 ? `3px 3px 0 ${INK}` : `1px 1px 0 ${INK}`,
                borderLeft:`4px solid ${accent}`,
                display:'flex', alignItems:'stretch', gap:0,
              }}>
                {/* Número */}
                <div style={{
                  width:28, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                  background: idx===0 ? INK : '#f0f0f0',
                  color: idx===0 ? '#fffdf9' : T3,
                  borderRight:`1px solid rgba(10,10,10,0.1)`,
                  fontFamily:MONO, fontSize:11, fontWeight:700,
                }}>
                  {idx+1}
                </div>
                {/* Contenido */}
                <div style={{ flex:1, padding:'9px 10px', minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:INK, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {task.tarea}
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:5, alignItems:'center' }}>
                    <CountryBadge pais={task.pais} />
                    <span style={{ fontSize:9, fontFamily:MONO, color:T3, textTransform:'uppercase', letterSpacing:0.5 }}>{task.prioridad}</span>
                  </div>
                </div>
                {/* Acciones */}
                <div style={{ display:'flex', flexDirection:'column', borderLeft:`1px solid rgba(10,10,10,0.1)`, flexShrink:0 }}>
                  <button onClick={()=>onMover(idx,-1)} disabled={idx===0}
                    style={{ flex:1, padding:'0 8px', background:'none', border:'none', borderBottom:`1px solid rgba(10,10,10,0.08)`, cursor:idx===0?'default':'pointer', color:idx===0?'rgba(10,10,10,0.2)':T2, fontSize:10 }}>▲</button>
                  <button onClick={()=>onMover(idx,1)} disabled={idx===cola.length-1}
                    style={{ flex:1, padding:'0 8px', background:'none', border:'none', borderBottom:`1px solid rgba(10,10,10,0.08)`, cursor:idx===cola.length-1?'default':'pointer', color:idx===cola.length-1?'rgba(10,10,10,0.2)':T2, fontSize:10 }}>▼</button>
                  <button onClick={()=>onQuitar(task.rowIndex)}
                    style={{ flex:1, padding:'0 8px', background:'none', border:'none', cursor:'pointer', color:'#ff3d3d', fontSize:13, fontWeight:700 }}>×</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {cola.length > 0 && (
          <div style={{ padding:'12px 14px', borderTop:`1.5px solid ${INK}`, flexShrink:0 }}>
            <button onClick={()=>onAbrirDetalle(cola[0])}
              style={{ width:'100%', padding:'10px 0', background:INK, color:'#fffdf9', border:`1.5px solid ${INK}`, boxShadow:`2px 2px 0 rgba(10,10,10,0.3)`, fontFamily:SANS, fontSize:12, fontWeight:700, cursor:'pointer', letterSpacing:0.2 }}>
              Abrir primera tarea →
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}

// ── Board components ────────────────────────────────────────────────────────

function GroupHeaderRow({ nombre, tareas, collapsed, onToggle }) {
  const { setNodeRef, isOver } = useDroppable({ id:`grupo:${nombre}` })
  const completed = tareas.filter(isFullyCompleted).length
  return (
    <div ref={setNodeRef} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background: isOver?'#ede9ff':'#f0f0f0', border:`1px solid ${INK}`, marginBottom:2 }}>
      <button onClick={onToggle}
        style={{ fontSize:9, padding:'2px 8px', background:INK, color:'#fffdf9', border:'none', cursor:'pointer', fontFamily:MONO, letterSpacing:0.5 }}>
        GRUPO {collapsed?'▶':'▼'}
      </button>
      <span style={{ fontFamily:SANS, fontWeight:700, color:INK, fontSize:12 }}>{nombre}</span>
      <span style={{ fontFamily:MONO, fontSize:9, color:T3 }}>{completed}/{tareas.length}</span>
      {isOver && <span style={{ marginLeft:'auto', fontSize:9, color:'#7b2fff', fontFamily:MONO }}>Soltar aquí</span>}
    </div>
  )
}

function UngroupedDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id:'ungrouped' })
  return (
    <div ref={setNodeRef}
      style={{ padding:'8px 12px', border:`1.5px dashed ${isOver?INK:'rgba(10,10,10,0.2)'}`, fontSize:10, color:isOver?INK:T3, fontFamily:MONO, background:isOver?'#f0f0f0':'transparent', marginBottom:2, textAlign:'center' }}>
      ↑ Soltar aquí para quitar del grupo
    </div>
  )
}

// Board task card — fiel al diseño Figma
function BoardTaskCard({ task, indent, accentColor, accentTag }) {
  const isCompleted = isFullyCompleted(task)
  const code = task.grupo ? `grupo: ${task.grupo}` : task.fecha_mail || null

  return (
    <div style={{ padding:'10px 12px', paddingLeft: indent ? 20 : 12 }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
        {/* Checkbox cuadrado — Figma */}
        <div style={{
          width:14, height:14, flexShrink:0, marginTop:2,
          border:`1.5px solid ${INK}`,
          background: isCompleted ? accentColor : '#fff',
          boxShadow: isCompleted ? 'none' : `1px 1px 0 ${INK}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {isCompleted && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4l2.5 2.5L7 1.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontFamily:SANS, fontSize:12, fontWeight:600, lineHeight:1.4, color:INK, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {task.tarea}
          </p>
          {code && (
            <p style={{ margin:'2px 0 0', fontFamily:MONO, fontSize:9.5, fontWeight:500, color:T3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {code}
            </p>
          )}
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:9 }}>
        <CountryBadge pais={task.pais}  />
        <DelayBadge dias={task.dias_retraso} />
      </div>
    </div>
  )
}

function DraggableTaskRow({ task, onOpenDetail, indent, accentColor, accentTag, colaPos, onToggleCola }) {
  const { attributes, listeners, setNodeRef:setDragRef, isDragging } = useDraggable({ id:String(task.rowIndex) })
  const { setNodeRef:setDropRef, isOver } = useDroppable({ id:String(task.rowIndex) })
  const setRef = useCallback(node=>{ setDragRef(node); setDropRef(node) }, [setDragRef,setDropRef])
  const enCola = colaPos !== undefined

  return (
    <motion.div layout
      initial={{ opacity:0, y:4 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y:0 }}
      exit={{ opacity:0, y:-4 }}
      whileHover={!isDragging && !isOver ? { x:-1, y:-1, backgroundColor:'#f5f4f0', boxShadow:`3px 3px 0 ${accentColor||INK}` } : {}}
      transition={{ duration:0.12, ease:'easeOut' }}
      ref={setRef} {...attributes}
      style={{
        backgroundColor: isDragging ? 'rgba(255,253,249,0.85)' : '#fff',
        borderBottom: `1.5px solid ${INK}`,
        borderLeft: `3px solid ${accentColor||INK}`,
        boxShadow: isDragging ? `4px 4px 0 ${INK}` : isOver&&!isDragging ? `inset 0 0 0 2px #7b2fff` : 'none',
        transform: isDragging ? 'rotate(1deg) scale(1.02)' : undefined,
        opacity: isDragging ? 0.9 : 1,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <div style={{ display:'flex' }}>
        {/* Drag handle */}
        <div {...listeners}
          style={{ padding:'0 6px', display:'flex', alignItems:'center', color:'rgba(10,10,10,0.25)', cursor:'grab', touchAction:'none', flexShrink:0, fontSize:12 }}
          title="Arrastrar">
          ⠿
        </div>
        {/* Card content */}
        <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={()=>onOpenDetail(task)}>
          <BoardTaskCard task={task} indent={indent} accentColor={accentColor} accentTag={accentTag} />
        </div>
        {/* Cola badge */}
        <button
          onClick={e=>{ e.stopPropagation(); onToggleCola(task) }}
          title={enCola ? `Quitar de cola (pos. ${colaPos+1})` : 'Agregar a cola'}
          style={{
            width:22, alignSelf:'stretch', flexShrink:0,
            background: enCola ? INK : 'transparent',
            color: enCola ? '#fffdf9' : 'rgba(10,10,10,0.18)',
            border:'none', borderLeft:`1px solid rgba(10,10,10,0.08)`,
            cursor:'pointer', fontFamily:MONO, fontSize:enCola?10:14, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e=>{ if (!enCola) { e.currentTarget.style.background='#f0f0f0'; e.currentTarget.style.color=INK } }}
          onMouseLeave={e=>{ if (!enCola) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(10,10,10,0.18)' } }}
        >
          {enCola ? colaPos+1 : '+'}
        </button>
      </div>
    </motion.div>
  )
}

// ── Kanban column ───────────────────────────────────────────────────────────
function BoardColumn({ prioridad, tasks, isCollapsed, onToggleColumn, onToggleHidden, collapsedGroups, onToggleCollapse, onOpenDetail, onNewTask, cola, onToggleCola }) {
  const { setNodeRef, isOver } = useDroppable({ id:`priority:${prioridad}` })
  const { groups, ungrouped } = groupTasks(tasks)
  const { color: accent, tag: accentTag, dim: accentDim, sublabel } = ACCENT_MAP[prioridad]||{ color:T3, tag:'#f0f0f0', dim:'rgba(100,116,139,0.06)', sublabel:'' }

  return (
    <motion.div
      initial={{ opacity:0, scaleY:0.9 }} animate={{ opacity:1, scaleY:1 }}
      exit={{ opacity:0, scaleY:0 }} transition={{ duration:0.22, ease:[0.4,0,0.2,1] }}
      style={{
        flexShrink: 0,
        flex: isCollapsed ? '0 0 48px' : '1 1 240px',
        width: isCollapsed ? 48 : undefined,
        minWidth: isCollapsed ? 48 : 240,
        display:'flex', flexDirection:'column',
        border:`1.5px solid ${INK}`,
        boxShadow:`4px 4px 0 ${INK}`,
        alignSelf:'flex-start',
        background:'#fff',
        transformOrigin:'top center',
        transition:'flex 0.28s ease, min-width 0.28s ease, width 0.28s ease',
        overflow:'hidden',
      }}
    >
      {/* Header */}
      <div
        onClick={onToggleColumn}
        style={{
          background: accent,
          padding: isCollapsed ? '10px 0' : '11px 13px',
          borderBottom: `1.5px solid ${INK}`,
          cursor:'pointer', flexShrink:0, overflow:'hidden',
          display:'flex', alignItems:'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
        title={isCollapsed ? `Expandir ${prioridad}` : 'Colapsar columna'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isCollapsed ? (
            <motion.span key="c"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.12}}
              style={{ fontFamily:MONO, fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.9)' }}>
              {tasks.length}
            </motion.span>
          ) : (
            <motion.div key="e" style={{ width:'100%' }}
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.12}}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:SANS, fontSize:13, fontWeight:700, color:'#fff', letterSpacing:-0.2 }}>
                  {prioridad}
                </span>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontFamily:SERIF, fontSize:32, fontWeight:200, color:'#fff', lineHeight:1, letterSpacing:-1, opacity:0.85 }}>
                    {tasks.length}
                  </span>
                  {/* Eye icon — ocultar columna */}
                  <button onClick={e=>{ e.stopPropagation(); onToggleHidden() }}
                    title="Ocultar columna"
                    style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 3px', color:'rgba(255,255,255,0.55)', display:'flex', alignItems:'center', lineHeight:1 }}
                    onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.95)'}
                    onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.55)'}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>
              <p style={{ margin:'3px 0 0', fontFamily:MONO, fontSize:9, color:'#fff', opacity:0.6, letterSpacing:0.8 }}>
                {sublabel.toUpperCase()}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Etiqueta vertical cuando colapsada */}
      <AnimatePresence initial={false}>
        {isCollapsed && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px 0', cursor:'pointer' }}
            onClick={onToggleColumn}>
            <span style={{ fontFamily:SANS, fontSize:10, fontWeight:700, color:accent, writingMode:'vertical-rl', transform:'rotate(180deg)', letterSpacing:0.5, textTransform:'uppercase', userSelect:'none' }}>
              {prioridad}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks area */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}
            style={{ display:'flex', flexDirection:'column' }}>
            <div ref={setNodeRef}
              style={{ background: isOver ? accentDim : '#fff', transition:'background 0.12s', minHeight:60 }}>
              <AnimatePresence initial={false}>
                {ungrouped.map(task => (
                  <DraggableTaskRow key={task.rowIndex} task={task} onOpenDetail={onOpenDetail}
                    accentColor={accent} accentTag={accentTag}
                    colaPos={cola.findIndex(t=>t.rowIndex===task.rowIndex) >= 0 ? cola.findIndex(t=>t.rowIndex===task.rowIndex) : undefined}
                    onToggleCola={onToggleCola} />
                ))}
                {Object.keys(groups).length>0 && <UngroupedDropZone />}
                {Object.entries(groups).map(([nombre, tareas]) => {
                  const collapsed = collapsedGroups[nombre]
                  return (
                    <Fragment key={nombre}>
                      <GroupHeaderRow nombre={nombre} tareas={tareas} collapsed={collapsed} onToggle={()=>onToggleCollapse(nombre)} />
                      <AnimatePresence initial={false}>
                        {!collapsed && tareas.map(task => (
                          <DraggableTaskRow key={task.rowIndex} task={task} onOpenDetail={onOpenDetail}
                            indent accentColor={accent} accentTag={accentTag}
                            colaPos={cola.findIndex(t=>t.rowIndex===task.rowIndex) >= 0 ? cola.findIndex(t=>t.rowIndex===task.rowIndex) : undefined}
                            onToggleCola={onToggleCola} />
                        ))}
                      </AnimatePresence>
                    </Fragment>
                  )
                })}
              </AnimatePresence>
              {tasks.length===0 && (
                <div style={{ padding:'28px 14px', textAlign:'center', fontFamily:SANS, fontSize:11, color:T3, borderBottom:`1.5px dashed rgba(10,10,10,0.2)` }}>
                  Sin tareas
                </div>
              )}
            </div>
            {/* Add task button — Figma */}
            <button
              onClick={onNewTask}
              style={{ padding:'9px 13px', border:'none', borderTop:`1.5px solid ${INK}`, background:accentTag, color:INK, fontFamily:SANS, fontSize:11, fontWeight:600, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <span style={{ fontSize:16, fontWeight:300, lineHeight:1 }}>+</span>
              Agregar tarea
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Board container ─────────────────────────────────────────────────────────
function TareasBoard({ pendientes, collapsedGroups, onToggleCollapse, onOpenDetail, collapsedColumns, onToggleColumn, hiddenColumns, onToggleHidden, onNewTask, cola, onToggleCola }) {
  const visible = BOARD_PRIORITIES.filter(p=>!hiddenColumns[p])
  return (
    <div style={{ flex:1, display:'flex', gap:14, padding:'16px 20px 20px', overflowX:'auto', overflowY:'auto', alignItems:'flex-start' }}>
      <AnimatePresence initial={false}>
        {visible.map(prioridad => (
          <BoardColumn
            key={prioridad}
            prioridad={prioridad}
            tasks={pendientes.filter(t=>t.prioridad===prioridad)}
            isCollapsed={!!collapsedColumns[prioridad]}
            onToggleColumn={()=>onToggleColumn(prioridad)}
            onToggleHidden={()=>onToggleHidden(prioridad)}
            collapsedGroups={collapsedGroups}
            onToggleCollapse={onToggleCollapse}
            onOpenDetail={onOpenDetail}
            onNewTask={onNewTask}
            cola={cola}
            onToggleCola={onToggleCola}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ── Finalizados list ────────────────────────────────────────────────────────
function TaskListCard({ task, isFinalizados, onFieldChange, onReopen, onArchive, onEdit, onDelete }) {
  const accent = ACCENT_MAP[task.prioridad]
  return (
    <motion.div
      whileHover={{ x:-1, y:-1, backgroundColor:'#f5f4f0', boxShadow:`3px 3px 0 ${accent?.color||INK}` }}
      transition={{ duration:0.1 }}
      style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', borderBottom:`1.5px solid ${INK}`, borderLeft:`3px solid ${accent?.color||INK}`, backgroundColor:'#fff', fontFamily:SANS, cursor:'pointer' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:6 }}>
          <span style={{ fontSize:13, fontWeight:600, color:INK, lineHeight:1.4, flex:1 }}>{task.tarea}</span>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <CountryBadge pais={task.pais}  />
            {task.fecha_mail && <span style={{ fontSize:9.5, fontFamily:MONO, color:T3 }}>{task.fecha_mail}</span>}
            <DelayBadge dias={task.dias_retraso} />
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          {isFinalizados
            ? <span style={{ fontSize:10, padding:'1px 7px', background:'#d6f5e8', border:`1px solid ${INK}`, fontFamily:MONO }}>{task.prioridad}</span>
            : <InlineDropdown value={task.prioridad} options={FIELD_OPTIONS.prioridad} onSave={v=>onFieldChange(task,'prioridad',v)} />
          }
          <span style={{ color:'rgba(10,10,10,0.15)', fontSize:10 }}>·</span>
          <span style={{ fontSize:10, color:T3, fontFamily:MONO }}>Lib.</span>
          {isFinalizados
            ? <span style={{ fontSize:10, padding:'1px 6px', background:'#d6f5e8', border:`1px solid ${INK}`, fontFamily:MONO }}>{task.libreria_intranet}</span>
            : <InlineDropdown value={task.libreria_intranet} options={FIELD_OPTIONS.libreria_intranet} onSave={v=>onFieldChange(task,'libreria_intranet',v)} />
          }
          <span style={{ color:'rgba(10,10,10,0.15)', fontSize:10 }}>·</span>
          <span style={{ fontSize:10, color:T3, fontFamily:MONO }}>Doc.</span>
          {isFinalizados
            ? <span style={{ fontSize:10, padding:'1px 6px', background:'#d6f5e8', border:`1px solid ${INK}`, fontFamily:MONO, whiteSpace:'nowrap' }}>{task.documentacion_inicial}</span>
            : <InlineDropdown value={task.documentacion_inicial} options={FIELD_OPTIONS.documentacion_inicial} onSave={v=>onFieldChange(task,'documentacion_inicial',v)} />
          }
          <span style={{ color:'rgba(10,10,10,0.15)', fontSize:10 }}>·</span>
          <span style={{ fontSize:10, color:T3, fontFamily:MONO }}>Final.</span>
          {isFinalizados
            ? <span style={{ fontSize:10, padding:'1px 6px', background:'#d6f5e8', border:`1px solid ${INK}`, fontFamily:MONO }}>{task.finalizado}</span>
            : <InlineDropdown value={task.finalizado} options={FIELD_OPTIONS.finalizado} onSave={v=>onFieldChange(task,'finalizado',v)} />
          }
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
            <LinkCell url={task.mail}      title="Mail"          icon="✉️" />
            <LinkCell url={task.mail2}     title="Carpeta Drive" icon="📁" />
            <LinkCell url={task.documento} title="Documento"     icon="📄" />
            <span style={{ width:1, height:12, background:'rgba(10,10,10,0.15)' }} />
            <button onClick={()=>onEdit(task)} style={{ background:'none', border:'none', cursor:'pointer', color:T3, fontSize:13 }} title="Editar">✏️</button>
            <button onClick={()=>onDelete(task)} style={{ background:'none', border:'none', cursor:'pointer', color:T3, fontSize:13 }} title="Eliminar">🗑️</button>
            {isFinalizados && (
              <button onClick={()=>onReopen(task)} style={{ fontSize:10, color:'#7b2fff', background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:SANS }}>Reabrir →</button>
            )}
            {onArchive && (
              <button onClick={()=>onArchive(task)} style={{ fontSize:10, color:'#00c271', background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:SANS }}>Archivar →</button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function TareasTable({ tasks, isFinalizados=false, onFieldChange, onReopen, onArchive, onEdit, onDelete }) {
  if (!tasks?.length) return (
    <div style={{ textAlign:'center', padding:'64px 0', color:T3, fontFamily:SANS, fontSize:13 }}>
      {isFinalizados ? '🎉 No hay tareas finalizadas' : '📋 No hay tareas'}
    </div>
  )
  return (
    <div>
      {tasks.map((task,idx) => (
        <motion.div key={task.rowIndex}
          initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}}
          transition={{duration:0.15,ease:'easeOut',delay:idx*0.02}}>
          <TaskListCard task={task} isFinalizados={isFinalizados}
            onFieldChange={onFieldChange} onReopen={onReopen} onArchive={onArchive} onEdit={onEdit} onDelete={onDelete} />
        </motion.div>
      ))}
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
export default function Tareas() {
  const [tab,setTab]                       = useState('pendientes')
  const [pendientes,setPendientes]         = useState([])
  const [finalizados,setFinalizados]       = useState([])
  const [loading,setLoading]               = useState(true)
  const [error,setError]                   = useState(null)
  const [lastSync,setLastSync]             = useState(null)
  const [paisFilter,setPaisFilter]         = useState('Todos')
  const [sortBy,setSortBy]                 = useState('prioridad')
  const [archiveTask,setArchiveTask]       = useState(null)
  const [completeTask,setCompleteTask]     = useState(null)
  const [reopenTask,setReopenTask]         = useState(null)
  const [actionLoading,setActionLoading]   = useState(false)
  const [automationLoading,setAutomationLoading] = useState(false)
  const [showNewTask,setShowNewTask]       = useState(false)
  const [editTask,setEditTask]             = useState(null)
  const [deleteTask,setDeleteTask]         = useState(null)
  const [automationResult,setAutomationResult] = useState(null)
  const [activeId,setActiveId]             = useState(null)
  const [clockTime,setClockTime]           = useState(new Date())
  const [detailInfo,setDetailInfo]         = useState(null)
  const [cola,setCola]                     = useState([])
  const [colaAbierta,setColaAbierta]       = useState(false)

  function toggleEnCola(task) {
    setCola(prev => {
      const idx = prev.findIndex(t=>t.rowIndex===task.rowIndex)
      return idx >= 0 ? prev.filter(t=>t.rowIndex!==task.rowIndex) : [...prev, task]
    })
  }
  function moverEnCola(idx, dir) {
    setCola(prev => {
      const next = [...prev]
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= next.length) return prev
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return next
    })
  }
  function quitarDeCola(rowIndex) {
    setCola(prev => prev.filter(t=>t.rowIndex!==rowIndex))
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:4 } }))

  const [collapsedGroups,setCollapsedGroups] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('tareas_collapsedGroups')||'{}') } catch { return {} }
  })
  const [collapsedColumns,setCollapsedColumns] = useState({})
  const [hiddenColumns,setHiddenColumns] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('tareas_hiddenColumns')||'{}') } catch { return {} }
  })
  const [pendingGroup,setPendingGroup] = useState(null)

  function toggleColumn(p) { setCollapsedColumns(prev=>({...prev,[p]:!prev[p]})) }
  function toggleHidden(p) {
    setHiddenColumns(prev=>{
      const next={...prev,[p]:!prev[p]}
      localStorage.setItem('tareas_hiddenColumns',JSON.stringify(next))
      return next
    })
  }

  const fetchAll = useCallback(async()=>{
    setLoading(true); setError(null)
    try {
      const [pRes,fRes] = await Promise.all([
        fetch('/api/tareas',{cache:'no-store'}),
        fetch('/api/tareas/finalizados',{cache:'no-store'}),
      ])
      if (!pRes.ok||!fRes.ok) throw new Error('Error al conectar con Google Sheets')
      const [p,f] = await Promise.all([pRes.json(),fRes.json()])
      setPendientes(p); setFinalizados(f); setLastSync(new Date())
    } catch(err) { setError(err.message) }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ fetchAll() },[fetchAll])
  useEffect(()=>{
    const id = setInterval(()=>setClockTime(new Date()),1000)
    return ()=>clearInterval(id)
  },[])

  async function handleRunAutomation() {
    if (automationLoading) return
    setAutomationLoading(true); setError(null)
    const prevIdx = new Set(pendientes.map(t=>t.rowIndex))
    try {
      const res = await fetch('/api/tareas/automatizar',{method:'POST'})
      if (!res.ok) {
        const text = await res.text()
        let msg=`Error ${res.status}`
        try { msg=JSON.parse(text).error||msg } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      const [pRes,fRes] = await Promise.all([fetch('/api/tareas',{cache:'no-store'}),fetch('/api/tareas/finalizados',{cache:'no-store'})])
      const [newP,newF] = await Promise.all([pRes.json(),fRes.json()])
      setPendientes(newP); setFinalizados(newF); setLastSync(new Date())
      setAutomationResult({ message:data.message||null, addedTasks:newP.filter(t=>!prevIdx.has(t.rowIndex)) })
    } catch(err) { setError(err.message) }
    finally { setAutomationLoading(false) }
  }

  async function handleFieldChange(task,field,value) {
    const res = await fetch(`/api/tareas/${task.rowIndex}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({field,value}) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error||'Error al guardar')
    setPendientes(prev=>prev.map(t=>t.rowIndex===task.rowIndex?{...data.task,grupo:data.task.grupo||t.grupo}:t))
    if (data.readyToArchive) setArchiveTask({...data.task,grupo:data.task.grupo||task.grupo})
  }

  async function patchPrioridad(task,newPrioridad) {
    try {
      const res = await fetch(`/api/tareas/${task.rowIndex}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({field:'prioridad',value:newPrioridad}) })
      if (!res.ok) { const d=await res.json(); throw new Error(d.error||`Error ${res.status}`) }
      setPendientes(prev=>prev.map(t=>t.rowIndex===task.rowIndex?{...t,prioridad:newPrioridad}:t))
    } catch(err) { setError('Error al cambiar prioridad: '+err.message) }
  }

  async function handleArchiveConfirm() {
    if (!archiveTask||actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tareas/${archiveTask.rowIndex}/archive`,{method:'POST'})
      if (!res.ok) { const d=await res.json(); throw new Error(d.error) }
      await fetchAll()
    } catch(err) { setError(err.message) }
    finally { setActionLoading(false); setArchiveTask(null) }
  }

  async function handleReopenConfirm() {
    if (!reopenTask||actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tareas/finalizados/${reopenTask.rowIndex}/reopen`,{method:'POST'})
      if (!res.ok) { const d=await res.json(); throw new Error(d.error) }
      await fetchAll()
    } catch(err) { setError(err.message) }
    finally { setActionLoading(false); setReopenTask(null) }
  }

  async function handleDeleteConfirm() {
    if (!deleteTask||actionLoading) return
    setActionLoading(true)
    try {
      const url = deleteTask._source==='finalizados' ? `/api/tareas/finalizados/${deleteTask.rowIndex}` : `/api/tareas/${deleteTask.rowIndex}`
      const res = await fetch(url,{method:'DELETE'})
      if (!res.ok) { const d=await res.json(); throw new Error(d.error) }
      await fetchAll()
    } catch(err) { setError(err.message) }
    finally { setActionLoading(false); setDeleteTask(null) }
  }

  async function handleEdit({ tarea,pais,prioridad,fecha_mail,mail,mail2,documento,grupo }) {
    const res = await fetch(`/api/tareas/${editTask.rowIndex}`,{ method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tarea,pais,prioridad,fecha_mail,mail,mail2,documento,grupo}) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error||'Error al guardar')
    setPendientes(prev=>prev.map(t=>t.rowIndex===editTask.rowIndex?data.task:t))
    setEditTask(null)
  }

  function toggleCollapse(nombre) {
    setCollapsedGroups(prev=>{ const next={...prev,[nombre]:!prev[nombre]}; localStorage.setItem('tareas_collapsedGroups',JSON.stringify(next)); return next })
  }

  async function assignToGroup(task,grupoNombre) {
    try {
      const res = await fetch(`/api/tareas/${task.rowIndex}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({field:'grupo',value:grupoNombre}) })
      if (!res.ok) { const d=await res.json(); throw new Error(d.error) }
      setPendientes(prev=>prev.map(t=>t.rowIndex===task.rowIndex?{...t,grupo:grupoNombre}:t))
    } catch(err) { setError('Error al asignar grupo: '+err.message) }
  }

  async function handleCreateGroup(grupoNombre) {
    const { taskA, taskB } = pendingGroup
    setPendingGroup(null)
    try {
      const [rA,rB] = await Promise.all([
        fetch(`/api/tareas/${taskA.rowIndex}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({field:'grupo',value:grupoNombre})}),
        fetch(`/api/tareas/${taskB.rowIndex}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({field:'grupo',value:grupoNombre})}),
      ])
      if (!rA.ok||!rB.ok) { const d=await(!rA.ok?rA:rB).json(); throw new Error(d.error||'Error') }
      setPendientes(prev=>prev.map(t=>t.rowIndex===taskA.rowIndex||t.rowIndex===taskB.rowIndex?{...t,grupo:grupoNombre}:t))
    } catch(err) { setError('Error al crear grupo: '+err.message) }
  }

  function handleDragEnd({ active, over }) {
    if (!over||active.id===over.id) return
    const overId = String(over.id)
    const dragged = pendientes.find(t=>String(t.rowIndex)===String(active.id))
    if (!dragged) return
    if (overId.startsWith('priority:')) {
      const np = overId.replace('priority:','')
      if (dragged.prioridad!==np) patchPrioridad(dragged,np)
      return
    }
    if (overId==='ungrouped') { if (dragged.grupo) assignToGroup(dragged,''); return }
    if (overId.startsWith('grupo:')) {
      const gn = overId.replace('grupo:','')
      if (dragged.grupo!==gn) assignToGroup(dragged,gn)
      return
    }
    const target = pendientes.find(t=>String(t.rowIndex)===overId)
    if (!target) return
    if (dragged.prioridad!==target.prioridad) { patchPrioridad(dragged,target.prioridad); return }
    if (dragged.grupo&&!target.grupo) assignToGroup(dragged,'')
    else if (target.grupo&&dragged.grupo!==target.grupo) assignToGroup(dragged,target.grupo)
    else if (!dragged.grupo&&!target.grupo) setPendingGroup({taskA:dragged,taskB:target})
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const sortFn = (a,b)=>{
    if (sortBy==='fecha') {
      const parse=s=>{ if(!s) return Infinity; const [d,m,y]=s.split('/').map(Number); return y>1900?new Date(y,m-1,d).getTime():Infinity }
      return parse(a.fecha_mail)-parse(b.fecha_mail)
    }
    if (sortBy==='retraso') return (b.dias_retraso??-Infinity)-(a.dias_retraso??-Infinity)
    const pa=PRIORITY_ORDER[a.prioridad]??3, pb=PRIORITY_ORDER[b.prioridad]??3
    if (pa!==pb) return pa-pb
    return (b.dias_retraso??-Infinity)-(a.dias_retraso??-Infinity)
  }

  const boardPendientes = pendientes.filter(t=>paisFilter==='Todos'||t.pais===paisFilter).filter(t=>t.prioridad!=='Hecho').sort(sortFn)
  const hechoTasks = pendientes.filter(t=>t.prioridad==='Hecho').filter(t=>paisFilter==='Todos'||t.pais===paisFilter).sort(sortFn)
  const hechoCount = pendientes.filter(t=>t.prioridad==='Hecho').length
  const lastSyncText = lastSync ? lastSync.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}) : null

  const detailTask = detailInfo
    ? (detailInfo.source==='finalizados'?finalizados:pendientes).find(t=>t.rowIndex===detailInfo.rowIndex)
    : null

  const totalBoard = boardPendientes.length
  const accentBgs = { 'Urgente':'#ffe0e0','Alta':'#fff0d6','Firmando':'#ede9ff','Baja':'#d6f5e8','Solo documentación':'#f0f0f0' }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 48px)', overflow:'hidden', background:'#fffdf9', fontFamily:SANS }}>

      {/* ── Stats row ── */}
      {!loading && (
        <div style={{ display:'flex', gap:12, padding:'14px 20px', borderBottom:`2px solid ${INK}`, flexShrink:0, background:'#fffdf9', alignItems:'flex-end', overflowX:'auto' }}>
          {[
            { label:'Total activas', value:pendientes.length,                                          note:'pendientes',     accentBg:'#d6f5e8', onClick:()=>{ setTab('pendientes'); setPaisFilter('Todos') } },
            { label:'Urgentes',      value:pendientes.filter(t=>t.prioridad==='Urgente').length,       note:'crítico',        accentBg:'#ffe0e0', onClick:()=>{ setTab('pendientes'); setSortBy('prioridad') } },
            { label:'En retraso',    value:pendientes.filter(t=>(t.dias_retraso??0)>0).length,        note:'fuera de fecha', accentBg:'#fff0d6', onClick:()=>{ setTab('pendientes'); setSortBy('fecha') } },
            { label:'Finalizadas',   value:finalizados.length,                                         note:'archivadas',     accentBg:'#ede9ff', onClick:()=>setTab('hecho') },
          ].map(({ label, value, note, accentBg, onClick })=>(
            <button key={label} onClick={onClick} className="nb-card"
              style={{ padding:'14px 18px', minWidth:130, background:accentBg, cursor:'pointer', border:`1.5px solid ${INK}`, display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
              <div style={{ fontFamily:MONO, fontSize:9, color:INK, letterSpacing:1.3, textTransform:'uppercase', opacity:0.65, marginBottom:6 }}>{label}</div>
              <div style={{ fontFamily:SERIF, fontSize:52, fontWeight:200, color:INK, lineHeight:1, letterSpacing:-2 }}>{value}</div>
              <div style={{ fontFamily:MONO, fontSize:9.5, color:INK, opacity:0.55, marginTop:6 }}>{note}</div>
            </button>
          ))}

          {/* Distribution bar — Figma */}
          <div className="nb-card" style={{ flex:1, padding:'14px 18px', minWidth:200 }}>
            <div style={{ fontFamily:MONO, fontSize:9, color:T3, letterSpacing:1.3, textTransform:'uppercase', marginBottom:12 }}>Distribución</div>
            {BOARD_PRIORITIES.filter(p=>boardPendientes.filter(t=>t.prioridad===p).length>0).map(p=>{
              const cnt = boardPendientes.filter(t=>t.prioridad===p).length
              const pct = totalBoard>0 ? Math.round((cnt/totalBoard)*100) : 0
              const accent = ACCENT_MAP[p]?.color||T3
              return (
                <div key={p} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={{ fontFamily:MONO, fontSize:9, color:T3, width:60, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p}</div>
                  <div style={{ flex:1, height:12, background:'#f0f0f0', border:`1px solid ${INK}`, position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', inset:0, width:`${pct}%`, background:accent, transition:'width 0.4s' }} />
                  </div>
                  <div style={{ fontFamily:MONO, fontSize:9, color:T2, width:20, textAlign:'right', flexShrink:0 }}>{cnt}</div>
                </div>
              )
            })}
            {totalBoard===0 && <div style={{ fontFamily:MONO, fontSize:9, color:T3 }}>Sin tareas activas</div>}
          </div>
        </div>
      )}

      {/* ── Tabs + sort + filter (Figma tabs bar) ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, borderBottom:`1.5px solid ${INK}`, background:'#fffdf9', height:42 }}>
        <div style={{ display:'flex', alignItems:'stretch', height:'100%' }}>
          {[
            { key:'pendientes', label:'Pendientes', count:boardPendientes.length },
            { key:'hecho',      label:'Hecho / Finalizados', count:hechoCount+finalizados.length },
          ].map(({ key, label, count })=>(
            <button key={key} onClick={()=>setTab(key)} style={{
              padding:'0 18px', border:'none', cursor:'pointer',
              background: tab===key ? INK : 'transparent',
              color: tab===key ? '#fffdf9' : T3,
              fontFamily:SANS, fontSize:12, fontWeight:tab===key?600:400,
              display:'flex', alignItems:'center', gap:7,
              borderRight:`1px solid rgba(10,10,10,0.1)`,
              transition:'background 0.1s, color 0.1s',
            }}>
              {label}
              {count>0 && (
                <span style={{ fontFamily:MONO, fontSize:9.5, background:tab===key?'rgba(255,255,255,0.15)':'#f0f0f0', color:tab===key?'#fffdf9':T3, padding:'1px 5px', border:`1px solid ${tab===key?'rgba(255,255,255,0.2)':'rgba(10,10,10,0.12)'}` }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontFamily:MONO, fontSize:9, color:T3, letterSpacing:1.2, textTransform:'uppercase' }}>Ordenar</span>
          {[{key:'prioridad',label:'Prioridad'},{key:'fecha',label:'Fecha'}].map(({key,label})=>(
            <button key={key} onClick={()=>setSortBy(key)} className="nb-btn" style={{
              padding:'3px 10px', fontSize:10,
              background:sortBy===key?INK:'#fffdf9', color:sortBy===key?'#fffdf9':T2,
            }}>{label}</button>
          ))}
          <div style={{ width:1, height:16, background:'rgba(10,10,10,0.12)' }} />
          <select value={paisFilter} onChange={e=>setPaisFilter(e.target.value)}
            style={{ background:'#fffdf9', border:`1.5px solid ${INK}`, boxShadow:`1.5px 1.5px 0 ${INK}`, color:T2, fontSize:10, padding:'4px 8px', cursor:'pointer', fontFamily:MONO, outline:'none' }}>
            {PAIS_OPTIONS.map(p=><option key={p}>{p}</option>)}
          </select>
          {paisFilter!=='Todos' && (
            <button onClick={()=>setPaisFilter('Todos')} style={{ fontSize:10, color:T3, textDecoration:'underline', cursor:'pointer', background:'none', border:'none', fontFamily:SANS }}>Limpiar</button>
          )}
          <div style={{ width:1, height:16, background:'rgba(10,10,10,0.12)' }} />
          <div style={{ display:'flex', gap:6 }}>
            <NbBtn onClick={handleRunAutomation} disabled={automationLoading}
              style={{ padding:'4px 12px', background:'#fffdf9', color:INK, fontSize:10, opacity:automationLoading?0.6:1, display:'flex', alignItems:'center', gap:5 }}>
              {automationLoading?<><span className="animate-spin">🧠</span>Analizando...</>:<>🚀 Automatizar</>}
            </NbBtn>
            <NbBtn onClick={fetchAll} disabled={loading}
              style={{ padding:'4px 12px', background:'#fffdf9', color:INK, fontSize:10, opacity:loading?0.5:1, display:'flex', alignItems:'center', gap:4 }}>
              <span className={loading?'animate-spin':''}>↻</span> Actualizar
            </NbBtn>
            <NbBtn onClick={()=>setShowNewTask(true)}
              style={{ padding:'4px 13px', background:'#ff3d3d', color:'#fff', fontSize:10 }}>
              + Nueva tarea
            </NbBtn>
            <button onClick={()=>setColaAbierta(true)}
              style={{ position:'relative', padding:'4px 12px', background: cola.length>0 ? INK : '#fffdf9', color: cola.length>0 ? '#fffdf9' : T2, border:`1.5px solid ${INK}`, boxShadow:`1.5px 1.5px 0 ${INK}`, fontFamily:SANS, fontSize:10, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              ☰ Cola
              {cola.length > 0 && (
                <span style={{ background:'#ff3d3d', color:'#fff', fontFamily:MONO, fontSize:9, padding:'0 5px', border:`1px solid rgba(255,255,255,0.3)`, lineHeight:'16px' }}>{cola.length}</span>
              )}
            </button>
          </div>
          {lastSyncText && (
            <span style={{ fontFamily:MONO, fontSize:9, color:T3, display:'inline-flex', alignItems:'center', gap:4 }}>
              <span className="pulse-dot" style={{ width:6, height:6, borderRadius:'50%', background:'#00c271', display:'inline-block', border:`1.5px solid ${INK}` }} />
              {clockTime.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
            </span>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ margin:'0 20px', marginTop:8, background:'#fff5f5', border:`1.5px solid #ff3d3d`, boxShadow:`3px 3px 0 #ff3d3d`, padding:'10px 16px', fontSize:13, color:'#ff3d3d', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:SANS, flexShrink:0 }}>
          <span>{error}</span>
          <button onClick={()=>setError(null)} style={{ color:'#ff3d3d', background:'none', border:'none', cursor:'pointer', fontSize:18, lineHeight:1, marginLeft:12 }}>×</button>
        </div>
      )}

      {/* ── Columnas ocultas strip ── */}
      {BOARD_PRIORITIES.some(p=>hiddenColumns[p]) && tab==='pendientes' && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 20px', flexWrap:'wrap', flexShrink:0, borderBottom:`1px solid rgba(10,10,10,0.08)` }}>
          <span style={{ fontSize:9, fontFamily:MONO, color:T3, letterSpacing:1, textTransform:'uppercase' }}>Ocultas</span>
          {BOARD_PRIORITIES.filter(p=>hiddenColumns[p]).map(p=>{
            const ac = ACCENT_MAP[p]||{ color:T3, tag:'#f0f0f0' }
            return (
              <button key={p} onClick={()=>toggleHidden(p)} title={`Mostrar ${p}`}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', cursor:'pointer', border:`1.5px solid ${INK}`, background:ac.tag, color:INK, fontSize:10, fontWeight:600, fontFamily:SANS }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                {p}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Contenido ── */}
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, color:T3, fontFamily:SANS, fontSize:13, gap:8 }}>
          <span className="animate-spin">↻</span> Cargando desde Google Sheets...
        </div>
      ) : tab==='pendientes' ? (
        <DndContext sensors={sensors}
          onDragStart={({active})=>setActiveId(active.id)}
          onDragEnd={e=>{ setActiveId(null); handleDragEnd(e) }}
          onDragCancel={()=>setActiveId(null)}>
          <TareasBoard
            pendientes={boardPendientes}
            collapsedGroups={collapsedGroups}
            onToggleCollapse={toggleCollapse}
            onOpenDetail={task=>setDetailInfo({rowIndex:task.rowIndex,source:'pendientes'})}
            collapsedColumns={collapsedColumns}
            onToggleColumn={toggleColumn}
            hiddenColumns={hiddenColumns}
            onToggleHidden={toggleHidden}
            onNewTask={()=>setShowNewTask(true)}
            cola={cola}
            onToggleCola={toggleEnCola}
          />
          <DragOverlay dropAnimation={{duration:180,easing:'ease'}}>
            {activeId ? (()=>{
              const task = pendientes.find(t=>String(t.rowIndex)===String(activeId))
              if (!task) return null
              const ac = ACCENT_MAP[task.prioridad]||{ color:INK, tag:'#f0f0f0' }
              return (
                <div style={{ background:'#fff', border:`1.5px solid ${INK}`, borderLeft:`3px solid ${ac.color}`, boxShadow:`4px 4px 0 ${INK}`, transform:'rotate(1.5deg) scale(1.02)', opacity:0.97, width:260 }}>
                  <div style={{ display:'flex' }}>
                    <div style={{ padding:'0 6px', display:'flex', alignItems:'center', color:'rgba(10,10,10,0.3)', fontSize:12 }}>⠿</div>
                    <BoardTaskCard task={task} accentColor={ac.color} accentTag={ac.tag} />
                  </div>
                </div>
              )
            })() : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div style={{ overflowY:'auto', flex:1, padding:'20px' }}>
          <div style={{ maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column', gap:24 }}>
            {hechoTasks.length>0 && (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:'#00c271', fontFamily:SANS }}>Hecho — pendientes de archivar</h3>
                  <span style={{ fontSize:10, padding:'1px 7px', background:'#d6f5e8', border:`1px solid ${INK}`, fontFamily:MONO }}>{hechoTasks.length}</span>
                </div>
                <div style={{ border:`1.5px solid ${INK}`, boxShadow:`3px 3px 0 ${INK}` }}>
                  <TareasTable tasks={hechoTasks} isFinalizados={false}
                    onFieldChange={handleFieldChange} onArchive={task=>setArchiveTask(task)}
                    onEdit={setEditTask} onDelete={task=>setDeleteTask({...task,_source:'pendientes'})} />
                </div>
              </div>
            )}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:T3, fontFamily:SANS }}>Finalizados archivados</h3>
                <span style={{ fontSize:10, padding:'1px 7px', background:'#f0f0f0', border:`1px solid ${INK}`, fontFamily:MONO }}>{finalizados.length}</span>
              </div>
              <div style={{ border:`1.5px solid ${INK}`, boxShadow:`3px 3px 0 ${INK}` }}>
                <TareasTable tasks={finalizados} isFinalizados
                  onReopen={setReopenTask} onEdit={setEditTask}
                  onDelete={task=>setDeleteTask({...task,_source:'finalizados'})} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modales ── */}
      {completeTask && (
        <ModalShell onClose={()=>setCompleteTask(null)}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:12 }}>✅</div>
            <h3 style={{ margin:'0 0 8px', fontSize:15, fontWeight:700, color:INK }}>Marcar como Hecho</h3>
            <p style={{ margin:'0 0 8px', fontSize:13, fontWeight:600, color:INK }}>"{completeTask.tarea}"</p>
            <p style={{ margin:'0 0 20px', fontSize:13, color:T3 }}>La tarea saldrá del tablero.</p>
            <div style={{ display:'flex', gap:10 }}>
              <NbBtn onClick={()=>setCompleteTask(null)} style={{ flex:1, padding:'8px 0', background:'#fffdf9', color:INK, fontSize:12 }}>Cancelar</NbBtn>
              <NbBtn onClick={()=>{ patchPrioridad(completeTask,'Hecho'); setCompleteTask(null) }} style={{ flex:1, padding:'8px 0', background:'#00c271', color:'#fff', fontSize:12 }}>Confirmar</NbBtn>
            </div>
          </div>
        </ModalShell>
      )}

      {archiveTask && <ConfirmModal task={archiveTask} onConfirm={handleArchiveConfirm} onCancel={()=>setArchiveTask(null)} />}
      {reopenTask  && <ReopenModal  task={reopenTask}  onConfirm={handleReopenConfirm}  onCancel={()=>setReopenTask(null)} />}

      {deleteTask && (
        <ModalShell onClose={()=>setDeleteTask(null)}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:12 }}>🗑️</div>
            <h3 style={{ margin:'0 0 8px', fontSize:15, fontWeight:700, color:INK }}>Eliminar tarea</h3>
            <p style={{ margin:'0 0 6px', fontSize:13, color:T3 }}>¿Seguro que querés eliminar esta tarea?</p>
            <p style={{ margin:'0 0 20px', fontSize:13, fontWeight:600, color:INK }}>"{deleteTask.tarea}"</p>
            <div style={{ display:'flex', gap:10 }}>
              <NbBtn onClick={()=>setDeleteTask(null)} style={{ flex:1, padding:'8px 0', background:'#fffdf9', color:INK, fontSize:12 }}>Cancelar</NbBtn>
              <NbBtn onClick={handleDeleteConfirm} disabled={actionLoading} style={{ flex:1, padding:'8px 0', background:'#ff3d3d', color:'#fff', fontSize:12, opacity:actionLoading?0.6:1 }}>
                {actionLoading?'Eliminando...':'Eliminar'}
              </NbBtn>
            </div>
          </div>
        </ModalShell>
      )}

      <AnimatePresence>
        {detailTask && (
          <TaskDetailModal task={detailTask} isFinalizados={detailInfo?.source==='finalizados'}
            onClose={()=>setDetailInfo(null)}
            onFieldChange={handleFieldChange}
            onComplete={task=>{ setArchiveTask(task); setDetailInfo(null) }}
            onDelete={task=>{ setDeleteTask({...task,_source:detailInfo?.source==='finalizados'?'finalizados':'pendientes'}); setDetailInfo(null) }}
            onEdit={task=>{ setEditTask(task); setDetailInfo(null) }}
            onReopen={task=>{ setReopenTask(task); setDetailInfo(null) }}
          />
        )}
      </AnimatePresence>

      {showNewTask && <NuevaTareaModal onClose={()=>setShowNewTask(false)} onCreated={()=>{ setShowNewTask(false); fetchAll() }} />}

      <AnimatePresence>
        {colaAbierta && (
          <ColaPanel
            cola={cola}
            onClose={()=>setColaAbierta(false)}
            onMover={moverEnCola}
            onQuitar={quitarDeCola}
            onAbrirDetalle={task=>{ setColaAbierta(false); setDetailInfo({rowIndex:task.rowIndex,source:'pendientes'}) }}
          />
        )}
      </AnimatePresence>

      {editTask && <TareaFormModal title="Editar tarea" initial={editTask} onClose={()=>setEditTask(null)} onSave={handleEdit} />}

      {pendingGroup && <NombreGrupoModal taskA={pendingGroup.taskA} taskB={pendingGroup.taskB} onConfirm={handleCreateGroup} onCancel={()=>setPendingGroup(null)} />}

      {automationResult && (
        <ModalShell maxWidth={440} onClose={()=>setAutomationResult(null)}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ width:40, height:40, background:'#d6f5e8', border:`1.5px solid ${INK}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🚀</div>
            <div>
              <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:INK }}>Automatización completada</h3>
              <p style={{ margin:0, fontSize:11, color:T3 }}>Análisis de correos finalizado</p>
            </div>
          </div>
          {automationResult.message && (
            <div style={{ background:'#f0f0f0', border:`1.5px solid ${INK}`, padding:'10px 14px', fontSize:13, color:T2, marginBottom:16, lineHeight:1.5 }}>
              {automationResult.message}
            </div>
          )}
          {automationResult.addedTasks.length>0 ? (
            <div style={{ marginBottom:16 }}>
              <p style={{ margin:'0 0 8px', fontSize:9, fontWeight:700, color:T3, textTransform:'uppercase', letterSpacing:1 }}>
                {automationResult.addedTasks.length} tarea{automationResult.addedTasks.length>1?'s':''} nueva{automationResult.addedTasks.length>1?'s':''} agregada{automationResult.addedTasks.length>1?'s':''}
              </p>
              <div style={{ display:'flex', flexDirection:'column', maxHeight:200, overflowY:'auto' }}>
                {automationResult.addedTasks.map(t=>(
                  <div key={t.rowIndex} style={{ background:'#fff', border:`1.5px solid ${INK}`, borderLeft:`3px solid ${ACCENT_MAP[t.prioridad]?.color||INK}`, padding:'8px 12px', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:500, color:INK }}>{t.tarea}</span>
                    {t.pais && <CountryBadge pais={t.pais}  />}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom:16, display:'flex', alignItems:'center', gap:8, fontSize:13, color:T3, background:'#f0f0f0', border:`1.5px solid ${INK}`, padding:'10px 14px' }}>
              <span>📭</span><span>No se agregaron tareas nuevas esta vez.</span>
            </div>
          )}
          <NbBtn onClick={()=>setAutomationResult(null)} style={{ width:'100%', padding:'10px 0', background:INK, color:'#fffdf9', fontSize:13 }}>Entendido</NbBtn>
        </ModalShell>
      )}
    </div>
  )
}

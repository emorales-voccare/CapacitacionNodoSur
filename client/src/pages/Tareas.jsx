import { useState, useEffect, useCallback, Fragment } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import InlineDropdown from '../components/InlineDropdown'

const PAIS_OPTIONS = ['Todos', 'General', 'Argentina', 'Bolivia', 'Chile', 'Ecuador', 'Paraguay', 'Peru', 'Uruguay']
const BOARD_PRIORITIES = ['Urgente', 'Alta', 'Firmando', 'Baja', 'Solo documentación']

const FIELD_OPTIONS = {
  prioridad:             ['Urgente', 'Alta', 'Firmando', 'Baja', 'Hecho', 'Solo documentación'],
  libreria_intranet:     ['Pendiente', 'Hecho'],
  documentacion_inicial: ['Pendiente', 'En curso', '✅ Finalizado'],
  finalizado:            ['SÍ', 'NO'],
}

const PRIORITY_ORDER = { 'Urgente': 0, 'Alta': 1, 'Firmando': 1.5, 'Baja': 2, 'Solo documentación': 2.5, 'Hecho': 3, '': 4 }

const COLUMN_HEADER_STYLES = {
  'Urgente':            'bg-red-100 text-red-700 border-red-200',
  'Alta':               'bg-orange-100 text-orange-700 border-orange-200',
  'Firmando':           'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Baja':               'bg-green-100 text-green-700 border-green-200',
  'Solo documentación': 'bg-blue-100 text-blue-700 border-blue-200',
}

const COLUMN_BG_STYLES = {
  'Urgente':            'border-red-200',
  'Alta':               'border-orange-200',
  'Firmando':           'border-yellow-200',
  'Baja':               'border-green-200',
  'Solo documentación': 'border-blue-200',
}

function isFullyCompleted(task) {
  return (
    task.prioridad             === 'Hecho' &&
    task.libreria_intranet     === 'Hecho' &&
    task.documentacion_inicial === '✅ Finalizado' &&
    task.finalizado            === 'SÍ'
  )
}

function rowHighlightClasses(prioridad) {
  if (prioridad === 'Urgente')            return 'border-l-4 border-l-red-600'
  if (prioridad === 'Alta')               return 'border-l-4 border-l-red-300'
  if (prioridad === 'Baja')               return 'border-l-4 border-l-yellow-400'
  if (prioridad === 'Hecho')              return 'border-l-4 border-l-green-400'
  if (prioridad === 'Firmando')           return 'border-l-4 border-l-purple-500'
  if (prioridad === 'Solo documentación') return 'border-l-4 border-l-yellow-300 bg-yellow-50/70'
  return 'border-l-4 border-l-transparent'
}

function groupTasks(tasks) {
  const groups = {}
  const ungrouped = []
  for (const t of tasks) {
    if (t.grupo) {
      groups[t.grupo] = groups[t.grupo] || []
      groups[t.grupo].push(t)
    } else {
      ungrouped.push(t)
    }
  }
  return { groups, ungrouped }
}

function DelayBadge({ dias }) {
  if (dias === null || dias === undefined) return <span className="text-gray-300 text-xs">—</span>
  if (dias <= 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">En fecha</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{dias}d</span>
}

function LinkCell({ url, title, icon }) {
  if (!url) return <span className="text-gray-200 text-xs">—</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={title}
       className="text-brand-600 hover:text-brand-700 transition-colors text-sm">
      {icon}
    </a>
  )
}

function ConfirmModal({ task, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="text-2xl mb-3 text-center">✅</div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-2">Tarea completada</h3>
        <p className="text-sm text-gray-600 text-center mb-1">
          Todos los campos están finalizados.
        </p>
        <p className="text-sm font-medium text-gray-800 text-center mb-5 px-2">
          "{task.tarea}"
        </p>
        <p className="text-sm text-gray-500 text-center mb-5">
          ¿Mover a <strong>Finalizados</strong>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Dejar aquí
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Mover a Finalizados
          </button>
        </div>
      </div>
    </div>
  )
}

function ReopenModal({ task, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="text-2xl mb-3 text-center">🔄</div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-2">Reabrir tarea</h3>
        <p className="text-sm text-gray-600 text-center mb-1">
          La tarea volverá a la lista de pendientes.
        </p>
        <p className="text-sm font-medium text-gray-800 text-center mb-5 px-2">
          "{task.tarea}"
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Mover a Pendientes
          </button>
        </div>
      </div>
    </div>
  )
}

const COUNTRY_COLORS = {
  'argentina': 'bg-blue-50 text-blue-700 border-blue-100',
  'bolivia':   'bg-green-50 text-green-700 border-green-100',
  'chile':     'bg-red-50 text-red-700 border-red-100',
  'ecuador':   'bg-yellow-50 text-yellow-700 border-yellow-100',
  'paraguay':  'bg-indigo-50 text-indigo-700 border-indigo-100',
  'peru':      'bg-red-50 text-red-800 border-red-200',
  'uruguay':   'bg-sky-50 text-sky-700 border-sky-100',
  'general':   'bg-gray-50 text-gray-700 border-gray-100',
  'colombia':  'bg-orange-50 text-orange-700 border-orange-100',
  'venezuela': 'bg-yellow-50 text-yellow-800 border-yellow-200',
}

function CountryBadge({ pais }) {
  if (!pais || pais === '—') return <span className="text-gray-300">—</span>
  const key = pais.toLowerCase()
  const colorClass = COUNTRY_COLORS[key] || 'bg-gray-50 text-gray-600 border-gray-100'
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${colorClass}`}>
      {pais}
    </span>
  )
}

// ─── Modal nombre de grupo ────────────────────────────────────────────────────

function NombreGrupoModal({ taskA, taskB, onConfirm, onCancel }) {
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const truncate = (s, n) => s.length > n ? s.substring(0, n) + '…' : s

  async function handleConfirm() {
    if (!nombre.trim()) return
    setSaving(true)
    await onConfirm(nombre.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Nombre del grupo</h3>
        <p className="text-xs text-gray-500 mb-4">
          Agrupa "{truncate(taskA.tarea, 35)}" y "{truncate(taskB.tarea, 35)}"
        </p>
        <input
          autoFocus
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && nombre.trim() && !saving && handleConfirm()}
          placeholder="Ej: Onboarding Ecuador"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 mb-4"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!nombre.trim() || saving}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creando...' : 'Crear grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DnD Row Components ───────────────────────────────────────────────────────

function GroupHeaderRow({ nombre, tareas, collapsed, onToggle }) {
  const { setNodeRef, isOver } = useDroppable({ id: `grupo:${nombre}` })
  const completed = tareas.filter(isFullyCompleted).length
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-colors ${isOver ? 'border-brand-200 bg-brand-100' : 'border-brand-100 bg-brand-50'}`}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-brand-600 text-white border-brand-700 hover:bg-brand-700 transition-colors select-none"
      >
        Grupo
        <span className="text-[10px] opacity-80">{collapsed ? '▶' : '▼'}</span>
      </button>
      <span className="font-bold text-brand-900 text-sm">{nombre}</span>
      <span className="text-xs text-brand-500">{completed}/{tareas.length} completadas</span>
      {isOver && <span className="ml-auto text-xs text-brand-600 font-medium">Soltar aquí</span>}
    </div>
  )
}

function DraggableTaskRow({ task, children }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: String(task.rowIndex) })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: String(task.rowIndex) })
  const setRef = useCallback(node => { setDragRef(node); setDropRef(node) }, [setDragRef, setDropRef])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      ref={setRef}
      {...attributes}
      {...listeners}
      className={`${rowHighlightClasses(task.prioridad)} bg-white rounded-xl border border-stone-200 shadow-sm flex items-start gap-2.5 px-3 py-2.5 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-40 shadow-none' : 'hover:shadow-md hover:-translate-y-px'}
        ${isOver && !isDragging ? 'ring-2 ring-brand-400 bg-brand-50/30' : ''}
        transition-shadow transition-transform duration-150`}
    >
      <span className="text-stone-300 mt-0.5 shrink-0 select-none text-xs leading-none">
        {isOver && !isDragging ? <span className="text-brand-600 font-bold">⊕</span> : '⠿'}
      </span>
      {children}
    </motion.div>
  )
}

function UngroupedDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'ungrouped' })
  return (
    <div
      ref={setNodeRef}
      className={`px-4 py-2 rounded-xl border-2 border-dashed text-xs transition-colors ${
        isOver ? 'border-stone-400 bg-stone-100 text-stone-700 font-medium' : 'border-stone-200 text-stone-400'
      }`}
    >
      ↑ Soltar aquí para quitar del grupo
    </div>
  )
}

// ─── Board task card (compact, for Kanban columns) ────────────────────────────

function BoardTaskCard({ task, onEdit, onDelete, indent }) {
  const isCompleted = isFullyCompleted(task)
  return (
    <div
      className={`flex-1 min-w-0 ${indent ? 'pl-2' : ''}`}
      onClick={() => onEdit(task)}
      style={{ cursor: 'pointer' }}
    >
      <div className="flex items-start gap-1 mb-1.5">
        <span className="text-sm font-medium text-stone-800 leading-snug line-clamp-2 flex-1">{task.tarea}</span>
        {isCompleted && (
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5 ml-0.5" title="Listo para archivar" />
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
        <CountryBadge pais={task.pais} />
        <DelayBadge dias={task.dias_retraso} />
        {task.fecha_mail && (
          <span className="text-[10px] text-stone-400">{task.fecha_mail}</span>
        )}
      </div>
      <div className="flex items-center gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
        <LinkCell url={task.mail}      title="Mail"          icon="✉️" />
        <LinkCell url={task.mail2}     title="Carpeta Drive" icon="📁" />
        <LinkCell url={task.documento} title="Documento"     icon="📄" />
        <div className="ml-auto flex gap-1">
          <button
            onClick={e => { e.stopPropagation(); onEdit(task) }}
            className="text-stone-300 hover:text-brand-600 transition-colors text-xs"
            title="Editar"
          >✏️</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(task) }}
            className="text-stone-300 hover:text-red-500 transition-colors text-xs"
            title="Eliminar"
          >🗑️</button>
        </div>
      </div>
    </div>
  )
}

// ─── Board column ─────────────────────────────────────────────────────────────

function BoardColumn({ prioridad, tasks, collapsedGroups, onToggleCollapse, onEdit, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id: `priority:${prioridad}` })
  const { groups, ungrouped } = groupTasks(tasks)
  const headerStyle = COLUMN_HEADER_STYLES[prioridad] || 'bg-gray-100 text-gray-700 border-gray-200'
  const borderStyle = COLUMN_BG_STYLES[prioridad] || 'border-gray-200'

  return (
    <div className={`flex flex-col min-w-[260px] w-[280px] shrink-0 rounded-2xl border ${borderStyle} bg-white/70 shadow-sm`}>
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-2xl border-b ${headerStyle}`}>
        <span className="font-bold text-sm">{prioridad}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 ${headerStyle.split(' ')[1]}`}>
          {tasks.length}
        </span>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 space-y-2 overflow-y-auto transition-colors ${
          isOver ? 'bg-brand-50/40' : ''
        }`}
        style={{ maxHeight: 'calc(100vh - 300px)', minHeight: '80px' }}
      >
        <AnimatePresence initial={false}>
          {ungrouped.map(task => (
            <DraggableTaskRow key={task.rowIndex} task={task}>
              <BoardTaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
            </DraggableTaskRow>
          ))}
          {Object.keys(groups).length > 0 && <UngroupedDropZone />}
          {Object.entries(groups).map(([nombre, tareas]) => {
            const collapsed = collapsedGroups[nombre]
            return (
              <Fragment key={nombre}>
                <GroupHeaderRow
                  nombre={nombre}
                  tareas={tareas}
                  collapsed={collapsed}
                  onToggle={() => onToggleCollapse(nombre)}
                />
                <AnimatePresence initial={false}>
                  {!collapsed && tareas.map(task => (
                    <DraggableTaskRow key={task.rowIndex} task={task}>
                      <BoardTaskCard task={task} onEdit={onEdit} onDelete={onDelete} indent />
                    </DraggableTaskRow>
                  ))}
                </AnimatePresence>
              </Fragment>
            )
          })}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="text-center py-8 text-stone-300 text-xs select-none">Sin tareas</div>
        )}
      </div>
    </div>
  )
}

// ─── Board container ──────────────────────────────────────────────────────────

function TareasBoard({ pendientes, collapsedGroups, onToggleCollapse, onEdit, onDelete }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1">
      {BOARD_PRIORITIES.map(prioridad => (
        <BoardColumn
          key={prioridad}
          prioridad={prioridad}
          tasks={pendientes.filter(t => t.prioridad === prioridad)}
          collapsedGroups={collapsedGroups}
          onToggleCollapse={onToggleCollapse}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

// ─── Card de tarea (lista finalizados) ────────────────────────────────────────

function TaskCard({ task, indent, isFinalizados, onFieldChange, onReopen, onArchive, onEdit, onDelete }) {
  return (
    <div className={`flex-1 min-w-0 ${indent ? 'pl-3' : ''}`}>
      {/* Línea 1: texto + país + fecha + retraso */}
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <span className="text-sm font-medium text-stone-800 leading-snug flex-1">{task.tarea}</span>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <CountryBadge pais={task.pais} />
          {task.fecha_mail && (
            <span className="text-[11px] text-stone-400 whitespace-nowrap">{task.fecha_mail}</span>
          )}
          <DelayBadge dias={task.dias_retraso} />
        </div>
      </div>

      {/* Línea 2: estados + links + acciones */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Prioridad */}
        {isFinalizados
          ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium whitespace-nowrap">{task.prioridad}</span>
          : <InlineDropdown value={task.prioridad} options={FIELD_OPTIONS.prioridad} onSave={v => onFieldChange(task, 'prioridad', v)} />
        }

        <span className="text-stone-200 text-xs select-none">·</span>

        {/* Lib. Intranet */}
        <span className="text-[10px] text-stone-400 font-medium">Lib.</span>
        {isFinalizados
          ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">{task.libreria_intranet}</span>
          : <InlineDropdown value={task.libreria_intranet} options={FIELD_OPTIONS.libreria_intranet} onSave={v => onFieldChange(task, 'libreria_intranet', v)} />
        }

        <span className="text-stone-200 text-xs select-none">·</span>

        {/* Documentación */}
        <span className="text-[10px] text-stone-400 font-medium">Doc.</span>
        {isFinalizados
          ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium whitespace-nowrap">{task.documentacion_inicial}</span>
          : <InlineDropdown value={task.documentacion_inicial} options={FIELD_OPTIONS.documentacion_inicial} onSave={v => onFieldChange(task, 'documentacion_inicial', v)} />
        }

        <span className="text-stone-200 text-xs select-none">·</span>

        {/* Finalizado */}
        <span className="text-[10px] text-stone-400 font-medium">Final.</span>
        {isFinalizados
          ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">{task.finalizado}</span>
          : <InlineDropdown value={task.finalizado} options={FIELD_OPTIONS.finalizado} onSave={v => onFieldChange(task, 'finalizado', v)} />
        }

        {/* Links + acciones — empujados a la derecha */}
        <div className="ml-auto flex items-center gap-1.5">
          <LinkCell url={task.mail}      title="Mail"          icon="✉️" />
          <LinkCell url={task.mail2}     title="Carpeta Drive" icon="📁" />
          <LinkCell url={task.documento} title="Documento"     icon="📄" />
          <span className="w-px h-3 bg-stone-200 mx-0.5" />
          <button onClick={() => onEdit(task)} className="text-stone-300 hover:text-brand-600 transition-colors text-sm leading-none" title="Editar">✏️</button>
          <button onClick={() => onDelete(task)} className="text-stone-300 hover:text-red-500 transition-colors text-sm leading-none" title="Eliminar">🗑️</button>
          {isFinalizados && (
            <button onClick={() => onReopen(task)} className="text-[11px] text-brand-600 hover:text-brand-700 font-medium whitespace-nowrap transition-colors ml-1">Reabrir →</button>
          )}
          {onArchive && (
            <button onClick={() => onArchive(task)} className="text-[11px] text-green-600 hover:text-green-700 font-medium whitespace-nowrap transition-colors ml-1">Archivar →</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Lista (finalizados y hecho) ───────────────────────────────────────────────

function TareasTable({
  tasks,
  isFinalizados = false,
  onFieldChange,
  onReopen,
  onArchive,
  onEdit,
  onDelete,
}) {
  if (!tasks?.length) {
    return (
      <div className="text-center py-16 text-stone-400">
        <div className="text-4xl mb-3">{isFinalizados ? '🎉' : '📋'}</div>
        <p className="font-medium">{isFinalizados ? 'No hay tareas finalizadas' : 'No hay tareas'}</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-2">
      {tasks.map((task, idx) => (
        <motion.div
          key={task.rowIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: 'easeOut', delay: idx * 0.03 }}
          className={`${rowHighlightClasses(task.prioridad)} bg-white rounded-xl border border-stone-200 shadow-sm flex items-start gap-2.5 px-4 py-3 hover:shadow-md transition-shadow transition-transform duration-150 ${isFinalizados ? 'opacity-75' : ''}`}
        >
          <div className="w-3 shrink-0" />
          <TaskCard
            task={task}
            indent={false}
            isFinalizados={isFinalizados}
            onFieldChange={onFieldChange}
            onReopen={onReopen}
            onArchive={onArchive}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </div>
  )
}

// ─── Modales de tarea ─────────────────────────────────────────────────────────

const PAIS_CREATE = ['', 'General', 'Argentina', 'Bolivia', 'Chile', 'Ecuador', 'Paraguay', 'Peru', 'Uruguay', 'Colombia', 'Venezuela']

function toSheetsDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function toInputDate(sheets) {
  if (!sheets) return ''
  const parts = sheets.split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
  return ''
}

function TareaFormModal({ title, initial = {}, onClose, onSave }) {
  const [tarea,     setTarea]     = useState(initial.tarea     || '')
  const [pais,      setPais]      = useState(initial.pais      || '')
  const [prioridad, setPrioridad] = useState(initial.prioridad || 'Alta')
  const [fecha,     setFecha]     = useState(toInputDate(initial.fecha_mail))
  const [mail,      setMail]      = useState(initial.mail      || '')
  const [mail2,     setMail2]     = useState(initial.mail2     || '')
  const [documento, setDocumento] = useState(initial.documento || '')
  const [grupo,     setGrupo]     = useState(initial.grupo     || '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function handleSave() {
    if (!tarea.trim()) { setError('La tarea es requerida'); return }
    setSaving(true); setError('')
    try {
      await onSave({
        tarea: tarea.trim(),
        pais,
        prioridad,
        fecha_mail: toSheetsDate(fecha),
        mail: mail.trim(),
        mail2: mail2.trim(),
        documento: documento.trim(),
        grupo: grupo.trim(),
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tarea <span className="text-red-400">*</span></label>
            <textarea
              autoFocus
              value={tarea}
              onChange={e => setTarea(e.target.value)}
              rows={2}
              placeholder="Descripción de la tarea..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
              <select value={prioridad} onChange={e => setPrioridad(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                {['Urgente','Alta','Firmando','Baja','Hecho','Solo documentación'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
              <select value={pais} onChange={e => setPais(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                {PAIS_CREATE.map(p => <option key={p} value={p}>{p || '—'}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
            <input
              type="text"
              value={grupo}
              onChange={e => setGrupo(e.target.value)}
              placeholder="Nombre del grupo (opcional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Links (opcional)</p>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Email Link</label>
              <input type="url" value={mail} onChange={e => setMail(e.target.value)} placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Carpeta Drive</label>
              <input type="url" value={mail2} onChange={e => setMail2(e.target.value)} placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Documento</label>
              <input type="url" value={documento} onChange={e => setDocumento(e.target.value)} placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NuevaTareaModal({ onClose, onCreated }) {
  const [tarea,     setTarea]     = useState('')
  const [pais,      setPais]      = useState('')
  const [prioridad, setPrioridad] = useState('Alta')
  const [fecha,     setFecha]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function handleSave() {
    if (!tarea.trim()) { setError('La tarea es requerida'); return }
    setSaving(true)
    setError('')
    try {
      const fechaSheets = fecha ? fecha.split('-').reverse().join('/') : ''
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarea: tarea.trim(), pais, prioridad, fecha_mail: fechaSheets }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear')
      onCreated()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Nueva tarea</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tarea <span className="text-red-400">*</span></label>
            <textarea
              autoFocus
              value={tarea}
              onChange={e => setTarea(e.target.value)}
              rows={2}
              placeholder="Descripción de la tarea..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
              <select
                value={prioridad}
                onChange={e => setPrioridad(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {['Urgente', 'Alta', 'Firmando', 'Baja', 'Solo documentación'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
              <select
                value={pais}
                onChange={e => setPais(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {PAIS_CREATE.map(p => <option key={p} value={p}>{p || '—'}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Tareas() {
  const [tab, setTab]                   = useState('pendientes')
  const [pendientes, setPendientes]     = useState([])
  const [finalizados, setFinalizados]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [lastSync, setLastSync]         = useState(null)
  const [paisFilter, setPaisFilter]     = useState('Todos')
  const [sortBy, setSortBy]             = useState('prioridad')
  const [archiveTask, setArchiveTask]   = useState(null)
  const [reopenTask, setReopenTask]     = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [automationLoading, setAutomationLoading] = useState(false)
  const [showNewTask, setShowNewTask]   = useState(false)
  const [editTask, setEditTask]         = useState(null)
  const [deleteTask, setDeleteTask]     = useState(null)
  const [automationResult, setAutomationResult] = useState(null)
  const [activeId, setActiveId]         = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tareas_collapsedGroups') || '{}') } catch { return {} }
  })
  const [pendingGroup, setPendingGroup] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pRes, fRes] = await Promise.all([
        fetch('/api/tareas', { cache: 'no-store' }),
        fetch('/api/tareas/finalizados', { cache: 'no-store' }),
      ])
      if (!pRes.ok || !fRes.ok) throw new Error('Error al conectar con Google Sheets')
      const [p, f] = await Promise.all([pRes.json(), fRes.json()])
      setPendientes(p)
      setFinalizados(f)
      setLastSync(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleRunAutomation() {
    if (automationLoading) return
    setAutomationLoading(true)
    setError(null)
    const prevRowIndices = new Set(pendientes.map(t => t.rowIndex))
    try {
      const res = await fetch('/api/tareas/automatizar', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar automatización')

      const [pRes] = await Promise.all([
        fetch('/api/tareas', { cache: 'no-store' }),
        fetch('/api/tareas/finalizados', { cache: 'no-store' }),
      ])
      const [newPendientes, newFinalizados] = await Promise.all([pRes.json(), fetch('/api/tareas/finalizados', { cache: 'no-store' }).then(r => r.json())])
      setPendientes(newPendientes)
      setFinalizados(newFinalizados)
      setLastSync(new Date())

      const addedTasks = newPendientes.filter(t => !prevRowIndices.has(t.rowIndex))
      setAutomationResult({ message: data.message || null, addedTasks })
    } catch (err) {
      setError(err.message)
    } finally {
      setAutomationLoading(false)
    }
  }

  async function handleFieldChange(task, field, value) {
    const res = await fetch(`/api/tareas/${task.rowIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar')
    setPendientes(prev => prev.map(t =>
      t.rowIndex === task.rowIndex
        ? { ...data.task, grupo: data.task.grupo || t.grupo }
        : t
    ))
    if (data.readyToArchive) setArchiveTask({ ...data.task, grupo: data.task.grupo || task.grupo })
  }

  async function patchPrioridad(task, newPrioridad) {
    try {
      const res = await fetch(`/api/tareas/${task.rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'prioridad', value: newPrioridad }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setPendientes(prev => prev.map(t =>
        t.rowIndex === task.rowIndex ? { ...t, prioridad: newPrioridad } : t
      ))
    } catch (err) {
      setError('Error al cambiar prioridad: ' + err.message)
    }
  }

  async function handleArchiveConfirm() {
    if (!archiveTask || actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tareas/${archiveTask.rowIndex}/archive`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
      setArchiveTask(null)
    }
  }

  async function handleReopenConfirm() {
    if (!reopenTask || actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tareas/finalizados/${reopenTask.rowIndex}/reopen`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
      setReopenTask(null)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTask || actionLoading) return
    setActionLoading(true)
    try {
      const isFromFinalizados = finalizados.some(t => t.rowIndex === deleteTask.rowIndex)
      const url = isFromFinalizados
        ? `/api/tareas/finalizados/${deleteTask.rowIndex}`
        : `/api/tareas/${deleteTask.rowIndex}`
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
      setDeleteTask(null)
    }
  }

  async function handleEdit({ tarea, pais, prioridad, fecha_mail, mail, mail2, documento, grupo }) {
    const res = await fetch(`/api/tareas/${editTask.rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tarea, pais, prioridad, fecha_mail, mail, mail2, documento, grupo }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar')
    setPendientes(prev => prev.map(t => t.rowIndex === editTask.rowIndex ? data.task : t))
    setEditTask(null)
  }

  // ─── Group handlers ───────────────────────────────────────────────────────────

  function toggleCollapse(nombre) {
    setCollapsedGroups(prev => {
      const next = { ...prev, [nombre]: !prev[nombre] }
      localStorage.setItem('tareas_collapsedGroups', JSON.stringify(next))
      return next
    })
  }

  async function assignToGroup(task, grupoNombre) {
    try {
      const res = await fetch(`/api/tareas/${task.rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'grupo', value: grupoNombre }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setPendientes(prev => prev.map(t => t.rowIndex === task.rowIndex ? { ...t, grupo: grupoNombre } : t))
    } catch (err) {
      setError('Error al asignar grupo: ' + err.message)
    }
  }

  async function handleCreateGroup(grupoNombre) {
    const { taskA, taskB } = pendingGroup
    setPendingGroup(null)
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/tareas/${taskA.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'grupo', value: grupoNombre }),
        }),
        fetch(`/api/tareas/${taskB.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'grupo', value: grupoNombre }),
        }),
      ])
      if (!resA.ok || !resB.ok) {
        const errRes = !resA.ok ? resA : resB
        const d = await errRes.json()
        throw new Error(d.error || 'Error al crear grupo')
      }
      setPendientes(prev => prev.map(t =>
        t.rowIndex === taskA.rowIndex || t.rowIndex === taskB.rowIndex
          ? { ...t, grupo: grupoNombre }
          : t
      ))
    } catch (err) {
      setError('Error al crear grupo: ' + err.message)
    }
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return

    const overId = String(over.id)
    const draggedTask = pendientes.find(t => String(t.rowIndex) === String(active.id))
    if (!draggedTask) return

    // Drop on a priority column → change priority
    if (overId.startsWith('priority:')) {
      const newPrioridad = overId.replace('priority:', '')
      if (draggedTask.prioridad !== newPrioridad) {
        patchPrioridad(draggedTask, newPrioridad)
      }
      return
    }

    // Drop on ungrouped zone → remove from group
    if (overId === 'ungrouped') {
      if (draggedTask.grupo) assignToGroup(draggedTask, '')
      return
    }

    // Drop on group header → assign to group
    if (overId.startsWith('grupo:')) {
      const grupoNombre = overId.replace('grupo:', '')
      if (draggedTask.grupo !== grupoNombre) assignToGroup(draggedTask, grupoNombre)
      return
    }

    const targetTask = pendientes.find(t => String(t.rowIndex) === overId)
    if (!targetTask) return

    // Cross-column drop (different priority) → change priority to match target column
    if (draggedTask.prioridad !== targetTask.prioridad) {
      patchPrioridad(draggedTask, targetTask.prioridad)
      return
    }

    // Same priority: group logic
    if (draggedTask.grupo && !targetTask.grupo) {
      assignToGroup(draggedTask, '')
    } else if (targetTask.grupo && draggedTask.grupo !== targetTask.grupo) {
      assignToGroup(draggedTask, targetTask.grupo)
    } else if (!draggedTask.grupo && !targetTask.grupo) {
      setPendingGroup({ taskA: draggedTask, taskB: targetTask })
    }
  }

  // ─── Derived data ─────────────────────────────────────────────────────────────

  const sortFn = (a, b) => {
    if (sortBy === 'fecha') {
      const parse = s => {
        if (!s) return Infinity
        const [d, m, y] = s.split('/').map(Number)
        return y > 1900 ? new Date(y, m - 1, d).getTime() : Infinity
      }
      return parse(a.fecha_mail) - parse(b.fecha_mail)
    }
    if (sortBy === 'retraso') {
      return (b.dias_retraso ?? -Infinity) - (a.dias_retraso ?? -Infinity)
    }
    const pa = PRIORITY_ORDER[a.prioridad] ?? 3
    const pb = PRIORITY_ORDER[b.prioridad] ?? 3
    if (pa !== pb) return pa - pb
    return (b.dias_retraso ?? -Infinity) - (a.dias_retraso ?? -Infinity)
  }

  const boardPendientes = pendientes
    .filter(t => paisFilter === 'Todos' || t.pais === paisFilter)
    .filter(t => t.prioridad !== 'Hecho')
    .sort(sortFn)

  const hechoTasks = pendientes
    .filter(t => t.prioridad === 'Hecho')
    .filter(t => paisFilter === 'Todos' || t.pais === paisFilter)
    .sort(sortFn)

  const hechoCount = pendientes.filter(t => t.prioridad === 'Hecho').length
  const lastSyncText = lastSync
    ? lastSync.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="p-4">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4 max-w-5xl mx-auto">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#1c2711' }}>Tareas pendientes</h2>
          {lastSyncText && (
            <p className="text-xs text-stone-400 mt-0.5">Sincronizado a las {lastSyncText}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRunAutomation}
            disabled={automationLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 border border-brand-100 text-brand-700 text-sm font-semibold rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50 ${automationLoading ? 'animate-pulse' : ''}`}
          >
            {automationLoading ? (
              <><span className="animate-spin inline-block text-xs">🧠</span>IA Analizando...</>
            ) : (
              <><span>🚀</span>Automatizar</>
            )}
          </button>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
          >
            + Nueva tarea
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin inline-block' : ''}>↻</span>
            Actualizar
          </button>
        </div>
      </div>

      {/* Bento stats */}
      {!loading && (
        <div className="grid grid-cols-4 gap-3 mb-5 max-w-5xl mx-auto">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Total activas</div>
            <div className="text-4xl font-bold leading-none" style={{ color: '#c9a84c' }}>{pendientes.length}</div>
            <div className="text-xs text-stone-400 mt-1.5">tareas pendientes</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Urgentes</div>
            <div className="text-3xl font-bold text-red-600 leading-none">{pendientes.filter(t => t.prioridad === 'Urgente').length}</div>
            <div className="text-xs text-stone-400 mt-1.5">requieren atención inmediata</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">En retraso</div>
            <div className="text-3xl font-bold text-amber-600 leading-none">{pendientes.filter(t => (t.dias_retraso ?? 0) > 0).length}</div>
            <div className="text-xs text-stone-400 mt-1.5">fuera de fecha límite</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-stone-400 uppercase tracking-widest mb-3">Distribución</div>
            <div className="space-y-1.5">
              {[
                { label: 'Urgente', value: pendientes.filter(t => t.prioridad === 'Urgente').length, color: '#dc2626' },
                { label: 'Alta',    value: pendientes.filter(t => t.prioridad === 'Alta').length,    color: '#f59e0b' },
                { label: 'Baja',    value: pendientes.filter(t => t.prioridad === 'Baja').length,    color: '#4a6741' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-10 text-[10px] text-stone-500 shrink-0">{label}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: pendientes.length > 0 ? `${Math.round(value / pendientes.length * 100)}%` : '0%', backgroundColor: color }} />
                  </div>
                  <span className="w-4 text-[10px] text-stone-400 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between max-w-5xl mx-auto">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-stone-100 p-1 rounded-xl w-fit max-w-5xl mx-auto">
        {[
          { key: 'pendientes', label: `Pendientes (${boardPendientes.length})` },
          { key: 'hecho', label: `Hecho / Finalizados${(hechoCount + finalizados.length) ? ` (${hechoCount + finalizados.length})` : ''}` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">País</label>
          <select
            value={paisFilter}
            onChange={e => setPaisFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {PAIS_OPTIONS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        {paisFilter !== 'Todos' && (
          <button
            onClick={() => setPaisFilter('Todos')}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Limpiar filtro
          </button>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-400 font-medium">Ordenar:</span>
          {[
            { key: 'prioridad', label: 'Prioridad' },
            { key: 'fecha',     label: 'Fecha' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sortBy === key
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-stone-400">
          <span className="animate-spin mr-2 text-xl">↻</span>
          Cargando desde Google Sheets...
        </div>
      ) : tab === 'pendientes' ? (
        <DndContext
          sensors={sensors}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={(e) => { setActiveId(null); handleDragEnd(e) }}
          onDragCancel={() => setActiveId(null)}
        >
          <TareasBoard
            pendientes={boardPendientes}
            collapsedGroups={collapsedGroups}
            onToggleCollapse={toggleCollapse}
            onEdit={setEditTask}
            onDelete={setDeleteTask}
          />
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeId ? (() => {
              const task = pendientes.find(t => String(t.rowIndex) === String(activeId))
              if (!task) return null
              return (
                <div
                  className={`${rowHighlightClasses(task.prioridad)} bg-white rounded-xl border border-stone-200 flex items-start gap-2.5 px-3 py-2.5`}
                  style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.18)', transform: 'rotate(1.5deg) scale(1.02)', opacity: 0.97, width: '260px' }}
                >
                  <span className="text-brand-400 mt-0.5 shrink-0 text-xs leading-none select-none">⠿</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-stone-800 leading-snug line-clamp-2">{task.tarea}</span>
                    <div className="flex items-center gap-2 mt-1">
                      {task.pais && <CountryBadge pais={task.pais} />}
                      <DelayBadge dias={task.dias_retraso} />
                    </div>
                  </div>
                </div>
              )
            })() : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Sección: Hecho (pendientes de archivar) */}
          {hechoTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-bold text-green-700">Hecho — pendientes de archivar</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">{hechoTasks.length}</span>
              </div>
              <div className="rounded-2xl border border-green-100 bg-green-50/30">
                <TareasTable
                  tasks={hechoTasks}
                  isFinalizados={false}
                  onFieldChange={handleFieldChange}
                  onArchive={task => setArchiveTask(task)}
                  onEdit={setEditTask}
                  onDelete={setDeleteTask}
                />
              </div>
            </div>
          )}

          {/* Sección: Finalizados archivados */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-bold text-stone-500">Finalizados archivados</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-semibold">{finalizados.length}</span>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50/60">
              <TareasTable
                tasks={finalizados}
                isFinalizados
                onReopen={setReopenTask}
                onEdit={setEditTask}
                onDelete={setDeleteTask}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirmar archivado */}
      {archiveTask && (
        <ConfirmModal
          task={archiveTask}
          onConfirm={handleArchiveConfirm}
          onCancel={() => setArchiveTask(null)}
        />
      )}

      {/* Modal: confirmar reapertura */}
      {reopenTask && (
        <ReopenModal
          task={reopenTask}
          onConfirm={handleReopenConfirm}
          onCancel={() => setReopenTask(null)}
        />
      )}

      {/* Modal: confirmar eliminación */}
      {deleteTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-2xl mb-3 text-center">🗑️</div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">Eliminar tarea</h3>
            <p className="text-sm text-gray-600 text-center mb-1">
              ¿Seguro que querés eliminar esta tarea?
            </p>
            <p className="text-sm font-medium text-gray-800 text-center mb-5 px-2">
              "{deleteTask.tarea}"
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTask(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nueva tarea */}
      {showNewTask && (
        <NuevaTareaModal
          onClose={() => setShowNewTask(false)}
          onCreated={() => { setShowNewTask(false); fetchAll() }}
        />
      )}

      {/* Modal: editar tarea */}
      {editTask && (
        <TareaFormModal
          title="Editar tarea"
          initial={editTask}
          onClose={() => setEditTask(null)}
          onSave={handleEdit}
        />
      )}

      {/* Modal: nombre de grupo */}
      {pendingGroup && (
        <NombreGrupoModal
          taskA={pendingGroup.taskA}
          taskB={pendingGroup.taskB}
          onConfirm={handleCreateGroup}
          onCancel={() => setPendingGroup(null)}
        />
      )}

      {/* Modal: resultado automatización */}
      {automationResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                style={{ background: 'linear-gradient(135deg, #f0f4e8, #d4e0c0)' }}>
                🚀
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Automatización completada</h3>
                <p className="text-xs text-stone-400">Análisis de correos finalizado</p>
              </div>
            </div>

            {automationResult.message && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700 mb-4 leading-relaxed">
                {automationResult.message}
              </div>
            )}

            {automationResult.addedTasks.length > 0 ? (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                  {automationResult.addedTasks.length} tarea{automationResult.addedTasks.length > 1 ? 's' : ''} nueva{automationResult.addedTasks.length > 1 ? 's' : ''} agregada{automationResult.addedTasks.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {automationResult.addedTasks.map(t => (
                    <div key={t.rowIndex} className={`${rowHighlightClasses(t.prioridad)} bg-white rounded-lg border border-stone-200 px-3 py-2`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-stone-800 leading-snug flex-1">{t.tarea}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {t.pais && <CountryBadge pais={t.pais} />}
                        </div>
                      </div>
                      {t.prioridad && (
                        <span className="text-[10px] text-stone-400 mt-0.5 block">{t.prioridad}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
                <span>📭</span>
                <span>No se agregaron tareas nuevas esta vez.</span>
              </div>
            )}

            <button
              onClick={() => setAutomationResult(null)}
              className="w-full px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

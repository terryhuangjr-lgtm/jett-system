import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { StatusBadge } from './ui/StatusBadge'
import { Clock, CheckCircle } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  task_type: string
  priority: string
  due_date: string | null
  status: string
  address: string | null
  unit_number: string | null
  tenant_name: string | null
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
    const channel = supabase.channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadTasks)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadTasks() {
    try {
      const { data } = await supabase.from('open_tasks_by_priority').select('*')
      setTasks(data || [])
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  async function markComplete(taskId: string) {
    setUpdating(taskId)
    try {
      await supabase.from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString()
      }).eq('id', taskId)
      // Also log activity
      await supabase.from('activity_log').insert({
        action: 'Task completed',
        details: `Task completed: ${tasks.find(t => t.id === taskId)?.title}`,
        source: 'manual'
      })
      // Refresh
      setTimeout(loadTasks, 300)
    } catch (err) {
      console.error('Failed to complete task:', err)
    } finally {
      setUpdating(null)
    }
  }

  const filtered = tasks.filter(t => {
    if (filter === 'overdue' && t.due_date && new Date(t.due_date) >= new Date()) return false
    if (filter === 'today' && t.due_date && new Date(t.due_date).toDateString() !== new Date().toDateString()) return false
    if (filter === 'all_tasks') return true
    if (filter === 'all') return true
    return true
  }).filter(t => {
    if (typeFilter === 'all') return true
    return t.task_type === typeFilter
  })

  const taskTypes = [...new Set(tasks.map(t => t.task_type).filter(Boolean))]

  if (loading) return <div className="loading-state"><Clock /> <p>Loading tasks...</p></div>

  return (
    <div>
      <div className="page-header">
        <h1>Tasks</h1>
        <p>{tasks.length} open tasks • {tasks.filter(t => t.priority === 'urgent').length} urgent</p>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>Overdue</button>
        <button className={`filter-btn ${filter === 'today' ? 'active' : ''}`} onClick={() => setFilter('today')}>Due Today</button>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>All Types</button>
        {taskTypes.map(type => (
          <button
            key={type}
            className={`filter-btn ${typeFilter === type ? 'active' : ''}`}
            onClick={() => setTypeFilter(type)}
          >
            {type.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div className="empty-state"><CheckCircle /> <p>No tasks match the current filters</p></div>
        )}
        {filtered.map(t => {
          const isOverdue = t.due_date && new Date(t.due_date) < new Date()
          return (
            <div key={t.id} className="property-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => markComplete(t.id)}
                disabled={updating === t.id}
                style={{
                  background: 'none', border: '2px solid var(--border)',
                  borderRadius: 6, width: 24, height: 24, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: 'var(--text-muted)'
                }}
                title="Mark complete"
              >
                {updating === t.id ? '...' : ''}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={`priority-dot priority-${t.priority}`} />
                  <span style={{ fontWeight: 600 }}>{t.title}</span>
                  <StatusBadge status={t.task_type} variant="gray" />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 12 }}>
                  {t.address && <span>{t.address}</span>}
                  {t.tenant_name && <span>Tenant: {t.tenant_name}</span>}
                  {t.due_date && (
                    <span style={{ color: isOverdue ? 'var(--red)' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                      Due: {new Date(t.due_date).toLocaleDateString()}
                      {isOverdue ? ' (overdue)' : ''}
                    </span>
                  )}
                </div>
              </div>
              <span className={`badge ${t.priority === 'urgent' ? 'badge-red' : t.priority === 'high' ? 'badge-yellow' : t.priority === 'medium' ? 'badge-blue' : 'badge-gray'}`}>
                {t.priority}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

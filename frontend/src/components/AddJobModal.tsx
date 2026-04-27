import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import type { UrlFetchResult } from '../api/client'

interface Props {
  onClose: () => void
}

export default function AddJobModal({ onClose }: Props) {
  const [tab, setTab] = useState<'url' | 'manual'>('url')
  const qc = useQueryClient()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Job</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="tabs">
            <button className={`tab ${tab === 'url' ? 'active' : ''}`} onClick={() => setTab('url')}>
              Paste URL
            </button>
            <button className={`tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
              Manual Entry
            </button>
          </div>
          {tab === 'url' ? (
            <UrlTab onClose={onClose} onSuccess={() => { qc.invalidateQueries({ queryKey: ['jobs'] }); onClose() }} />
          ) : (
            <ManualTab onSuccess={() => { qc.invalidateQueries({ queryKey: ['jobs'] }); onClose() }} />
          )}
        </div>
      </div>
    </div>
  )
}

function UrlTab({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<UrlFetchResult | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', company: '', location: '', salary_range: '', jd_text: '' })
  const [error, setError] = useState('')

  const fetchMutation = useMutation({
    mutationFn: (u: string) => api.jobs.fetchUrl(u),
    onSuccess: (data) => { setPreview(data); setEditMode(false); setError('') },
    onError: (e: Error) => setError(e.message),
  })

  const setEdit = (k: keyof typeof editForm, v: string) => setEditForm(f => ({ ...f, [k]: v }))

  const enterEdit = () => {
    setEditForm({
      title: preview!.title ?? '',
      company: preview!.company ?? '',
      location: preview!.location ?? '',
      salary_range: preview!.salary_range ?? '',
      jd_text: preview!.jd_text ?? '',
    })
    setEditMode(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const base = {
        url: preview!.url,
        platform: preview!.platform,
      }
      if (editMode) {
        return api.jobs.create({
          ...base,
          title: editForm.title,
          company: editForm.company,
          location: editForm.location || undefined,
          salary_range: editForm.salary_range || undefined,
          jd_text: editForm.jd_text || undefined,
        })
      }
      return api.jobs.create({
        ...base,
        company: preview!.company,
        title: preview!.title,
        jd_text: preview!.jd_text,
        location: preview!.location ?? undefined,
        salary_range: preview!.salary_range ?? undefined,
      })
    },
    onSuccess: () => { toast.success('Job added!'); onSuccess() },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div>
      <div className="form-group">
        <label>Job posting URL (Greenhouse, Ashby, LinkedIn)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://boards.greenhouse.io/..."
            onKeyDown={e => e.key === 'Enter' && fetchMutation.mutate(url)}
          />
          <button
            className="btn-primary"
            style={{ whiteSpace: 'nowrap' }}
            disabled={!url || fetchMutation.isPending}
            onClick={() => fetchMutation.mutate(url)}
          >
            {fetchMutation.isPending ? <><span className="spinner" />Fetching</> : 'Fetch'}
          </button>
        </div>
        {error && (
          <div>
            <p className="error-msg">{error}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
              LinkedIn blocked? Use <strong>Manual Entry</strong> and paste the JD.
            </p>
          </div>
        )}
      </div>

      {preview && !editMode && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{preview.platform}</span>
            <button className="btn-ghost btn-sm" onClick={enterEdit}>Edit details</button>
          </div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{preview.title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{preview.company}</div>
          {preview.location && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{preview.location}</div>}
          <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 12, maxHeight: 80, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent)' }}>
            {preview.jd_text?.slice(0, 300)}...
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn-primary"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <><span className="spinner" />Saving...</> : 'Save Job'}
            </button>
          </div>
        </div>
      )}

      {preview && editMode && (
        <div style={{ marginTop: 8 }}>
          <div className="form-row">
            <div className="form-group">
              <label>Role / Title *</label>
              <input value={editForm.title} onChange={e => setEdit('title', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Company *</label>
              <input value={editForm.company} onChange={e => setEdit('company', e.target.value)} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <input value={editForm.location} onChange={e => setEdit('location', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Salary Range</label>
              <input value={editForm.salary_range} onChange={e => setEdit('salary_range', e.target.value)} placeholder="e.g. $120k–$160k" />
            </div>
          </div>
          <div className="form-group">
            <label>Job Description</label>
            <textarea rows={8} value={editForm.jd_text} onChange={e => setEdit('jd_text', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setEditMode(false)}>Back to preview</button>
            <button
              className="btn-primary"
              disabled={saveMutation.isPending || !editForm.title || !editForm.company}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <><span className="spinner" />Saving...</> : 'Save Job'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ManualTab({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    company: '', title: '', url: '', location: '',
    salary_range: '', jd_text: '', notes: '', is_remote: false,
  })

  const mutation = useMutation({
    mutationFn: () => api.jobs.create({ ...form, platform: 'manual' }),
    onSuccess: () => { toast.success('Job added!'); onSuccess() },
    onError: (e: Error) => toast.error(e.message),
  })

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate() }}>
      <div className="form-row">
        <div className="form-group">
          <label>Company *</label>
          <input required value={form.company} onChange={e => set('company', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Role / Title *</label>
          <input required value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Job URL</label>
          <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." />
        </div>
        <div className="form-group">
          <label>Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Job Description (paste here)</label>
        <textarea
          rows={8}
          value={form.jd_text}
          onChange={e => set('jd_text', e.target.value)}
          placeholder="Paste the full job description..."
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Salary Range</label>
          <input value={form.salary_range} onChange={e => set('salary_range', e.target.value)} placeholder="e.g. $120k–$160k" />
        </div>
        <div className="form-group" style={{ justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.is_remote}
              onChange={e => set('is_remote', e.target.checked)}
              style={{ width: 'auto' }}
            />
            Remote role
          </label>
        </div>
      </div>
      <div className="form-group">
        <label>Notes</label>
        <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? <><span className="spinner" />Saving...</> : 'Save Job'}
        </button>
      </div>
    </form>
  )
}

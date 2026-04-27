import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import type { Job, JobStatus } from '../api/client'
import ResumeSection from './ResumeSection'
import DocumentsSection from './DocumentsSection'

interface Props {
  jobId: number
  onClose: () => void
}

const STATUSES: JobStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected']

export default function JobDetailDrawer({ jobId, onClose }: Props) {
  const qc = useQueryClient()
  const [expandJD, setExpandJD] = useState(false)
  const [editNotes, setEditNotes] = useState(false)
  const [notes, setNotes] = useState('')

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.jobs.get(jobId),
  })

  const updateMutation = useMutation({
    mutationFn: (body: Partial<Job>) => api.jobs.update(jobId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['job', jobId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.jobs.delete(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast.success('Job deleted')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveNotes = () => {
    updateMutation.mutate({ notes })
    setEditNotes(false)
    toast.success('Notes saved')
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            {isLoading ? (
              <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
            ) : job ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>{job.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{job.company}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {job.location && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{job.location}</span>
                  )}
                  {job.is_remote && (
                    <span style={{ fontSize: 11, background: 'rgba(29,233,182,0.1)', color: 'var(--success)', borderRadius: 4, padding: '2px 6px' }}>Remote</span>
                  )}
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>View Posting ↗</a>
                  )}
                </div>
              </>
            ) : null}
          </div>
          <button className="modal-close" style={{ fontSize: 22 }} onClick={onClose}>×</button>
        </div>

        <div className="drawer-body">
          {job && (
            <>
              {/* Status + Actions */}
              <div className="section">
                <div className="section-title">Status</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => updateMutation.mutate({ status: s })}
                      style={{
                        background: job.status === s ? `var(--status-${s})` : 'var(--surface2)',
                        color: job.status === s ? '#000' : 'var(--text-muted)',
                        border: `1px solid ${job.status === s ? `var(--status-${s})` : 'var(--border)'}`,
                        borderRadius: 20,
                        padding: '4px 14px',
                        fontSize: 12,
                        fontWeight: job.status === s ? 700 : 400,
                        textTransform: 'capitalize',
                        opacity: updateMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {job.salary_range && (
                  <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                    Salary: {job.salary_range}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="section-title" style={{ marginBottom: 0 }}>Notes</span>
                  {!editNotes && (
                    <button className="btn-ghost btn-sm" onClick={() => { setNotes(job.notes ?? ''); setEditNotes(true) }}>
                      Edit
                    </button>
                  )}
                </div>
                {editNotes ? (
                  <div>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={4}
                      style={{ marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn-ghost btn-sm" onClick={() => setEditNotes(false)}>Cancel</button>
                      <button className="btn-primary btn-sm" onClick={saveNotes}>Save</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: job.notes ? 'var(--text)' : 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {job.notes || 'No notes yet. Click Edit to add some.'}
                  </p>
                )}
              </div>

              {/* Contact */}
              {(job.contact_name || job.contact_email) && (
                <div className="section">
                  <div className="section-title">Contact</div>
                  {job.contact_name && <div style={{ fontSize: 13 }}>{job.contact_name}</div>}
                  {job.contact_email && <div style={{ fontSize: 13, color: 'var(--accent)' }}>{job.contact_email}</div>}
                </div>
              )}

              {/* Job Description */}
              {job.jd_text && (
                <div className="section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span className="section-title" style={{ marginBottom: 0 }}>Job Description</span>
                    <button className="btn-ghost btn-sm" onClick={() => setExpandJD(e => !e)}>
                      {expandJD ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    maxHeight: expandJD ? 'none' : 120,
                    overflow: expandJD ? 'visible' : 'hidden',
                    maskImage: expandJD ? 'none' : 'linear-gradient(to bottom, black 60%, transparent)',
                  }}>
                    {job.jd_text}
                  </div>
                </div>
              )}

              {/* Resume */}
              <ResumeSection jobId={jobId} company={job.company} title={job.title} />

              {/* Documents */}
              <DocumentsSection jobId={jobId} />

              {/* Danger zone */}
              <div className="section">
                <div className="section-title">Danger Zone</div>
                <button
                  className="btn-danger btn-sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete ${job.company} – ${job.title}?`)) deleteMutation.mutate()
                  }}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Application'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

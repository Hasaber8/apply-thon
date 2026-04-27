import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Job } from '../api/client'
import JobCard from './JobCard'
import AddJobModal from './AddJobModal'
import JobDetailDrawer from './JobDetailDrawer'
import UploadResumeModal from './UploadResumeModal'

const STATUSES = ['all', 'saved', 'applied', 'interview', 'offer', 'rejected']

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', statusFilter, search],
    queryFn: () =>
      api.jobs.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      }),
  })

  const jobs = data?.items ?? []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Apply<span style={{ color: 'var(--accent)' }}>-thon</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
            {data?.total ?? 0} applications tracked
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setShowUpload(true)}>
            Upload Resume
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + Add Job
          </button>
        </div>
      </header>

      <div style={{ padding: '20px 32px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            placeholder="Search company or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  background: statusFilter === s ? 'var(--accent)' : 'var(--surface)',
                  color: statusFilter === s ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div style={{ color: 'var(--text-muted)', padding: '40px 0' }}>Loading...</div>
        )}
        {error && (
          <div className="error-msg" style={{ padding: '20px 0' }}>
            Failed to load jobs. Is the backend running?
          </div>
        )}
        {!isLoading && jobs.length === 0 && (
          <div className="empty-state">
            <h3>No applications yet</h3>
            <p>Click "Add Job" to start tracking your applications.</p>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onClick={() => setSelectedJob(job)}
            />
          ))}
        </div>
      </div>

      {showAdd && <AddJobModal onClose={() => setShowAdd(false)} />}
      {showUpload && <UploadResumeModal onClose={() => setShowUpload(false)} />}
      {selectedJob && (
        <JobDetailDrawer
          jobId={selectedJob.id}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import type { Document } from '../api/client'

interface Props {
  jobId: number
}

export default function DocumentsSection({ jobId }: Props) {
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['documents', jobId],
    queryFn: () => api.ai.getDocuments(jobId),
  })

  const coverMutation = useMutation({
    mutationFn: () => api.ai.coverLetter(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', jobId] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast.success('Cover letter generated!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const emailMutation = useMutation({
    mutationFn: () => api.ai.coldEmail(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', jobId] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast.success('Cold email generated!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="section">
      <div className="section-title">AI-Generated Documents</div>
      <DocPanel
        title="Cover Letter"
        doc={data?.cover_letter ?? null}
        generating={coverMutation.isPending}
        onGenerate={() => coverMutation.mutate()}
        jobId={jobId}
      />
      <DocPanel
        title="Cold Email"
        doc={data?.cold_email ?? null}
        generating={emailMutation.isPending}
        onGenerate={() => emailMutation.mutate()}
        jobId={jobId}
      />
    </div>
  )
}

function DocPanel({
  title, doc, generating, onGenerate, jobId,
}: {
  title: string
  doc: Document | null
  generating: boolean
  onGenerate: () => void
  jobId: number
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState('')

  const saveMutation = useMutation({
    mutationFn: () => api.ai.updateDocument(doc!.id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', jobId] })
      setEditing(false)
      toast.success('Saved!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard!'))
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {doc && (
            <>
              <button className="btn-ghost btn-sm" onClick={() => copyToClipboard(doc.content)}>
                Copy
              </button>
              <button
                className="btn-ghost btn-sm"
                onClick={() => { setContent(doc.content); setEditing(e => !e) }}
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </>
          )}
          <button
            className="btn-primary btn-sm"
            disabled={generating}
            onClick={onGenerate}
          >
            {generating
              ? <><span className="spinner" />{doc ? 'Regenerating...' : 'Generating...'}</>
              : doc ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>

      {generating && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6 }}>
          Claude is writing your {title.toLowerCase()}...
        </div>
      )}

      {!doc && !generating && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Click "Generate" to create a tailored {title.toLowerCase()}.
        </p>
      )}

      {doc && !generating && !editing && (
        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '12px 14px',
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          maxHeight: 220,
          overflow: 'auto',
          color: 'var(--text)',
        }}>
          {doc.content}
        </div>
      )}

      {editing && (
        <div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ minHeight: 180, fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button
              className="btn-primary btn-sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <><span className="spinner" />Saving...</> : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

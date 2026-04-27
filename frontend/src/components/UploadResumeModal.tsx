import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'

interface Props {
  onClose: () => void
}

export default function UploadResumeModal({ onClose }: Props) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const mutation = useMutation({
    mutationFn: () => api.resumes.uploadDocx(file!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resume-base'] })
      toast.success('Base resume uploaded and converted to LaTeX!')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Base Resume</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
            Upload your resume as a <strong>.docx</strong> file. It will be converted to LaTeX,
            which Claude uses to tailor it for each job application while preserving your
            accomplishments and design.
          </p>
          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 8,
              padding: '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              background: file ? 'oklch(68% 0.11 195 / 0.06)' : 'transparent',
            }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".docx"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ fontWeight: 600 }}>{file.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  {(file.size / 1024).toFixed(0)} KB — click to change
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
                <div style={{ fontWeight: 500 }}>Click to select your resume.docx</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Only .docx files supported</div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!file || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <><span className="spinner" />Converting...</> : 'Upload & Convert'}
          </button>
        </div>
      </div>
    </div>
  )
}

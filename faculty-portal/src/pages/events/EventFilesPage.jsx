import { useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'
import toast from 'react-hot-toast'
import { ChevronLeft, Upload, Trash2, RefreshCw, FileText, Image, ExternalLink } from 'lucide-react'

// ── Field config ───────────────────────────────────────────────────

const FIELDS = [
  {
    key:    'bannerImage',
    label:  'Banner Image',
    accept: 'image/jpeg,image/png',
    icon:   Image,
    hint:   'JPG or PNG, max 10MB. Displayed as the event hero image.',
    uploadField: 'bannerImage',
  },
  {
    key:    'posterImage',
    label:  'Poster Image',
    accept: 'image/jpeg,image/png',
    icon:   Image,
    hint:   'JPG or PNG, max 10MB. Used in event cards and listings.',
    uploadField: 'posterImage',
  },
  {
    key:    'brochurePdf',
    label:  'Brochure PDF',
    accept: 'application/pdf',
    icon:   FileText,
    hint:   'PDF, max 10MB. Event overview document for participants.',
    uploadField: 'brochurePdf',
  },
  {
    key:    'rulebookPdf',
    label:  'Rulebook PDF',
    accept: 'application/pdf',
    icon:   FileText,
    hint:   'PDF, max 10MB. Rules and guidelines for participants.',
    uploadField: 'rulebookPdf',
  },
]

// ── Helpers ────────────────────────────────────────────────────────

const isImage = (url) => url && /\.(jpg|jpeg|png)$/i.test(url)

const FilePreview = ({ url, label }) => {
  if (!url) return null
  return isImage(url) ? (
    <img src={url} alt={label}
      className="w-full h-32 object-cover rounded-lg border border-border" />
  ) : (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
      <ExternalLink size={14} /> View {label}
    </a>
  )
}

// ── Single file field card ─────────────────────────────────────────

const FileCard = ({ fieldCfg, fileData, eventId, onMutate }) => {
  const inputRef  = useRef(null)
  const qc        = useQueryClient()
  const { key, label, accept, icon: Icon, hint, uploadField } = fieldCfg
  const exists    = fileData?.exists ?? false

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append(uploadField, file)
      return eventApi.uploadDocuments(eventId, fd)
    },
    onSuccess: () => {
      toast.success(`${label} uploaded`)
      qc.invalidateQueries(['event-files', eventId])
      onMutate()
    },
    onError: (err) => toast.error(err.response?.data?.message ?? `Failed to upload ${label}`),
  })

  const deleteMutation = useMutation({
    mutationFn: () => eventApi.deleteFile(eventId, { field: key }),
    onSuccess: () => {
      toast.success(`${label} deleted`)
      qc.invalidateQueries(['event-files', eventId])
      onMutate()
    },
    onError: (err) => toast.error(err.response?.data?.message ?? `Failed to delete ${label}`),
  })

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadMutation.mutate(file)
    e.target.value = ''
  }

  const isPending = uploadMutation.isPending || deleteMutation.isPending

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-muted" />
          <span className="text-sm font-semibold text-ink">{label}</span>
          {exists && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Uploaded</span>
          )}
        </div>
        {exists && (
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={isPending}
            className="text-muted hover:text-danger transition-colors disabled:opacity-40"
            title={`Delete ${label}`}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <p className="text-xs text-muted">{hint}</p>

      {exists && <FilePreview url={fileData.url} label={label} />}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        size="sm"
        variant={exists ? 'secondary' : 'primary'}
        loading={uploadMutation.isPending}
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {exists ? (
          <><RefreshCw size={13} /> Replace</>
        ) : (
          <><Upload size={13} /> Upload</>
        )}
      </Button>
    </div>
  )
}

// ── Workshop materials section ─────────────────────────────────────

const WorkshopMaterialsCard = ({ materials = [], eventId, onMutate }) => {
  const inputRef    = useRef(null)
  const replaceRef  = useRef(null)
  const [replaceIdx, setReplaceIdx] = useState(null)
  const qc          = useQueryClient()

  const appendMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('workshopMaterials', file)
      return eventApi.uploadDocuments(eventId, fd)
    },
    onSuccess: () => {
      toast.success('Workshop material added')
      qc.invalidateQueries(['event-files', eventId])
      onMutate()
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (index) => eventApi.deleteFile(eventId, { field: 'workshopMaterials', index }),
    onSuccess: () => {
      toast.success('Workshop material deleted')
      qc.invalidateQueries(['event-files', eventId])
      onMutate()
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Delete failed'),
  })

  const replaceMutation = useMutation({
    mutationFn: ({ index, file }) => {
      const fd = new FormData()
      fd.append('workshopMaterials', file)
      fd.append('index', index)
      return eventApi.replaceWorkshop(eventId, fd)
    },
    onSuccess: () => {
      toast.success('Workshop material replaced')
      setReplaceIdx(null)
      qc.invalidateQueries(['event-files', eventId])
      onMutate()
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Replace failed'),
  })

  const handleAppend = (e) => {
    const file = e.target.files?.[0]
    if (file) appendMutation.mutate(file)
    e.target.value = ''
  }

  const handleReplace = (e) => {
    const file = e.target.files?.[0]
    if (file && replaceIdx !== null) replaceMutation.mutate({ index: replaceIdx, file })
    e.target.value = ''
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-muted" />
          <span className="text-sm font-semibold text-ink">Workshop Materials</span>
          <span className="text-xs text-muted">({materials.length}/5)</span>
        </div>
        {materials.length < 5 && (
          <Button
            size="sm"
            loading={appendMutation.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={13} /> Add PDF
          </Button>
        )}
      </div>

      <p className="text-xs text-muted">PDF files, max 10MB each. Up to 5 materials.</p>

      {materials.length === 0 ? (
        <p className="text-xs text-muted text-center py-4">No workshop materials uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {materials.map((mat, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
              <a href={mat.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm text-brand-600 hover:underline min-w-0 truncate">
                <FileText size={13} />
                Material {i + 1}
                <ExternalLink size={11} />
              </a>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => { setReplaceIdx(i); replaceRef.current?.click() }}
                  disabled={replaceMutation.isPending || deleteMutation.isPending}
                  className="p-1.5 text-muted hover:text-ink rounded transition-colors disabled:opacity-40"
                  title="Replace"
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(i)}
                  disabled={deleteMutation.isPending || replaceMutation.isPending}
                  className="p-1.5 text-muted hover:text-danger rounded transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef}   type="file" accept="application/pdf" className="hidden" onChange={handleAppend} />
      <input ref={replaceRef} type="file" accept="application/pdf" className="hidden" onChange={handleReplace} />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────

const EventFilesPage = () => {
  const { id }  = useParams()
  const qc      = useQueryClient()

  const { data: files, isLoading } = useQuery({
    queryKey: ['event-files', id],
    queryFn:  () => eventApi.getFiles(id).then((r) => r.data.data),
  })

  const invalidate = () => qc.invalidateQueries(['my-events'])

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ChevronLeft size={15} /> Back to Events
      </Link>

      <PageHeader
        title="Manage Event Files"
        subtitle="Upload, replace, or delete files for this event"
      />

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-800">
        Replacing a file immediately removes the old one from storage. Deletions are permanent.
      </div>

      {/* Single-file fields grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map((fieldCfg) => (
          <FileCard
            key={fieldCfg.key}
            fieldCfg={fieldCfg}
            fileData={files?.[fieldCfg.key]}
            eventId={id}
            onMutate={invalidate}
          />
        ))}
      </div>

      {/* Workshop materials */}
      <WorkshopMaterialsCard
        materials={files?.workshopMaterials ?? []}
        eventId={id}
        onMutate={invalidate}
      />
    </div>
  )
}

export default EventFilesPage

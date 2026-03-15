import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { eventApi } from '../../api/services'
import Input from '../../components/shared/Input'
import Button from '../../components/shared/Button'
import PageHeader from '../../components/shared/PageHeader'
import toast from 'react-hot-toast'

const schema = z.object({
  title:                z.string().min(5, 'Title must be at least 5 characters'),
  description:          z.string().min(20, 'Description must be at least 20 characters'),
  type:                 z.enum(['hackathon','workshop','seminar','competition','webinar','other']),
  startDate:            z.string().min(1, 'Start date required'),
  endDate:              z.string().min(1, 'End date required'),
  registrationDeadline: z.string().min(1, 'Deadline required'),
  totalSeats:           z.coerce.number().min(1, 'At least 1 seat required'),
  venue:                z.string().optional(),
  isOnline:             z.boolean().default(false),
  isFree:               z.boolean().default(true),
  fee:                  z.coerce.number().min(0).default(0),
  tags:                 z.string().optional(),
})

const toDatetimeLocal = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

const EditEventPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventApi.getById(id).then((r) => r.data.data),
  })

  const {
    register, handleSubmit, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { isOnline: false, isFree: true, fee: 0 },
  })

  useEffect(() => {
    if (event) {
      reset({
        title:                event.title ?? '',
        description:          event.description ?? '',
        type:                 event.type ?? 'other',
        startDate:            toDatetimeLocal(event.startDate),
        endDate:              toDatetimeLocal(event.endDate),
        registrationDeadline: toDatetimeLocal(event.registrationDeadline),
        totalSeats:           event.totalSeats ?? 1,
        venue:                event.venue ?? '',
        isOnline:             event.isOnline ?? false,
        isFree:               event.isFree ?? true,
        fee:                  event.fee ?? 0,
        tags:                 Array.isArray(event.tags) ? event.tags.join(', ') : (event.tags ?? ''),
      })
    }
  }, [event, reset])

  const mutation = useMutation({
    mutationFn: (formData) => eventApi.update(id, formData),
    onSuccess: () => {
      toast.success('Event updated successfully')
      qc.invalidateQueries(['my-events'])
      qc.invalidateQueries(['event', id])
      navigate('/events')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Update failed'),
  })

  const isFree   = watch('isFree')
  const isOnline = watch('isOnline')

  const onSubmit = (values) => {
    const fd = new FormData()
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== '') fd.append(k, v)
    })
    const banner   = document.getElementById('edit-bannerImage')?.files?.[0]
    const poster   = document.getElementById('edit-posterImage')?.files?.[0]
    const brochure = document.getElementById('edit-brochurePdf')?.files?.[0]
    const rulebook = document.getElementById('edit-rulebookPdf')?.files?.[0]
    if (banner)   fd.append('bannerImage', banner)
    if (poster)   fd.append('posterImage', poster)
    if (brochure) fd.append('brochurePdf', brochure)
    if (rulebook) fd.append('rulebookPdf', rulebook)
    mutation.mutate(fd)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Edit Event" subtitle={event?.title} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-ink">Basic Information</h3>
          <Input label="Event Title" error={errors.title?.message} {...register('title')} />
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">Description</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-danger mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">Event Type</label>
            <select
              className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('type')}
            >
              {['hackathon','workshop','seminar','competition','webinar','other'].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <Input label="Tags (comma separated)" placeholder="AI, ML, Web Dev" {...register('tags')} />
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-ink">Schedule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Start Date" type="datetime-local" error={errors.startDate?.message} {...register('startDate')} />
            <Input label="End Date"   type="datetime-local" error={errors.endDate?.message}   {...register('endDate')} />
            <Input label="Registration Deadline" type="datetime-local" error={errors.registrationDeadline?.message} {...register('registrationDeadline')} />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-ink">Venue & Capacity</h3>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isOnline" {...register('isOnline')} className="w-4 h-4 accent-brand-600" />
            <label htmlFor="isOnline" className="text-sm text-ink-soft">Online Event</label>
          </div>
          {!isOnline && <Input label="Venue" placeholder="Hall A, Main Campus" {...register('venue')} />}
          <Input label="Total Seats" type="number" min={1} error={errors.totalSeats?.message} {...register('totalSeats')} />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isFree" {...register('isFree')} className="w-4 h-4 accent-brand-600" />
            <label htmlFor="isFree" className="text-sm text-ink-soft">Free Event</label>
          </div>
          {!isFree && <Input label="Registration Fee (₹)" type="number" min={0} {...register('fee')} />}
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-ink">Replace Event Assets</h3>
          <p className="text-xs text-muted">Leave blank to keep existing files.</p>
          {[
            { id: 'edit-bannerImage', label: 'Banner Image', accept: 'image/jpeg,image/png' },
            { id: 'edit-posterImage', label: 'Poster Image', accept: 'image/jpeg,image/png' },
            { id: 'edit-brochurePdf', label: 'Brochure PDF', accept: 'application/pdf' },
            { id: 'edit-rulebookPdf', label: 'Rulebook PDF', accept: 'application/pdf' },
          ].map(({ id, label, accept }) => (
            <div key={id}>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">{label}</label>
              <input
                id={id}
                type="file"
                accept={accept}
                className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            Save Changes
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/events')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EditEventPage

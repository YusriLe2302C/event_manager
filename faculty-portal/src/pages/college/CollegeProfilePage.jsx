import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { collegeApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import toast from 'react-hot-toast'

const VERIFICATION_CFG = {
  pending: {
    badge:   'bg-yellow-100 text-yellow-800',
    label:   'Pending Verification',
    banner:  'bg-yellow-50 border-yellow-200 text-yellow-800',
    message: 'Your college is awaiting verification by the Super Admin. You will be notified once reviewed. Until then, you cannot create events.',
  },
  verified: {
    badge:   'bg-green-100 text-green-800',
    label:   'Verified',
    banner:  'bg-green-50 border-green-200 text-green-800',
    message: 'Your college is verified. You can create and manage events.',
  },
  rejected: {
    badge:   'bg-red-100 text-red-800',
    label:   'Verification Rejected',
    banner:  'bg-red-50 border-red-200 text-red-800',
    message: 'Your college verification was rejected. Please re-submit with the correct details.',
  },
}

const EDIT_STATUS_CFG = {
  pending:  { banner: 'bg-yellow-50 border-yellow-200 text-yellow-800', message: 'Your edit request is pending approval by the Super Admin.' },
  rejected: { banner: 'bg-red-50 border-red-200 text-red-800',          message: 'Your edit request was rejected.' },
}

const editSchema = z.object({
  name:        z.string().min(3, 'College name must be at least 3 characters'),
  email:       z.string().email('Enter a valid email'),
  phone:       z.string().optional(),
  website:     z.string().url('Enter a valid URL').optional().or(z.literal('')),
  description: z.string().optional(),
})

const Field = ({ label, value }) =>
  value ? (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  ) : null

// ── Edit modal ─────────────────────────────────────────────────────
const EditModal = ({ college, onClose, onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name:        college.name        ?? '',
      email:       college.email       ?? '',
      phone:       college.phone       ?? '',
      website:     college.website     ?? '',
      description: college.description ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (fd) => collegeApi.submitEdit(fd),
    onSuccess: () => {
      toast.success('Edit request submitted for approval')
      onSuccess()
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Submission failed'),
  })

  const onSubmit = (values) => {
    const fd = new FormData()
    Object.entries(values).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, v) })
    const logo = document.getElementById('edit-college-logo')?.files?.[0]
    if (logo) fd.append('logo', logo)
    mutation.mutate(fd)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 my-8">
        <h3 className="text-base font-semibold text-ink">Edit College Details</h3>
        <p className="text-sm text-muted">Changes will be reviewed by the Super Admin before going live.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="College Name" error={errors.name?.message} {...register('name')} />
          <Input label="Official Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" type="tel" {...register('phone')} />
          <Input label="Website" type="url" placeholder="https://college.edu" error={errors.website?.message} {...register('website')} />
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">Description</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              {...register('description')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">Logo (optional)</label>
            <input
              id="edit-college-logo"
              type="file"
              accept="image/jpeg,image/png"
              className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
            <Button type="submit" loading={isSubmitting || mutation.isPending}>Submit for Approval</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
const CollegeProfilePage = () => {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [showEdit, setShowEdit] = useState(false)

  const { data: college, isLoading } = useQuery({
    queryKey: ['my-college'],
    queryFn:  () => collegeApi.getMine().then((r) => r.data.data),
    staleTime: 0,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!college) {
    return (
      <div className="space-y-4">
        <PageHeader title="College Profile" subtitle="No college associated with your account" />
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-4 text-sm text-yellow-800">
          You have not registered a college yet.
        </div>
        <Button onClick={() => navigate('/college/create')}>Register College</Button>
      </div>
    )
  }

  const vs  = college.verificationStatus ?? 'pending'
  const cfg = VERIFICATION_CFG[vs] ?? VERIFICATION_CFG.pending
  const fmt = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  const editCfg     = EDIT_STATUS_CFG[college.editStatus]
  const editPending = college.editStatus === 'pending'

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="College Profile" subtitle="Your registered institution" />
        <div className="flex gap-2">
          {vs === 'verified' && !editPending && (
            <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit College</Button>
          )}
          {vs === 'rejected' && (
            <Button variant="secondary" onClick={() => navigate('/college/create')}>Re-submit</Button>
          )}
        </div>
      </div>

      {/* Verification status banner */}
      <div className={`border rounded-xl px-4 py-3 text-sm ${cfg.banner}`}>
        <span className="font-semibold">{cfg.label}: </span>{cfg.message}
        {vs === 'rejected' && college.verificationRejectionReason && (
          <p className="mt-1 font-medium">Reason: {college.verificationRejectionReason}</p>
        )}
      </div>

      {/* Edit request status banner */}
      {editCfg && (
        <div className={`border rounded-xl px-4 py-3 text-sm ${editCfg.banner}`}>
          <span className="font-semibold">Edit Request: </span>{editCfg.message}
          {college.editStatus === 'rejected' && college.editRejectionReason && (
            <p className="mt-1 font-medium">Reason: {college.editRejectionReason}</p>
          )}
          {college.editStatus === 'rejected' && (
            <button
              className="mt-2 underline text-sm font-medium"
              onClick={() => setShowEdit(true)}
            >
              Submit a new edit request
            </button>
          )}
        </div>
      )}

      {/* College card */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-start gap-4">
          {college.logoUrl ? (
            <img src={college.logoUrl} alt={college.name}
              className="w-16 h-16 rounded-xl object-cover border border-border" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-brand-50 flex items-center justify-center
                            text-brand-600 font-bold text-2xl border border-border">
              {college.name.charAt(0)}
            </div>
          )}
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-ink">{college.name}</h2>
            <p className="text-xs text-muted capitalize">{college.type}</p>
            <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Email"          value={college.email} />
          <Field label="Phone"          value={college.phone} />
          <Field label="Website"        value={college.website} />
          <Field label="Established"    value={college.establishedYear} />
          <Field label="Affiliated To"  value={college.affiliatedTo} />
          <Field label="City"           value={college.address?.city} />
          <Field label="State"          value={college.address?.state} />
          <Field label="Total Events"   value={college.totalEvents} />
          <Field label="Total Students" value={college.totalStudents} />
        </div>

        {college.description && (
          <div>
            <p className="text-xs text-muted mb-1">About</p>
            <p className="text-sm text-ink-soft leading-relaxed">{college.description}</p>
          </div>
        )}

        <div className="border-t border-border pt-4 grid grid-cols-2 gap-3 text-xs text-muted">
          <div>
            <p>Registered</p>
            <p className="font-medium text-ink">{fmt(college.createdAt)}</p>
          </div>
          {college.verifiedAt && (
            <div>
              <p>Verified On</p>
              <p className="font-medium text-ink">{fmt(college.verifiedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <EditModal
          college={college}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false)
            qc.invalidateQueries(['my-college'])
          }}
        />
      )}
    </div>
  )
}

export default CollegeProfilePage

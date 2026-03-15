import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { userApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Input from '../../components/shared/Input'
import Button from '../../components/shared/Button'
import { FileText, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

const ProfilePage = () => {
  const qc = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => userApi.getMe(),
    select: (res) => res.data.data,
  })

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  useEffect(() => {
    if (user) reset({ name: user.name, bio: user.bio, skills: user.skills?.join(', ') })
  }, [user, reset])

  const updateMutation = useMutation({
    mutationFn: (data) => userApi.updateMe({
      ...data,
      skills: data.skills ? data.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => { toast.success('Profile updated'); qc.invalidateQueries(['me']) },
    onError: () => toast.error('Update failed'),
  })

  const resumeMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('resume', file)
      return userApi.uploadResume(fd)
    },
    onSuccess: () => { toast.success('Resume uploaded'); qc.invalidateQueries(['me']) },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Upload failed'),
  })

  if (isLoading)
    return <div className="h-64 bg-surface border border-border rounded-xl animate-pulse max-w-2xl" />

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="My Profile" subtitle="Manage your student profile and resume" />

      <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-6">
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-ink">Personal Information</h3>
          <Input label="Full Name" {...register('name')} />
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">Bio</label>
            <textarea rows={3} className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" {...register('bio')} />
          </div>
          <Input label="Skills (comma separated)" placeholder="React, Node.js, Python" {...register('skills')} />
          <Button type="submit" loading={isSubmitting || updateMutation.isPending}>Save Changes</Button>
        </div>
      </form>

      {/* Resume */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Resume</h3>
        {user?.resumeUrl ? (
          <div className="flex items-center gap-3 p-3 bg-canvas rounded-lg border border-border">
            <FileText size={18} className="text-brand-600 shrink-0" />
            <a href={user.resumeUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline truncate">
              View Current Resume
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted">No resume uploaded yet.</p>
        )}
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1.5">
            {user?.resumeUrl ? 'Replace Resume' : 'Upload Resume'} (PDF, max 5MB)
          </label>
          <input
            type="file" accept="application/pdf"
            onChange={(e) => { if (e.target.files?.[0]) resumeMutation.mutate(e.target.files[0]) }}
            className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
          />
          {resumeMutation.isPending && <p className="text-xs text-muted mt-1">Uploading...</p>}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage

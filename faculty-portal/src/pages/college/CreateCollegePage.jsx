import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { collegeApi, userApi } from '../../api/services'
import { useAuth } from '../../hooks/useAuth'
import useAuthStore from '../../store/authStore'
import Input from '../../components/shared/Input'
import Button from '../../components/shared/Button'
import PageHeader from '../../components/shared/PageHeader'
import toast from 'react-hot-toast'

const schema = z.object({
  name:        z.string().min(3, 'College name must be at least 3 characters'),
  email:       z.string().email('Enter a valid email'),
  phone:       z.string().optional(),
  website:     z.string().url('Enter a valid URL').optional().or(z.literal('')),
  description: z.string().optional(),
})

const CreateCollegePage = () => {
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const { user }    = useAuth()
  const setAuth     = useAuthStore((s) => s.setAuth)
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data: existingCollege, isLoading: checkingCollege } = useQuery({
    queryKey: ['my-college'],
    queryFn:  () => collegeApi.getMine().then((r) => r.data.data),
    staleTime: 0,
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (formData) => collegeApi.create(formData),
    onSuccess: async () => {
      toast.success('College submitted for approval')
      qc.invalidateQueries(['my-college'])
      try {
        const { data } = await userApi.getMe()
        setAuth(data.data, accessToken)
      } catch (_) {}
      navigate('/college')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Submission failed'),
  })

  useEffect(() => {
    if (!checkingCollege && existingCollege && existingCollege.verificationStatus !== 'rejected') {
      navigate('/college', { replace: true })
    }
  }, [checkingCollege, existingCollege, navigate])

  if (checkingCollege) return null
  if (existingCollege && existingCollege.verificationStatus !== 'rejected') return null

  const onSubmit = (values) => {
    const fd = new FormData()
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== '') fd.append(k, v)
    })
    const logo = document.getElementById('college-logo')?.files?.[0]
    if (logo) fd.append('logo', logo)
    mutation.mutate(fd)
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Register College"
        subtitle="Submit your college for verification by the Super Admin"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-ink">College Details</h3>
          <Input label="College Name" error={errors.name?.message} {...register('name')} />
          <Input label="Official Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" type="tel" placeholder="+91 XXXXX XXXXX" {...register('phone')} />
          <Input label="Website" type="url" placeholder="https://college.edu" error={errors.website?.message} {...register('website')} />
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">Description</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Brief description of your college..."
              {...register('description')}
            />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-ink">College Logo</h3>
          <p className="text-xs text-muted">JPG or PNG, max 2MB.</p>
          <input
            id="college-logo"
            type="file"
            accept="image/jpeg,image/png"
            className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
          Your college will be reviewed by the Super Admin before you can create events.
          You will be notified once the review is complete.
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            Submit for Approval
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/college')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateCollegePage

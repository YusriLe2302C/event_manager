import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { notificationApi } from '../api/services'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const QUERY_KEY = ['notifications']

export const useNotifications = (params = {}) => {
  const user = useAuthStore((s) => s.user)
  const qc   = useQueryClient()

  // ── Fetch ──────────────────────────────────────────────────────
  const query = useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn:  () => notificationApi.getAll({ limit: 30, ...params }),
    select:   (res) => res.data,
    enabled:  !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const notifications = query.data?.data        ?? []
  const unreadCount   = query.data?.pagination?.unreadCount ?? 0
  const total         = query.data?.pagination?.total       ?? 0

  // ── Mark one read ──────────────────────────────────────────────
  const markRead = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    // Optimistic update — flip read flag immediately
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY })
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY })
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old) => {
        if (!old?.data?.data) return old
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.map((n) =>
              n._id === id ? { ...n, read: true } : n
            ),
            pagination: {
              ...old.data.pagination,
              unreadCount: Math.max(0, (old.data.pagination?.unreadCount ?? 1) - 1),
            },
          },
        }
      })
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueriesData({ queryKey: QUERY_KEY }, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  // ── Mark all read ──────────────────────────────────────────────
  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess:  () => {
      toast.success('All notifications marked as read')
      qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  // ── Delete one ─────────────────────────────────────────────────
  const remove = useMutation({
    mutationFn: (id) => notificationApi.deleteNotification(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY })
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY })
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old) => {
        if (!old?.data?.data) return old
        const removed = old.data.data.find((n) => n._id === id)
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.filter((n) => n._id !== id),
            pagination: {
              ...old.data.pagination,
              total: Math.max(0, (old.data.pagination?.total ?? 1) - 1),
              unreadCount: removed && !removed.read
                ? Math.max(0, (old.data.pagination?.unreadCount ?? 1) - 1)
                : old.data.pagination?.unreadCount,
            },
          },
        }
      })
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueriesData({ queryKey: QUERY_KEY }, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  return {
    notifications,
    unreadCount,
    total,
    isLoading:  query.isLoading,
    isFetching: query.isFetching,
    markRead:    (id) => markRead.mutate(id),
    markAllRead: ()   => markAllRead.mutate(),
    remove:      (id) => remove.mutate(id),
  }
}

/**
 * Lightweight hook used only for the bell badge count.
 * Polls every 60s without fetching full notification list.
 */
export const useUnreadCount = () => {
  const user = useAuthStore((s) => s.user)
  const { data } = useQuery({
    queryKey: ['notifications', 'badge'],
    queryFn:  async () => {
      const res = await notificationApi.getAll({ limit: 1 })
      return res.data.pagination?.unreadCount ?? 0
    },
    enabled:         !!user,
    refetchInterval: 60_000,
    staleTime:       30_000,
  })
  return data ?? 0
}

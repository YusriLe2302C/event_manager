import { useQuery } from '@tanstack/react-query'
import { userApi } from '../../api/services'
import EventCard from '../../components/shared/EventCard'
import PageHeader from '../../components/shared/PageHeader'

const BookmarksPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => userApi.getBookmarks(),
    select: (res) => res.data.data,
  })

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader title="Bookmarks" subtitle="Events you've saved for later" />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data?.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-16 text-center text-muted text-sm">
          No bookmarks yet. Browse events and save the ones you're interested in.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((event) => <EventCard key={event._id} event={event} />)}
        </div>
      )}
    </div>
  )
}

export default BookmarksPage

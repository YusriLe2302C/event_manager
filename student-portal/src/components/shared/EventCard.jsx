import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, Tag } from 'lucide-react'

const TYPE_COLORS = {
  hackathon:   'bg-blue-50 text-blue-700',
  workshop:    'bg-green-50 text-green-700',
  seminar:     'bg-purple-50 text-purple-700',
  competition: 'bg-orange-50 text-orange-700',
  webinar:     'bg-teal-50 text-teal-700',
  other:       'bg-gray-100 text-gray-600',
}

const fmt = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

const EventCard = ({ event }) => {
  const {
    _id, title, type, college, startDate,
    venue, isOnline, totalSeats, registeredCount,
    bannerImage, isFree, fee, tags = [],
  } = event

  const seatsLeft = totalSeats - registeredCount
  const isFull    = seatsLeft <= 0

  return (
    <Link
      to={`/events/${_id}`}
      className="group block bg-surface border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-brand-200 transition-all duration-200"
    >
      {/* Banner */}
      <div className="aspect-video bg-canvas overflow-hidden">
        {bannerImage ? (
          <img
            src={bannerImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-50">
            <span className="text-brand-200 text-4xl font-bold select-none">
              {title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Type badge + free/paid */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${TYPE_COLORS[type] ?? TYPE_COLORS.other}`}>
            {type}
          </span>
          <span className={`text-xs font-medium ${isFree ? 'text-success' : 'text-ink-soft'}`}>
            {isFree ? 'Free' : `₹${fee}`}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-ink text-sm leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
          {title}
        </h3>

        {/* College */}
        {college?.name && (
          <p className="text-xs text-muted truncate">{college.name}</p>
        )}

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} />
            <span>{fmt(startDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} />
            <span>{isOnline ? 'Online' : (venue || 'Venue TBA')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={13} />
            <span className={isFull ? 'text-danger font-medium' : ''}>
              {isFull ? 'Fully Booked' : `${seatsLeft} seats left`}
            </span>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag size={11} className="text-subtle" />
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[11px] text-subtle bg-canvas px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default EventCard

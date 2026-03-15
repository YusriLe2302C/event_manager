/**
 * StyleGuide.jsx — Living Design System Reference
 * Route this at /style-guide in any portal (dev only).
 *
 * Shows: color palette, typography scale, component patterns,
 * badge/button/input/alert/table/progress/skeleton samples.
 */

const Section = ({ title, children }) => (
  <section style={{ marginBottom: '3rem' }}>
    <h2 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-xl)',
      fontWeight: 'var(--font-semibold)',
      color: 'var(--color-text-primary)',
      borderBottom: '2px solid var(--color-primary-600)',
      paddingBottom: '0.5rem',
      marginBottom: '1.5rem',
    }}>
      {title}
    </h2>
    {children}
  </section>
);

const Row = ({ children, gap = '1rem', wrap = true }) => (
  <div style={{
    display: 'flex',
    flexWrap: wrap ? 'wrap' : 'nowrap',
    gap,
    alignItems: 'center',
  }}>
    {children}
  </div>
);

/* ── 1. Color Swatch ──────────────────────────────────────── */
const Swatch = ({ name, value, textDark = false }) => (
  <div style={{ textAlign: 'center', width: '80px' }}>
    <div style={{
      width: '80px',
      height: '56px',
      background: value,
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      marginBottom: '6px',
    }} />
    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{name}</div>
    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{value}</div>
  </div>
);

const colorGroups = [
  {
    label: 'Primary — Navy Blue',
    swatches: [
      { name: '950', value: '#0a0f1e' },
      { name: '900', value: '#0d1b3e' },
      { name: '800', value: '#112266' },
      { name: '700', value: '#1a3080' },
      { name: '600 ★', value: '#1e3a8a' },
      { name: '500', value: '#2563eb' },
      { name: '400', value: '#3b82f6' },
      { name: '300', value: '#93c5fd' },
      { name: '200', value: '#bfdbfe' },
      { name: '100', value: '#dbeafe' },
      { name: '50',  value: '#eff6ff' },
    ],
  },
  {
    label: 'Secondary — Neutral Gray',
    swatches: [
      { name: '900', value: '#111827' },
      { name: '800', value: '#1f2937' },
      { name: '700', value: '#374151' },
      { name: '600', value: '#4b5563' },
      { name: '500', value: '#6b7280' },
      { name: '400', value: '#9ca3af' },
      { name: '300', value: '#d1d5db' },
      { name: '200', value: '#e5e7eb' },
      { name: '100', value: '#f3f4f6' },
      { name: '50',  value: '#f9fafb' },
    ],
  },
  {
    label: 'Accent — Light Blue',
    swatches: [
      { name: '700', value: '#0369a1' },
      { name: '600', value: '#0284c7' },
      { name: '500 ★', value: '#0ea5e9' },
      { name: '400', value: '#38bdf8' },
      { name: '300', value: '#7dd3fc' },
      { name: '100', value: '#e0f2fe' },
      { name: '50',  value: '#f0f9ff' },
    ],
  },
  {
    label: 'Semantic',
    swatches: [
      { name: 'success-600', value: '#16a34a' },
      { name: 'success-100', value: '#dcfce7' },
      { name: 'warning-600', value: '#d97706' },
      { name: 'warning-100', value: '#fef3c7' },
      { name: 'error-600',   value: '#dc2626' },
      { name: 'error-100',   value: '#fee2e2' },
      { name: 'info-600',    value: '#0284c7' },
      { name: 'info-100',    value: '#e0f2fe' },
    ],
  },
];

/* ── 2. Type Scale ────────────────────────────────────────── */
const typeScale = [
  { name: 'Display / H1', size: 'var(--text-4xl)', weight: 700, sample: 'College Events Platform' },
  { name: 'H2',           size: 'var(--text-3xl)', weight: 600, sample: 'Upcoming Events' },
  { name: 'H3',           size: 'var(--text-2xl)', weight: 600, sample: 'Event Registration' },
  { name: 'H4',           size: 'var(--text-xl)',  weight: 600, sample: 'Team Details' },
  { name: 'H5',           size: 'var(--text-lg)',  weight: 600, sample: 'Section Heading' },
  { name: 'Body Large',   size: 'var(--text-md)',  weight: 400, sample: 'Register for events, track your participation, and connect with peers.' },
  { name: 'Body',         size: 'var(--text-base)',weight: 400, sample: 'Submit your team details before the deadline to secure your spot.' },
  { name: 'Body Small',   size: 'var(--text-sm)',  weight: 400, sample: 'Registration closes 24 hours before the event.' },
  { name: 'Caption',      size: 'var(--text-xs)',  weight: 400, sample: 'Last updated 2 hours ago' },
  { name: 'Label / Tag',  size: 'var(--text-xs)',  weight: 600, sample: 'REGISTRATION OPEN', upper: true },
];

/* ── Main Component ───────────────────────────────────────── */
export default function StyleGuide() {
  return (
    <div style={{
      fontFamily: 'var(--font-body)',
      background: 'var(--color-bg)',
      minHeight: '100vh',
      padding: '3rem 2rem',
      maxWidth: '1100px',
      margin: '0 auto',
    }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '2rem' }}>
        <div className="label" style={{ marginBottom: '0.5rem' }}>Design System</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-4xl)',
          fontWeight: 700,
          color: 'var(--color-primary-900)',
          letterSpacing: 'var(--tracking-tight)',
          marginBottom: '0.5rem',
        }}>
          College Events Platform
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-md)' }}>
          UI Style Guide — Professional Corporate Theme
        </p>
      </div>

      {/* ── 1. Color Palette ── */}
      <Section title="1. Color Palette">
        {colorGroups.map(group => (
          <div key={group.label} style={{ marginBottom: '2rem' }}>
            <div style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              marginBottom: '0.75rem',
            }}>
              {group.label}
            </div>
            <Row gap="0.75rem">
              {group.swatches.map(s => <Swatch key={s.name} {...s} />)}
            </Row>
          </div>
        ))}
      </Section>

      {/* ── 2. Typography Scale ── */}
      <Section title="2. Typography Scale">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {typeScale.map(t => (
            <div key={t.name} style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr',
              gap: '1rem',
              alignItems: 'baseline',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '1rem',
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>{t.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {t.size} / w{t.weight}
                </div>
              </div>
              <div style={{
                fontFamily: t.name.startsWith('H') || t.name.startsWith('D') ? 'var(--font-display)' : 'var(--font-body)',
                fontSize: t.size,
                fontWeight: t.weight,
                color: 'var(--color-text-primary)',
                letterSpacing: t.upper ? 'var(--tracking-widest)' : 'var(--tracking-tight)',
                textTransform: t.upper ? 'uppercase' : 'none',
                lineHeight: 'var(--leading-tight)',
              }}>
                {t.sample}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3. Buttons ── */}
      <Section title="3. Buttons">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div className="label" style={{ marginBottom: '0.75rem' }}>Variants</div>
            <Row>
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-secondary">Secondary</button>
              <button className="btn btn-ghost">Ghost</button>
              <button className="btn btn-danger">Danger</button>
              <button className="btn btn-primary" disabled>Disabled</button>
            </Row>
          </div>
          <div>
            <div className="label" style={{ marginBottom: '0.75rem' }}>Sizes</div>
            <Row>
              <button className="btn btn-primary btn-sm">Small</button>
              <button className="btn btn-primary">Default</button>
              <button className="btn btn-primary btn-lg">Large</button>
            </Row>
          </div>
        </div>
      </Section>

      {/* ── 4. Badges ── */}
      <Section title="4. Badges">
        <Row>
          <span className="badge badge-primary">Primary</span>
          <span className="badge badge-accent">Accent</span>
          <span className="badge badge-success">Confirmed</span>
          <span className="badge badge-warning">Waitlisted</span>
          <span className="badge badge-error">Cancelled</span>
          <span className="badge badge-neutral">Draft</span>
        </Row>
      </Section>

      {/* ── 5. Inputs ── */}
      <Section title="5. Form Inputs">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '0.375rem' }}>Default</label>
            <input className="input" placeholder="Enter your email" />
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '0.375rem' }}>Error State</label>
            <input className="input error" defaultValue="invalid@" />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error-600)', marginTop: '0.25rem' }}>
              Please enter a valid email address.
            </div>
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '0.375rem' }}>Disabled</label>
            <input className="input" disabled placeholder="Not editable" />
          </div>
        </div>
      </Section>

      {/* ── 6. Alerts ── */}
      <Section title="6. Alerts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '560px' }}>
          <div className="alert alert-info">ℹ️ Registration opens in 2 days. Set a reminder.</div>
          <div className="alert alert-success">✅ You have successfully registered for the event.</div>
          <div className="alert alert-warning">⚠️ Only 3 seats remaining. Register before it fills up.</div>
          <div className="alert alert-error">❌ Registration failed. Please try again or contact support.</div>
        </div>
      </Section>

      {/* ── 7. Cards ── */}
      <Section title="7. Cards">
        <Row gap="1.5rem" wrap>
          <div className="card" style={{ width: '260px' }}>
            <div className="label" style={{ marginBottom: '0.5rem' }}>Hackathon</div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Code Sprint 2025
            </h4>
            <p style={{ fontSize: 'var(--text-sm)', marginBottom: '1rem' }}>
              24-hour hackathon open to all CS and IT students.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-success">Open</span>
              <button className="btn btn-primary btn-sm">Register</button>
            </div>
          </div>
          <div className="card-flat" style={{ width: '260px' }}>
            <div className="label" style={{ marginBottom: '0.5rem' }}>Workshop</div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: '0.5rem' }}>
              AWS Cloud Basics
            </h4>
            <p style={{ fontSize: 'var(--text-sm)', marginBottom: '1rem' }}>
              Hands-on intro to EC2, S3, and Lambda.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-warning">Waitlist</span>
              <button className="btn btn-secondary btn-sm">Join Waitlist</button>
            </div>
          </div>
        </Row>
      </Section>

      {/* ── 8. Stat Cards ── */}
      <Section title="8. Stat Cards">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Total Events',       value: '142',  delta: '+12 this month', dir: 'up' },
            { label: 'Registrations',      value: '3,841', delta: '+8.4%',         dir: 'up' },
            { label: 'Active Colleges',    value: '28',   delta: '+3 this week',   dir: 'up' },
            { label: 'Cancelled',          value: '17',   delta: '+2 this week',   dir: 'down' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className={`stat-delta ${s.dir}`}>{s.delta}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 9. Progress Bars ── */}
      <Section title="9. Progress Bars">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '480px' }}>
          {[
            { label: 'Seats Filled (Primary)', pct: 72, cls: '' },
            { label: 'Seats Filled (Accent)',  pct: 45, cls: 'accent' },
            { label: 'Check-in Rate',          pct: 88, cls: 'success' },
            { label: 'Waitlist Capacity',      pct: 95, cls: 'danger' },
          ].map(p => (
            <div key={p.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{p.label}</span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.pct}%</span>
              </div>
              <div className="progress-track">
                <div className={`progress-fill ${p.cls}`} style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 10. Table ── */}
      <Section title="10. Data Table">
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Event</th>
                <th>Registered</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Arjun Sharma',  event: 'Code Sprint 2025', date: 'Jan 12, 2025', status: 'confirmed' },
                { name: 'Priya Nair',    event: 'AWS Workshop',     date: 'Jan 14, 2025', status: 'waitlisted' },
                { name: 'Rahul Verma',   event: 'Design Hackathon', date: 'Jan 15, 2025', status: 'attended' },
                { name: 'Sneha Pillai',  event: 'Code Sprint 2025', date: 'Jan 16, 2025', status: 'cancelled' },
              ].map(row => (
                <tr key={row.name}>
                  <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{row.name}</td>
                  <td>{row.event}</td>
                  <td>{row.date}</td>
                  <td>
                    <span className={`badge badge-${
                      row.status === 'confirmed'  ? 'success' :
                      row.status === 'waitlisted' ? 'warning' :
                      row.status === 'attended'   ? 'primary' : 'error'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 11. Skeleton Loaders ── */}
      <Section title="11. Skeleton Loaders">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px' }}>
          <div className="skeleton" style={{ height: '20px', width: '60%' }} />
          <div className="skeleton" style={{ height: '14px', width: '90%' }} />
          <div className="skeleton" style={{ height: '14px', width: '75%' }} />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <div className="skeleton" style={{ height: '120px', width: '120px', borderRadius: 'var(--radius-lg)' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="skeleton" style={{ height: '16px', width: '80%' }} />
              <div className="skeleton" style={{ height: '12px', width: '100%' }} />
              <div className="skeleton" style={{ height: '12px', width: '65%' }} />
              <div className="skeleton" style={{ height: '32px', width: '100px', marginTop: 'auto' }} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── 12. Spacing & Radius Reference ── */}
      <Section title="12. Spacing & Border Radius">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <div className="label" style={{ marginBottom: '1rem' }}>Spacing Scale (4px base)</div>
            {[1,2,3,4,5,6,8,10,12,16].map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: `${n * 4}px`,
                  height: '16px',
                  background: 'var(--color-primary-600)',
                  borderRadius: '2px',
                  minWidth: '4px',
                }} />
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  space-{n} = {n * 4}px
                </span>
              </div>
            ))}
          </div>
          <div>
            <div className="label" style={{ marginBottom: '1rem' }}>Border Radius</div>
            {[
              { name: 'sm  — 4px',  r: '4px',    label: 'Tags, badges' },
              { name: 'md  — 6px',  r: '6px',    label: 'Inputs, small buttons' },
              { name: 'lg  — 8px',  r: '8px',    label: 'Cards, modals' },
              { name: 'xl  — 12px', r: '12px',   label: 'Large cards' },
              { name: '2xl — 16px', r: '16px',   label: 'Hero sections' },
              { name: 'full',       r: '9999px', label: 'Pills, avatars' },
            ].map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '48px',
                  height: '32px',
                  background: 'var(--color-primary-100)',
                  border: '2px solid var(--color-primary-600)',
                  borderRadius: r.r,
                }} />
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{r.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 13. Layout Grid ── */}
      <Section title="13. Layout Grid System">
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="label" style={{ marginBottom: '0.75rem' }}>12-Column Grid (24px gutter)</div>
          <div className="grid-12" style={{ background: 'var(--color-bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                background: 'var(--color-primary-200)',
                border: '1px solid var(--color-primary-400)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-primary-800)',
              }}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="label" style={{ marginBottom: '0.75rem' }}>Common Layouts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Sidebar + Content', cols: ['col-3 (Sidebar)', 'col-9 (Main)'] },
              { label: 'Two Equal Columns', cols: ['col-6', 'col-6'] },
              { label: 'Stat Cards (4-up)',  cols: ['col-3', 'col-3', 'col-3', 'col-3'] },
              { label: 'Form + Preview',     cols: ['col-8 (Form)', 'col-4 (Preview)'] },
            ].map(layout => (
              <div key={layout.label}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>
                  {layout.label}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {layout.cols.map((col, i) => (
                    <div key={i} style={{
                      flex: col.startsWith('col-3') ? 3 : col.startsWith('col-4') ? 4 : col.startsWith('col-6') ? 6 : col.startsWith('col-8') ? 8 : col.startsWith('col-9') ? 9 : 3,
                      background: i % 2 === 0 ? 'var(--color-primary-100)' : 'var(--color-accent-100)',
                      border: `1px solid ${i % 2 === 0 ? 'var(--color-primary-300)' : 'var(--color-accent-300)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--color-text-secondary)',
                      textAlign: 'center',
                    }}>
                      {col}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          College Events Platform — Design System v1.0
        </span>
        <span className="badge badge-primary">Dev Only</span>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

export function Panel({ children, className = '' }) {
  return <section className={`panel ${className}`}>{children}</section>
}

export function RiskBadge({ level }) {
  return <span className={`risk-badge ${level.toLowerCase()}`}>{level}</span>
}

export function MetricCard({ metric }) {
  const icons = { 'Flood risk': '◈', 'Current rainfall': '◒', 'Forecast peak': '↗', 'High-risk wards': '⌖', 'Active alerts': '!' }
  return <div className={`metric-card ${metric.tone || ''}`}><div className="metric-label"><span>{metric.label}</span><i aria-hidden="true">{icons[metric.label] || '·'}</i></div><strong>{metric.value}<small>{metric.unit}</small></strong><p>{metric.note}</p></div>
}

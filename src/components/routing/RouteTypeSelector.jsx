const routeTypes = [
  {
    id: 'Emergency Vehicle',
    label: 'Emergency Vehicle',
    detail: 'Critical safety & access priority',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" aria-hidden="true">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
        <path d="M9 10h4M11 8v4" />
      </svg>
    ),
  },
  {
    id: 'Commuter',
    label: 'Commuter Vehicle',
    detail: 'Balances safety and travel time',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" aria-hidden="true">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
  {
    id: 'Public Transport',
    label: 'Public Transport',
    detail: 'Transit corridors & bus routes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" aria-hidden="true">
        <rect x="4" y="3" width="16" height="16" rx="2" />
        <path d="M4 11h16M8 3v4M16 3v4M8 15h.01M16 15h.01M6 19v2M18 19v2" />
      </svg>
    ),
  },
  {
    id: 'Walking',
    label: 'Pedestrian / Foot',
    detail: 'Pedestrian-safe & high-ground paths',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="5" r="2" />
        <path d="m9 20 3-6 3 6M10 14l2-4 2 4M6 10l6-1 6 1" />
      </svg>
    ),
  },
]

export default function RouteTypeSelector({ selectedType, onSelectType }) {
  return (
    <div className="route-type-selector" role="group" aria-label="Travel vehicle mode">
      {routeTypes.map((type) => {
        const isSelected = selectedType === type.id || (selectedType === 'Car' && type.id === 'Commuter')
        return (
          <button
            type="button"
            key={type.id}
            className={isSelected ? 'active' : ''}
            onClick={() => onSelectType(type.id)}
          >
            <span className="route-type-icon" aria-hidden="true">{type.icon}</span>
            <strong>{type.label}</strong>
            <small>{type.detail}</small>
          </button>
        )
      })}
    </div>
  )
}

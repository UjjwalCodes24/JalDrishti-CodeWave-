const routeTypes = [
  { id: 'Emergency Vehicle', label: 'Emergency Vehicle', icon: '🚑', detail: 'Critical safety & access priority' },
  { id: 'Commuter', label: 'Commuter Vehicle', icon: '🚗', detail: 'Balances safety and travel time' },
  { id: 'Public Transport', label: 'Public Transport', icon: '🚌', detail: 'Transit corridors & bus routes' },
  { id: 'Walking', label: 'Pedestrian / Foot', icon: '🚶', detail: 'Pedestrian-safe & high-ground paths' },
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
            <span aria-hidden="true">{type.icon}</span>
            <strong>{type.label}</strong>
            <small>{type.detail}</small>
          </button>
        )
      })}
    </div>
  )
}

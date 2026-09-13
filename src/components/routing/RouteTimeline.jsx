export default function RouteTimeline({ forecast, selectedTime, onSelectTime }) {
  return <div className="route-timeline" role="group" aria-label="Route flood forecast timeline">{forecast.map((point) => <button type="button" key={point.time} className={selectedTime === point.time ? 'active' : ''} onClick={() => onSelectTime(point.time)}>{point.time}</button>)}</div>
}

export function getRiskLevel(risk) {
  if (risk >= 80) return 'Critical'
  if (risk >= 60) return 'High'
  if (risk >= 35) return 'Moderate'
  return 'Low'
}

export function getRiskTone(risk) {
  if (risk >= 80) return 'danger'
  if (risk >= 60) return 'warning'
  if (risk >= 35) return 'teal'
  return 'success'
}

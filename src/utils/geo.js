const EARTH_RADIUS_M = 6371000

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

export function haversineMetres(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

export function formatDistance(metres) {
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(1)} km`
}

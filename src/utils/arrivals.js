/**
 * Maps a BusArrival response's `Services` into the shape BusStopCard expects.
 * Only the first bus (`NextBus`) is surfaced for now.
 *
 * Per LTA's front-end advisement, derived minutes are rounded *down*; under a
 * minute reads "Arr", and a missing estimate reads "NA".
 */
export function mapArrivalServices(ltaServices = []) {
  return ltaServices.map((service) => ({
    code: service.ServiceNo,
    arrival: toArrival(service.NextBus),
  }))
}

function toArrival(nextBus) {
  if (!nextBus || !nextBus.EstimatedArrival) return 'NA'
  const timestamp = Date.parse(nextBus.EstimatedArrival)
  if (Number.isNaN(timestamp)) return 'NA'

  const minutes = Math.floor((timestamp - Date.now()) / 60000)
  // Negative values happen with clock skew — still "arriving".
  return minutes < 1 ? 'Arr' : minutes
}

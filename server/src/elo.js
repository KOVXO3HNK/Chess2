export function elo(a, b, scoreA, k=32) {
  const ea = 1/(1+10**((b-a)/400))
  const eb = 1 - ea
  const na = Math.round(a + k*(scoreA - ea))
  const nb = Math.round(b + k*((1-scoreA) - eb))
  return [na, nb]
}

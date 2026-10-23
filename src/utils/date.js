export const formatIndiaDateTime = (value) => {
  if (!value) return ''
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

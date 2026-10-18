const indiaDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function filterUpcomingFestivals(festivals, today = indiaDate()) {
  const todayTimestamp = Date.parse(`${today}T00:00:00.000Z`)
  const endDate = new Date(todayTimestamp + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return festivals
    .filter((festival) => {
      const occurrenceTimestamp = Date.parse(`${festival.date}T00:00:00.000Z`)
      const validDate = !Number.isNaN(occurrenceTimestamp)
        && new Date(occurrenceTimestamp).toISOString().slice(0, 10) === festival.date
      return validDate && festival.date >= today && festival.date <= endDate
    })
    .map((festival) => ({
      ...festival,
      days_remaining: (Date.parse(`${festival.date}T00:00:00.000Z`) - todayTimestamp) / (24 * 60 * 60 * 1000),
    }))
    .sort((first, second) => first.date.localeCompare(second.date) || first.name.localeCompare(second.name))
}

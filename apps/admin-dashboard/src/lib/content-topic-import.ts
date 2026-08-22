const TOPIC_HEADERS = new Set(['topic', 'topik', 'keyword', 'kata kunci', 'kata_kunci'])

const csvRows = (value: string): string[][] => {
  const firstLine = value.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character === '"') {
      if (quoted && value[index + 1] === '"') { cell += '"'; index += 1 }
      else quoted = !quoted
    } else if (character === delimiter && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && value[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some((item) => item.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += character
  }
  row.push(cell)
  if (row.some((item) => item.trim())) rows.push(row)
  return rows
}

const cleanTopic = (value: string): string => value
  .replace(/^\uFEFF/, '')
  .replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '')
  .replace(/\s+/g, ' ')
  .trim()

export interface ParsedTopics {
  topics: string[]
  duplicates: number
  invalid: number
}

export const parseImportedTopics = (value: string, format: 'txt' | 'csv'): ParsedTopics => {
  let rawTopics: string[]
  if (format === 'csv') {
    const rows = csvRows(value)
    const header = rows[0]?.map((cell) => cell.trim().toLocaleLowerCase('id-ID')) ?? []
    const topicIndex = header.findIndex((cell) => TOPIC_HEADERS.has(cell))
    const dataRows = topicIndex >= 0 ? rows.slice(1) : rows
    rawTopics = dataRows.map((row) => row[topicIndex >= 0 ? topicIndex : 0] ?? '')
  } else rawTopics = value.split(/\r?\n/)

  const topics: string[] = []
  const seen = new Set<string>()
  let duplicates = 0
  let invalid = 0
  for (const rawTopic of rawTopics) {
    const topic = cleanTopic(rawTopic)
    if (!topic || topic.length > 200) { if (topic) invalid += 1; continue }
    const key = topic.toLocaleLowerCase('id-ID')
    if (seen.has(key)) { duplicates += 1; continue }
    seen.add(key)
    topics.push(topic)
  }
  return { topics, duplicates, invalid }
}

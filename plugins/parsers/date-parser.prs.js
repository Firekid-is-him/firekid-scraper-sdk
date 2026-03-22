export default {
  name: 'date-parser',
  type: 'parser',
  version: '1.0.0',
  
  async execute(context) {
    const { text } = context

    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/g,
      /\d{2}\/\d{2}\/\d{4}/g,
      /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/gi
    ]

    const dates = new Set()

    for (const pattern of datePatterns) {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach(date => dates.add(date))
      }
    }

    return {
      dates: Array.from(dates),
      count: dates.size
    }
  }
}

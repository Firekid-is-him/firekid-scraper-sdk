export default {
  name: 'email-extractor',
  type: 'extractor',
  version: '1.0.0',
  
  async execute(context) {
    const { text } = context

    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const emails = text.match(emailRegex) || []

    const unique = [...new Set(emails)]

    return {
      emails: unique,
      count: unique.length
    }
  }
}

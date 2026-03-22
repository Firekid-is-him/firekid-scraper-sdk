import fs from 'fs'

export default {
  name: 'json-lines-output',
  type: 'output',
  version: '1.0.0',
  
  async execute(context) {
    const { data, filepath } = context

    if (!Array.isArray(data)) {
      throw new Error('Data must be an array for JSON Lines output')
    }

    const lines = data.map(item => JSON.stringify(item)).join('\n')

    fs.writeFileSync(filepath, lines)

    return {
      success: true,
      filepath,
      count: data.length
    }
  }
}

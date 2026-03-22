import type { RecordedAction, DetectedPatterns } from '../types.js'

export class CmdGenerator {
  generate(url: string, actions: RecordedAction[], patterns: DetectedPatterns): string {
    const lines: string[] = []

    lines.push(`GOTO ${url}`)
    lines.push(`WAITLOAD`)
    lines.push('')

    if (patterns.hasLogin) {
      lines.push('LOGIN DETECTED')
    }

    if (patterns.hasSearch) {
      lines.push('SEARCH DETECTED')
    }

    if (patterns.hasFormSubmission) {
      const form = patterns.hasFormSubmission
      lines.push('')
      form.fields.forEach(field => {
        lines.push(`WAIT ${field.selector}`)
        lines.push(`TYPE ${field.selector} YOUR_${field.type.toUpperCase()}_HERE`)
      })
      lines.push(`CLICK ${form.submitButton}`)
      lines.push('WAITLOAD')
    }

    const uniqueActions = this.deduplicateActions(actions)

    uniqueActions.forEach(action => {
      if (action.type === 'click') {
        lines.push(`CLICK ${action.selectors.primary}`)
      } else if (action.type === 'type' && action.value) {
        lines.push(`TYPE ${action.selectors.primary} ${action.value}`)
      }
    })

    if (patterns.hasPagination) {
      const pagination = patterns.hasPagination
      lines.push('')
      lines.push(`PAGINATE ${pagination.nextButton}`)
    }

    if (patterns.hasInfiniteScroll) {
      lines.push('')
      lines.push('INFINITESCROLL')
    }

    if (patterns.hasDownloadFlow) {
      lines.push('')
      lines.push('DOWNLOAD DETECTED')
    }

    return lines.join('\n')
  }

  private deduplicateActions(actions: RecordedAction[]): RecordedAction[] {
    const seen = new Set<string>()
    const unique: RecordedAction[] = []

    for (const action of actions) {
      const key = `${action.type}:${action.selectors.primary}`
      
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(action)
      }
    }

    return unique
  }
}

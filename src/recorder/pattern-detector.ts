import type { RecordedAction, DetectedPatterns, FormPattern, PaginationPattern, ScrollPattern } from '../types.js'
import { logger } from '../logger/logger.js'

export class PatternDetector {
  analyze(actions: RecordedAction[]): DetectedPatterns {
    const patterns: DetectedPatterns = {}

    patterns.hasFormSubmission = this.detectFormSubmission(actions)
    patterns.hasPagination = this.detectPagination(actions)
    patterns.hasInfiniteScroll = this.detectInfiniteScroll(actions)
    patterns.hasDownloadFlow = this.detectDownloadFlow(actions)
    patterns.hasLogin = this.detectLogin(actions)
    patterns.hasSearch = this.detectSearch(actions)

    logger.info('[pattern-detector] Detected patterns:', patterns)

    return patterns
  }

  private detectFormSubmission(actions: RecordedAction[]): FormPattern | null {
    const typeActions = actions.filter(a => a.type === 'type')
    const clickActions = actions.filter(a => a.type === 'click')

    if (typeActions.length < 2) return null

    const fields = typeActions.map(action => ({
      selector: action.selectors.primary,
      type: action.fieldType || 'text',
      placeholder: action.element?.placeholder || ''
    }))

    const submitButton = clickActions.find(a => 
      a.element?.textContent?.toLowerCase().includes('submit') ||
      a.element?.textContent?.toLowerCase().includes('login') ||
      a.element?.type === 'submit'
    )

    if (!submitButton) return null

    return {
      type: 'FORM_SUBMISSION',
      fields,
      submitButton: submitButton.selectors.primary
    }
  }

  private detectPagination(actions: RecordedAction[]): PaginationPattern | null {
    const clickActions = actions.filter(a => a.type === 'click')
    
    const nextClicks = clickActions.filter(a =>
      a.element?.textContent?.toLowerCase().includes('next') ||
      a.element?.className?.toLowerCase().includes('next') ||
      a.element?.href?.includes('page')
    )

    if (nextClicks.length < 2) return null

    const firstNext = nextClicks[0]
    const sameSelector = nextClicks.every(a => 
      a.selectors.primary === firstNext.selectors.primary
    )

    if (sameSelector) {
      return {
        type: 'PAGINATION',
        nextButton: firstNext.selectors.primary,
        timesClicked: nextClicks.length
      }
    }

    return null
  }

  private detectInfiniteScroll(actions: RecordedAction[]): ScrollPattern | null {
    const scrollActions = actions.filter(a => a.type === 'scroll')
    
    if (scrollActions.length > 5) {
      return {
        type: 'INFINITE_SCROLL',
        totalScrolls: scrollActions.length
      }
    }

    return null
  }

  private detectDownloadFlow(actions: RecordedAction[]): boolean {
    return actions.some(a =>
      a.element?.textContent?.toLowerCase().includes('download') ||
      a.element?.href?.includes('download') ||
      a.element?.href?.match(/\.(mp4|mp3|pdf|zip|rar)$/i)
    )
  }

  private detectLogin(actions: RecordedAction[]): boolean {
    const typeActions = actions.filter(a => a.type === 'type')
    
    const hasPassword = typeActions.some(a => 
      a.fieldType === 'password' ||
      a.selectors.primary.includes('password')
    )

    const hasUsername = typeActions.some(a =>
      a.fieldType === 'email' ||
      a.fieldType === 'text' ||
      a.selectors.primary.includes('email') ||
      a.selectors.primary.includes('username')
    )

    return hasPassword && hasUsername
  }

  private detectSearch(actions: RecordedAction[]): boolean {
    return actions.some(a =>
      a.type === 'type' && (
        a.selectors.primary.includes('search') ||
        a.element?.placeholder?.toLowerCase().includes('search')
      )
    )
  }
}

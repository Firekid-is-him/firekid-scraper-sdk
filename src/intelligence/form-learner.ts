import type { Page } from 'playwright'
import type { FormTemplate, FormField, FormType, FieldType } from '../types.js'
import { logger } from '../logger/logger.js'

export class FormLearner {
  async analyzeForm(page: Page, formSelector: string = 'form'): Promise<FormTemplate | null> {
    logger.info('[form-learner] Analyzing form structure...')

    const formData = await page.evaluate((selector) => {
      const form = document.querySelector(selector)
      if (!form) return null

      const fields: any[] = []
      const inputs = form.querySelectorAll('input, textarea, select')

      for (const input of inputs) {
        const el = input as HTMLInputElement
        if (el.type === 'submit' || el.type === 'button') continue

        const label = form.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() || null

        fields.push({
          selector: el.id ? `#${el.id}` : `[name="${el.name}"]`,
          type: el.type || 'text',
          name: el.name,
          placeholder: el.placeholder,
          required: el.required,
          pattern: el.pattern
        })
      }

      const submitButton = form.querySelector('button[type="submit"], input[type="submit"]')
      const submitSelector = submitButton 
        ? (submitButton as HTMLElement).id ? `#${(submitButton as HTMLElement).id}` : 'button[type="submit"]'
        : ''

      return {
        fields,
        submitButton: submitSelector,
        action: (form as HTMLFormElement).action,
        method: (form as HTMLFormElement).method
      }
    }, formSelector)

    if (!formData || formData.fields.length === 0) return null

    const template: FormTemplate = {
      fields: formData.fields.map(f => this.enrichField(f)),
      submitButton: formData.submitButton,
      formType: this.detectFormType(formData.fields)
    }

    return template
  }

  private enrichField(field: any): FormField {
    const fieldType = this.detectFieldType(field)

    return {
      selector: field.selector,
      fallbackSelectors: field.name ? [`[name="${field.name}"]`] : [],
      type: fieldType,
      label: null,
      placeholder: field.placeholder || '',
      required: field.required || false,
      validation: this.buildValidation(field)
    }
  }

  private detectFieldType(field: any): FieldType {
    const name = (field.name || '').toLowerCase()
    const placeholder = (field.placeholder || '').toLowerCase()
    const type = field.type

    if (type === 'email' || name.includes('email') || placeholder.includes('email')) {
      return 'email'
    }

    if (type === 'password' || name.includes('password') || placeholder.includes('password')) {
      return 'password'
    }

    if (name.includes('user') || name.includes('login') || placeholder.includes('username')) {
      return 'username'
    }

    if (type === 'tel' || name.includes('phone') || placeholder.includes('phone')) {
      return 'phone'
    }

    if (name.includes('name') || placeholder.includes('name')) {
      return 'name'
    }

    return 'text'
  }

  private buildValidation(field: any): any[] {
    const rules: any[] = []

    if (field.pattern) {
      rules.push({
        type: 'regex',
        pattern: field.pattern
      })
    }

    if (field.minLength) {
      rules.push({
        type: 'minlength',
        value: field.minLength
      })
    }

    if (field.maxLength) {
      rules.push({
        type: 'maxlength',
        value: field.maxLength
      })
    }

    return rules
  }

  private detectFormType(fields: any[]): FormType {
    const hasPassword = fields.some(f => f.type === 'password')
    const hasEmail = fields.some(f => f.type === 'email' || f.name?.includes('email'))
    const hasConfirmPassword = fields.some(f => f.name?.includes('confirm'))

    if (hasPassword && hasEmail && hasConfirmPassword) return 'REGISTRATION'
    if (hasPassword && hasEmail) return 'LOGIN'
    if (fields.some(f => f.type === 'search' || f.name?.includes('search'))) return 'SEARCH'
    if (fields.some(f => f.name?.includes('message') || f.name?.includes('subject'))) return 'CONTACT'

    return 'GENERIC'
  }

  async fillForm(page: Page, template: FormTemplate, data: Record<string, string>): Promise<void> {
    logger.info('[form-learner] Filling form...')

    for (const field of template.fields) {
      const value = data[field.type] || data[field.selector]
      
      if (value) {
        try {
          await page.fill(field.selector, value)
          logger.debug(`[form-learner] Filled ${field.selector}: ${value}`)
        } catch (err) {
          for (const fallback of field.fallbackSelectors) {
            try {
              await page.fill(fallback, value)
              logger.debug(`[form-learner] Filled ${fallback}: ${value}`)
              break
            } catch {
              continue
            }
          }
        }
      }
    }

    if (template.submitButton) {
      await page.click(template.submitButton)
      logger.info('[form-learner] Form submitted')
    }
  }
}

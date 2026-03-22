import { logger } from '../logger/logger.js'

export class GitHubOutput {
  private token: string
  private owner: string
  private repo: string

  constructor(token: string, owner: string, repo: string) {
    this.token = token
    this.owner = owner
    this.repo = repo
  }

  async createIssue(title: string, body: string, labels?: string[]): Promise<any> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/issues`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        title,
        body,
        labels: labels || []
      })
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const issue = await response.json()
    logger.info(`[github] Created issue #${issue.number}`)
    return issue
  }

  async createFile(path: string, content: string, message: string, branch: string = 'main'): Promise<any> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`

    const encodedContent = Buffer.from(content).toString('base64')

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message,
        content: encodedContent,
        branch
      })
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const result = await response.json()
    logger.info(`[github] Created file: ${path}`)
    return result
  }

  async updateFile(path: string, content: string, message: string, sha: string, branch: string = 'main'): Promise<any> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`

    const encodedContent = Buffer.from(content).toString('base64')

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message,
        content: encodedContent,
        sha,
        branch
      })
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const result = await response.json()
    logger.info(`[github] Updated file: ${path}`)
    return result
  }

  async uploadData(filename: string, data: any, message?: string): Promise<void> {
    const content = JSON.stringify(data, null, 2)
    const commitMessage = message || `Upload scraped data: ${filename}`

    await this.createFile(`data/${filename}`, content, commitMessage)
  }
}

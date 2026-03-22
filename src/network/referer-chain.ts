export class RefererChain {
  private chain: string[] = []
  private maxLength: number = 10

  push(url: string): void {
    this.chain.push(url)
    
    if (this.chain.length > this.maxLength) {
      this.chain.shift()
    }
  }

  getLast(): string | null {
    if (this.chain.length === 0) return null
    return this.chain[this.chain.length - 1]
  }

  getChain(): string[] {
    return [...this.chain]
  }

  clear(): void {
    this.chain = []
  }

  findBestReferer(targetUrl: string): string | null {
    const targetDomain = new URL(targetUrl).hostname

    for (let i = this.chain.length - 1; i >= 0; i--) {
      const url = this.chain[i]
      const domain = new URL(url).hostname
      
      if (domain === targetDomain) {
        return url
      }
    }

    return this.getLast()
  }
}

import http from 'http'
import type { AddressInfo } from 'net'

const page = (title: string, body: string, script = '') =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${body}<script>${script}</script></body></html>`

export interface FixtureServer {
  url: string
  close: () => Promise<void>
}

export async function startFixtureServer(): Promise<FixtureServer> {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://fixture')
    const html = (body: string, status = 200) => {
      res.writeHead(status, { 'content-type': 'text/html' })
      res.end(body)
    }

    if (u.pathname === '/') {
      return html(page('Home', `<h1>Fixture Home</h1><ul>${[1, 2, 3].map(i =>
        `<li class="product"><span class="title">Product ${i}</span><span class="price">$${i}.99</span><a class="more" href="/p/${i}">more ${i}</a>${i === 2 ? '<span class="badge">sale</span>' : ''}</li>`).join('')}</ul><a class="global" href="/p/9">global</a>`))
    }

    const plain = u.pathname.match(/^\/plain\/(\d+)$/)
    if (plain) {
      const n = Number(plain[1])
      return html(page('Plain', `${[1, 2, 3].map(k => `<div class="entry">Page ${n} item ${k}</div>`).join('')}${n < 3 ? `<a class="next" href="/plain/${n + 1}">next</a>` : ''}`))
    }

    const titled = u.pathname.match(/^\/titled\/(\d+)$/)
    if (titled) {
      const n = Number(titled[1])
      return html(page('Titled', `${[1, 2].map(k => `<article class="card"><h3>Title ${n}-${k}</h3><a href="/x${k}">link ${k}</a></article>`).join('')}${n < 3 ? `<a class="next" href="/titled/${n + 1}">next</a>` : ''}`))
    }

    if (u.pathname === '/scroll') {
      return html(page('Scroll', '<style>.row{height:500px}</style><div id="list"></div>',
        `let c=0;const add=()=>{for(let i=0;i<10&&c<50;i++){const d=document.createElement('div');d.className='row';d.textContent='row '+(++c);document.getElementById('list').appendChild(d)}};add();addEventListener('scroll',()=>{if(innerHeight+scrollY>=document.body.scrollHeight-200)add()})`))
    }

    if (u.pathname === '/download') return html(page('Dl', '<button>Download now</button>'))
    if (u.pathname === '/tall') return html(page('Tall', '<div style="height:6000px">tall</div>'))
    if (u.pathname === '/blank') return html(page('Blank', '<p>blank</p>'))
    if (u.pathname === '/missing') return html(page('Missing', '<p>gone</p>'), 404)
    if (u.pathname === '/slow') return void setTimeout(() => html(page('Slow', '<p>slow</p>')), 400)

    if (u.pathname === '/headers') {
      res.writeHead(200, { 'content-type': 'application/json' })
      return void res.end(JSON.stringify(req.headers))
    }

    html('not found', 404)
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>(resolve => server.close(() => resolve()))
  }
}

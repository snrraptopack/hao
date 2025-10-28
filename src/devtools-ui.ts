import { initDevTools, getDevTools, isDevEnv } from './devtools'

export type DevToolsOverlayOptions = {
  hotkey?: string // e.g. 'Alt+D'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  defaultOpen?: boolean
}

/**
 * Enable a lightweight DevTools overlay with a floating toggle button.
 * Call once from your app's root to attach it to `document.body`.
 */
export function enableDevToolsOverlay(options: DevToolsOverlayOptions = {}): void {
  const { hotkey = 'Alt+D', position = 'bottom-right', defaultOpen = false } = options

  // Ensure DevTools is initialized
  const devtools = initDevTools()

  // Avoid duplicate overlays
  if (document.getElementById('auwla-devtools-overlay')) return

  // Styles scoped to AUWLA DevTools to avoid collisions
  const style = document.createElement('style')
  style.textContent = `
    .auwla-devtools-floating-btn {
      position: fixed;
      ${position.includes('bottom') ? 'bottom: 16px;' : 'top: 16px;'}
      ${position.includes('right') ? 'right: 16px;' : 'left: 16px;'}
      z-index: 2147483000;
      background: linear-gradient(135deg, #007acc, #4fc1ff);
      color: white;
      border: none;
      border-radius: 999px;
      padding: 10px 14px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.24);
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .auwla-devtools-floating-btn:hover { filter: brightness(1.05); }

    .auwla-devtools-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483001;
      background: rgba(0,0,0,0.35);
      display: none;
      align-items: center;
      justify-content: center;
    }
    .auwla-devtools-overlay.open { display: flex; }

    .auwla-devtools-modal {
      width: min(900px, 92vw);
      max-height: 80vh;
      background: #0f172a; /* slate-900 */
      color: #e2e8f0; /* slate-200 */
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(0,0,0,0.35);
      border: 1px solid #1f2937; /* slate-800 */
      display: flex;
      flex-direction: column;
    }
    .auwla-devtools-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #111827; /* gray-900 */
      border-bottom: 1px solid #1f2937; /* slate-800 */
    }
    .auwla-devtools-title { font-weight: 700; font-size: 14px; }
    .auwla-devtools-subtitle { font-size: 12px; opacity: 0.8; }
    .auwla-devtools-close {
      background: transparent; border: none; color: #e2e8f0; cursor: pointer; font-size: 20px;
    }
    .auwla-devtools-content { padding: 12px 16px; overflow: auto; }
    .auwla-devtools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .auwla-devtools-card {
      background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 12px;
    }
    .auwla-devtools-card h4 { margin: 0 0 6px 0; font-size: 13px; color: #93c5fd; }
    .auwla-devtools-key { color: #9ca3af; }
    .auwla-devtools-val { color: #e5e7eb; font-weight: 600; }
    .auwla-devtools-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .auwla-devtools-btn-secondary { background: #1f2937; color: #e2e8f0; border: 1px solid #374151; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
    .auwla-devtools-btn-secondary:hover { filter: brightness(1.1); }
    .auwla-devtools-controls { display:flex; gap:8px; align-items:center; margin:6px 0 8px; }
    .auwla-devtools-controls select, .auwla-devtools-controls input { background:#0f172a; color:#e2e8f0; border:1px solid #1f2937; border-radius:6px; padding:4px 6px; font-size:12px; }
    .auwla-devtools-highlight { background: rgba(79,193,255,0.12); }
    .auwla-devtools-muted { color:#9ca3af; }
  `
  document.head.appendChild(style)

  // Floating toggle button
  const floatBtn = document.createElement('button')
  floatBtn.className = 'auwla-devtools-floating-btn'
  floatBtn.title = `Toggle AUWLA DevTools (${hotkey})`
  floatBtn.innerHTML = `🛠️ <span>DevTools</span>`

  // Overlay modal
  const overlay = document.createElement('div')
  overlay.id = 'auwla-devtools-overlay'
  overlay.className = 'auwla-devtools-overlay'
  const modal = document.createElement('div')
  modal.className = 'auwla-devtools-modal'
  const header = document.createElement('div')
  header.className = 'auwla-devtools-header'
  const titleWrap = document.createElement('div')
  titleWrap.innerHTML = `<div class="auwla-devtools-title">AUWLA DevTools</div><div class="auwla-devtools-subtitle">Live state & dependencies</div>`
  const close = document.createElement('button')
  close.className = 'auwla-devtools-close'
  close.textContent = '×'
  const content = document.createElement('div')
  content.className = 'auwla-devtools-content'

  header.appendChild(titleWrap)
  header.appendChild(close)
  modal.appendChild(header)
  modal.appendChild(content)
  overlay.appendChild(modal)

  // Toggle behavior
  const setOpen = (open: boolean) => {
    overlay.classList.toggle('open', open)
  }
  floatBtn.onclick = () => setOpen(!overlay.classList.contains('open'))
  close.onclick = () => setOpen(false)
  overlay.onclick = (e) => { if (e.target === overlay) setOpen(false) }

  // Hotkey
  window.addEventListener('keydown', (e) => {
    const combo = `${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.key.toUpperCase()}`
    if (combo === hotkey.toUpperCase()) {
      e.preventDefault()
      setOpen(!overlay.classList.contains('open'))
    }
  })

  // Initial mount
  document.body.appendChild(floatBtn)
  document.body.appendChild(overlay)
  setOpen(defaultOpen)

  // Selection & controls state (persist across renders)
  let selectedRefId: string | null = null
  let selectedWatcherId: string | null = null
  let selectedComponentId: string | null = null
  let sortRefsBy: 'watchers' | 'size' | 'orphan' | 'scope' = 'watchers'
  let sortWatchersBy: 'triggers' | 'avg' | 'deps' = 'triggers'
  let filterRefsText = ''
  let filterWatchersText = ''

  // Render stats and actions
  const render = () => {
    const snapshot = devtools.getSnapshot()
    const orphaned = devtools.getOrphanedRefs()
    const graph = devtools.getDependencyGraph ? devtools.getDependencyGraph() : snapshot.dependencies

    // Build Refs list with filtering/sorting for easier identification
    let refs = [...snapshot.refs]
    const refMatches = (r: any) => {
      if (!filterRefsText) return true
      const origin = (r.createdBy || '').split('\n')[0] || ''
      const val = (() => { try { return typeof r.value === 'string' ? r.value : JSON.stringify(r.value) } catch { return String(r.value) } })()
      const q = filterRefsText.toLowerCase()
      return origin.toLowerCase().includes(q) || String(val).toLowerCase().includes(q)
    }
    refs = refs.filter(refMatches)
    refs.sort((a, b) => {
      switch (sortRefsBy) {
        case 'size': {
          const sa = (() => { try { return ((JSON.stringify(a.value) || '').length) * 2 } catch { return String(a.value).length * 2 } })()
          const sb = (() => { try { return ((JSON.stringify(b.value) || '').length) * 2 } catch { return String(b.value).length * 2 } })()
          return sb - sa
        }
        case 'orphan': return (b.isOrphaned ? 1 : 0) - (a.isOrphaned ? 1 : 0)
        case 'scope': return String(a.scope).localeCompare(String(b.scope))
        case 'watchers':
        default: return (b.watchers?.length || 0) - (a.watchers?.length || 0)
      }
    })
    const topRefs = refs.slice(0, 8)

    const refRowsHtml = topRefs.map((r) => {
      const origin = (r.createdBy || '').split('\n')[0] || 'unknown'
      let preview = ''
      try {
        const raw = typeof r.value === 'string' ? r.value : JSON.stringify(r.value)
        preview = String(raw ?? '').slice(0, 40)
      } catch {
        preview = String(r.value).slice(0, 40)
      }
      let size = 0
      try {
        size = ((JSON.stringify(r.value) || '').length) * 2
      } catch {
        size = String(r.value).length * 2
      }
      return `<tr data-ref-id="${r.id}" class="${(selectedRefId === r.id) || (selectedWatcherId && (snapshot.watchers.find(w => w.id === selectedWatcherId)?.dependencies || []).includes(r.id)) ? 'auwla-devtools-highlight' : ''}" style="cursor:pointer;">
        <td class="auwla-devtools-val" title="${origin}">${origin}</td>
        <td>${r.scope || 'global'}</td>
        <td>${r.watchers.length}</td>
        <td>${r.isOrphaned ? 'Yes' : 'No'}</td>
        <td>${size} B</td>
        <td title="${preview}">${preview}</td>
      </tr>`
    }).join('')

    // Build watchers table with filtering/sorting
    let watchers = [...snapshot.watchers]
    const watcherMatches = (w: any) => {
      if (!filterWatchersText) return true
      const origin = (w.createdBy || '').split('\n')[0] || ''
      const q = filterWatchersText.toLowerCase()
      return origin.toLowerCase().includes(q)
    }
    watchers = watchers.filter(watcherMatches)
    watchers.sort((a, b) => {
      switch (sortWatchersBy) {
        case 'avg': return (b.averageExecutionTime || 0) - (a.averageExecutionTime || 0)
        case 'deps': return (b.dependencies?.length || 0) - (a.dependencies?.length || 0)
        case 'triggers':
        default: return (b.triggerCount || 0) - (a.triggerCount || 0)
      }
    })
    const topWatchers = watchers.slice(0, 8)

    const watcherRowsHtml = topWatchers.map((w) => {
      const origin = (w.createdBy || '').split('\n')[0] || 'unknown'
      const deps = (w.dependencies || []).map((depId: string) => {
        const ref = snapshot.refs.find(r => r.id === depId)
        const refOrigin = (ref?.createdBy || '').split('\n')[0] || depId
        return refOrigin
      })
      const depsPreview = deps.slice(0, 3).join(', ')
      const avgMs = Number.isFinite(w.averageExecutionTime) ? w.averageExecutionTime.toFixed(2) : '0.00'
      const avgClass = (w.averageExecutionTime || 0) > 8 ? 'auwla-devtools-val' : ''
      return `<tr data-watcher-id="${w.id}" class="${(selectedWatcherId === w.id) || (selectedRefId && (w.dependencies || []).includes(selectedRefId)) ? 'auwla-devtools-highlight' : ''}" style="cursor:pointer;">
        <td class="auwla-devtools-val" title="${origin}">${origin}</td>
        <td>${w.isActive ? 'Yes' : 'No'}</td>
        <td>${w.triggerCount}</td>
        <td class="${avgClass}">${avgMs} ms</td>
        <td>${w.dependencies?.length || 0}</td>
        <td title="${deps.join(', ')}">${depsPreview || '-'}</td>
      </tr>`
    }).join('')

    // Build components table
    const componentsRowsHtml = [...snapshot.components].map((c) => {
      const isSelected = (selectedComponentId === c.id) || (selectedRefId && (c.refs || []).includes(selectedRefId))
      return `<tr data-component-id="${c.id}" class="${isSelected ? 'auwla-devtools-highlight' : ''}" style="cursor:pointer;">
        <td class="auwla-devtools-val">${c.name}</td>
        <td>${c.isActive ? 'Yes' : 'No'}</td>
        <td>${c.refs?.length || 0}</td>
        <td>${c.watchers?.length || 0}</td>
      </tr>`
    }).join('')

    content.innerHTML = `
      <div class="auwla-devtools-grid">
        <div class="auwla-devtools-card">
          <h4>📊 Stats</h4>
          <div><span class="auwla-devtools-key">Refs:</span> <span class="auwla-devtools-val">${snapshot.refs.length}</span></div>
          <div><span class="auwla-devtools-key">Watchers:</span> <span class="auwla-devtools-val">${snapshot.watchers.length}</span></div>
          <div><span class="auwla-devtools-key">Components:</span> <span class="auwla-devtools-val">${snapshot.components.length}</span></div>
          <div><span class="auwla-devtools-key">Memory:</span> <span class="auwla-devtools-val">~${snapshot.memoryUsage} B</span></div>
        </div>
        <div class="auwla-devtools-card">
          <h4>🧹 Orphaned Refs</h4>
          <div style="overflow:auto; max-height: 240px;">
            <table style="width:100%; font-size:12px; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Origin</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Scope</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Watchers</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Size</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Value</th>
                </tr>
              </thead>
              <tbody>
                ${orphaned.map(r => {
                  const origin = (r.createdBy || '').split('\\n')[0] || 'unknown'
                  let size = 0
                  try { size = ((JSON.stringify(r.value) || '').length) * 2 } catch { size = String(r.value).length * 2 }
                  let preview = ''
                  try { const raw = typeof r.value === 'string' ? r.value : JSON.stringify(r.value); preview = String(raw ?? '').slice(0, 40) } catch { preview = String(r.value).slice(0, 40) }
                  return `<tr>
                    <td class="auwla-devtools-val" title="${origin}">${origin}</td>
                    <td>${r.scope || 'global'}</td>
                    <td>${r.watchers?.length || 0}</td>
                    <td>${size} B</td>
                    <td title="${preview}">${preview}</td>
                  </tr>`
                }).join('') || '<tr><td colspan="5" style="padding:6px;">No orphaned refs</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="auwla-devtools-card">
          <h4>🔍 Refs (Top by watchers)</h4>
          <div class="auwla-devtools-controls">
            <label class="auwla-devtools-muted">Sort</label>
            <select id="auwla-dt-refs-sort">
              <option value="watchers" ${sortRefsBy==='watchers'?'selected':''}>Watchers</option>
              <option value="size" ${sortRefsBy==='size'?'selected':''}>Size</option>
              <option value="orphan" ${sortRefsBy==='orphan'?'selected':''}>Orphaned</option>
              <option value="scope" ${sortRefsBy==='scope'?'selected':''}>Scope</option>
            </select>
            <input id="auwla-dt-refs-filter" type="text" placeholder="Filter by origin/value" value="${filterRefsText}"/>
          </div>
          <div style="overflow:auto; max-height: 240px;">
            <table style="width:100%; font-size:12px; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Origin</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Scope</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Watchers</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Orphan</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Size</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Value</th>
                </tr>
              </thead>
              <tbody>
                ${refRowsHtml || '<tr><td colspan="6" style="padding:6px;">No refs</td></tr>'}
              </tbody>
            </table>
          </div>
          <div id="auwla-dt-ref-details" style="margin-top:8px; font-size:12px; color:#9ca3af;"></div>
        </div>
        <div class="auwla-devtools-card">
          <h4>⏱️ Watchers (Top by triggers)</h4>
          <div class="auwla-devtools-controls">
            <label class="auwla-devtools-muted">Sort</label>
            <select id="auwla-dt-watchers-sort">
              <option value="triggers" ${sortWatchersBy==='triggers'?'selected':''}>Triggers</option>
              <option value="avg" ${sortWatchersBy==='avg'?'selected':''}>Avg time</option>
              <option value="deps" ${sortWatchersBy==='deps'?'selected':''}>Deps</option>
            </select>
            <input id="auwla-dt-watchers-filter" type="text" placeholder="Filter by origin" value="${filterWatchersText}"/>
          </div>
          <div style="overflow:auto; max-height: 240px;">
            <table style="width:100%; font-size:12px; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Origin</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Active</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Triggers</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Avg Time</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Deps</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Dep Origins</th>
                </tr>
              </thead>
              <tbody>
                ${watcherRowsHtml || '<tr><td colspan="6" style="padding:6px;">No watchers</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="auwla-devtools-card">
          <h4>🧩 Components</h4>
          <div style="overflow:auto; max-height: 240px;">
            <table style="width:100%; font-size:12px; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Name</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Active</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Refs</th>
                  <th style="text-align:left; padding:4px; border-bottom:1px solid #1f2937;">Watchers</th>
                </tr>
              </thead>
              <tbody>
                ${componentsRowsHtml || '<tr><td colspan="4" style="padding:6px;">No components</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="auwla-devtools-card">
          <h4>⚙️ Mode</h4>
          <div><span class="auwla-devtools-key">Environment:</span> <span class="auwla-devtools-val">${isDevEnv() ? 'development' : 'production'}</span></div>
          <div><span class="auwla-devtools-key">Hotkey:</span> <span class="auwla-devtools-val">${hotkey}</span></div>
        </div>
      </div>
    `
    // Render selected ref details (persists across re-renders)
    const details = content.querySelector('#auwla-dt-ref-details') as HTMLDivElement
    const renderSelectedRefDetails = () => {
      if (!selectedRefId) { details.innerHTML = ''; return }
      const ref = snapshot.refs.find(r => r.id === selectedRefId)
      if (!ref) { details.innerHTML = ''; return }
      const watcherOrigins = (ref.watchers || []).map(wid => {
        const w = snapshot.watchers.find(x => x.id === wid)
        return (w?.createdBy || '').split('\n')[0] || wid
      })
      const componentNames = (ref.components || []).map(cid => {
        const c = snapshot.components.find(x => x.id === cid)
        return c?.name || cid
      })
      const origin = (ref.createdBy || '').split('\n')[0] || 'unknown'
      details.innerHTML = `
        <div><span class="auwla-devtools-key">Selected ref:</span> <span class="auwla-devtools-val">${origin}</span></div>
        <div><span class="auwla-devtools-key">Watchers:</span> <span class="auwla-devtools-val">${watcherOrigins.length}</span></div>
        <div style="margin-top:4px;">${watcherOrigins.length ? watcherOrigins.map(o => `<div>• ${o}</div>`).join('') : '<div>• none</div>'}</div>
        <div style="margin-top:6px;"><span class="auwla-devtools-key">Components:</span> <span class="auwla-devtools-val">${componentNames.length}</span></div>
        <div style="margin-top:4px;">${componentNames.length ? componentNames.map(n => `<div>• ${n}</div>`).join('') : '<div>• none</div>'}</div>
      `
    }
    renderSelectedRefDetails()

    // Row click handlers for cross-highlighting
    const refRows = Array.from(content.querySelectorAll('table tbody tr[data-ref-id]')) as HTMLTableRowElement[]
    refRows.forEach(row => {
      row.onclick = () => {
        selectedRefId = row.getAttribute('data-ref-id')!
        render()
      }
    })
    const watcherRows = Array.from(content.querySelectorAll('table tbody tr[data-watcher-id]')) as HTMLTableRowElement[]
    watcherRows.forEach(row => {
      row.onclick = () => {
        selectedWatcherId = row.getAttribute('data-watcher-id')!
        render()
      }
    })
    const componentRows = Array.from(content.querySelectorAll('table tbody tr[data-component-id]')) as HTMLTableRowElement[]
    componentRows.forEach(row => {
      row.onclick = () => {
        selectedComponentId = row.getAttribute('data-component-id')!
        render()
      }
    })

    // Controls: sort and filter
    const refsSort = content.querySelector('#auwla-dt-refs-sort') as HTMLSelectElement
    if (refsSort) refsSort.onchange = () => { sortRefsBy = refsSort.value as any; render() }
    const refsFilter = content.querySelector('#auwla-dt-refs-filter') as HTMLInputElement
    if (refsFilter) refsFilter.oninput = () => { filterRefsText = refsFilter.value; render() }

    const watchersSort = content.querySelector('#auwla-dt-watchers-sort') as HTMLSelectElement
    if (watchersSort) watchersSort.onchange = () => { sortWatchersBy = watchersSort.value as any; render() }
    const watchersFilter = content.querySelector('#auwla-dt-watchers-filter') as HTMLInputElement
    if (watchersFilter) watchersFilter.oninput = () => { filterWatchersText = watchersFilter.value; render() }
  }

  // Poll for updates while open to keep stats fresh
  let interval: any = null
  const startPolling = () => {
    if (interval) return
    interval = setInterval(render, 1000)
  }
  const stopPolling = () => {
    if (interval) { clearInterval(interval); interval = null }
  }

  // Observe overlay open/close to manage polling
  const observer = new MutationObserver(() => {
    if (overlay.classList.contains('open')) startPolling(); else stopPolling()
  })
  observer.observe(overlay, { attributes: true, attributeFilter: ['class'] })

  // Initial render
  render()
}
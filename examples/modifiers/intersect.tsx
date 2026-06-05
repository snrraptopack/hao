import { event } from 'auwla/events';
import {} from 'auwla/jsx-runtime';

export function IntersectModifiersDemo() {
  let inViewCount = 0;
  let outOfViewCount = 0;
  let history: string[] = [];

  const pushHistory = (msg: string) => {
    history.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (history.length > 8) history.pop();
  };

  return () => (
    <div class="demo-container" style={{ maxWidth: '900px' }}>
      <header class="demo-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>Intersection Modifiers</h1>
        <p style={{ color: '#8b949e', fontSize: '0.9rem', lineHeight: '1.5', margin: '0' }}>
          Cleanly hook into scroll visibility using the <code>event.intersect()</code> modifier.
          Use <code>.in</code> and <code>.out</code> to detect enter/exit events.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'stretch' }}>

        {/* Left Column: Stats Panel */}
        <div style={{
          background: '#161b22',
          border: '1px solid #30363d',
          padding: '20px',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#c9d1d9', fontSize: '0.95rem', fontWeight: 'bold', borderBottom: '1px solid #21262d', paddingBottom: '8px' }}>
            Event Dashboard
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>Box 1 In View:</span>
              <strong style={{ color: '#58a6ff', fontSize: '1.1rem' }}>{inViewCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>Box 2 Out of View:</span>
              <strong style={{ color: '#ff7b72', fontSize: '1.1rem' }}>{outOfViewCount}</strong>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #21262d', paddingTop: '12px', flex: '1', display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#8b949e', fontSize: '0.85rem', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Live Scroll Log:
            </span>
            <div style={{
              flex: '1',
              maxHeight: '200px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              paddingRight: '2px'
            }}>
              {history.length === 0 ? (
                <div style={{ color: '#484f58', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Scroll the viewport panel on the right to trigger events.
                </div>
              ) : (
                history.map((log) => (
                  <div key={log} style={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    color: '#c9d1d9',
                    padding: '4px 6px',
                    background: '#0d1117',
                    borderRadius: '4px',
                    borderLeft: '2px solid #30363d',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Scroll Playground */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>
            Scroll within the viewport box below:
          </span>

          <div style={{
            height: '380px',
            overflowY: 'auto',
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '12px',
            padding: '20px 16px',
            position: 'relative'
          }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '300px', paddingBottom: '300px' }}>

              <div
                class="intersect-box"
                style={{
                  padding: '40px 16px',
                  background: 'rgba(56, 139, 253, 0.06)',
                  border: '1px dashed #388bfd',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#c9d1d9'
                }}
                onIntersect={
                  event
                    .intersect(0.5)
                    .in.handler(() => {
                      inViewCount++;
                      pushHistory("Box 1 entered (50%)");
                    })
                }
              >
                <h4 style={{ color: '#58a6ff', margin: '0 0 6px 0' }}>Box 1</h4>
                <p style={{ margin: '0', fontSize: '0.8rem', color: '#8b949e' }}>
                  Fires when 50% visible (<code>.intersect(0.5).in</code>)
                </p>
              </div>

              <div
                class="intersect-box"
                style={{
                  padding: '40px 16px',
                  background: 'rgba(240, 136, 62, 0.06)',
                  border: '1px dashed #f0883e',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#c9d1d9'
                }}
                onIntersect={
                  event
                    .intersect().out.handler(() => {
                      outOfViewCount++;
                      pushHistory("Box 2 left view");
                    })
                }
              >
                <h4 style={{ color: '#ff9e64', margin: '0 0 6px 0' }}>Box 2</h4>
                <p style={{ margin: '0', fontSize: '0.8rem', color: '#8b949e' }}>
                  Fires when fully hidden (<code>.intersect().out</code>)
                </p>
              </div>

              <div
                class="intersect-box"
                style={{
                  padding: '40px 16px',
                  background: 'rgba(46, 160, 67, 0.06)',
                  border: '1px dashed #39d353',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#c9d1d9'
                }}
                onIntersect={
                  event
                    .intersect({ threshold: [0, 1] })
                    .handler((e) => {
                      const percent = Math.round(e.detail.intersectionRatio * 100);
                      pushHistory(`Box 3 visible: ${percent}%`);
                    })
                }
              >
                <h4 style={{ color: '#56d364', margin: '0 0 6px 0' }}>Box 3</h4>
                <p style={{ margin: '0', fontSize: '0.8rem', color: '#8b949e' }}>
                  Fires at 0% and 100% (<code>.intersect([0, 1])</code>)
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

import {} from "auwla/jsx-runtime";

export function BindExample() {
  // Bind targets
  let name = 'Auwla Developer';
  let age = 24;
  let volume = 75;
  let isSubscribed = true;
  let hobbies: string[] = ['coding'];
  let selectedTheme = 'dark';
  let selectedFramework = 'auwla';
  let tools: string[] = ['bun', 'vite'];

  return () => (
    <div style={{
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#e2e8f0',
      background: '#0f172a',
      padding: '40px',
      borderRadius: '16px',
      maxWidth: '1000px',
      margin: '20px auto',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      border: '1px solid #1e293b'
    }}>
      <h2 style={{
        fontSize: '2rem',
        fontWeight: '700',
        margin: '0 0 10px 0',
        background: 'linear-gradient(to right, #38bdf8, #3b82f6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Two-Way Data Binding Demo
      </h2>
      <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '1rem' }}>
        Auwla features compile-time <code>bind={"{variable}"}</code> syntax that infers properties and events without reactive wrappers.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: '30px',
      }}>
        {/* Left Side: Interactive Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: Text & Number/Range inputs */}
          <div style={{
            background: '#1e293b',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #334155'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#38bdf8' }}>Text & Ranges</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '5px' }}>Name (Text Input)</label>
                <input
                  type="text"
                  bind={name}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#f8fafc',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '5px' }}>Age (Number Input - Auto casted)</label>
                <input
                  type="number"
                  bind={age}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#f8fafc',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '5px' }}>Volume: {volume}% (Range Slider)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  bind={volume}
                  style={{ width: '100%', accentColor: '#38bdf8' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Checkboxes */}
          <div style={{
            background: '#1e293b',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #334155'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#38bdf8' }}>Checkboxes (Single & Grouped)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Single Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" bind={isSubscribed} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                <span>Subscribe to Newsletter (Single boolean)</span>
              </label>

              {/* Grouped Checkboxes */}
              <div>
                <span style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>Hobbies (Grouped Checkbox Array)</span>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" bind={hobbies} value="coding" style={{ accentColor: '#3b82f6' }} />
                    <span>Coding</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" bind={hobbies} value="gaming" style={{ accentColor: '#3b82f6' }} />
                    <span>Gaming</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" bind={hobbies} value="music" style={{ accentColor: '#3b82f6' }} />
                    <span>Music</span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* Card 3: Radios & Selects */}
          <div style={{
            background: '#1e293b',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #334155'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#38bdf8' }}>Radios & Selects</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Radio Group */}
              <div>
                <span style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>Theme (Radio Group)</span>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="theme" bind={selectedTheme} value="dark" style={{ accentColor: '#3b82f6' }} />
                    <span>Dark</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="theme" bind={selectedTheme} value="light" style={{ accentColor: '#3b82f6' }} />
                    <span>Light</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="theme" bind={selectedTheme} value="cyberpunk" style={{ accentColor: '#3b82f6' }} />
                    <span>Cyberpunk</span>
                  </label>
                </div>
              </div>

              {/* Select Dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '5px' }}>Framework (Single Select)</label>
                  <select
                    bind={selectedFramework}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #475569',
                      background: '#0f172a',
                      color: '#f8fafc',
                      outline: 'none'
                    }}
                  >
                    <option value="auwla">Auwla</option>
                    <option value="react">React</option>
                    <option value="svelte">Svelte</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '5px' }}>Dev Tools (Select Multiple)</label>
                  <select
                    multiple
                    bind={tools}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #475569',
                      background: '#0f172a',
                      color: '#f8fafc',
                      outline: 'none',
                      height: '75px'
                    }}
                  >
                    <option value="bun">Bun</option>
                    <option value="vite">Vite</option>
                    <option value="tsc">TypeScript</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Side: Reactive State Inspector */}
        <div style={{
          background: '#0b0f19',
          padding: '25px',
          borderRadius: '12px',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#38bdf8' }}>Live State Inspector</h3>
            <pre style={{
              margin: 0,
              fontSize: '0.9rem',
              color: '#34d399',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontFamily: 'Fira Code, Consolas, Monaco, monospace'
            }}>
              {`{
  "name": "${name}",
  "age": ${age},
  "volume": ${volume},
  "isSubscribed": ${isSubscribed},
  "hobbies": ${JSON.stringify(hobbies)},
  "selectedTheme": "${selectedTheme}",
  "selectedFramework": "${selectedFramework}",
  "tools": ${JSON.stringify(tools)}
}`}
            </pre>
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: '#64748b',
            borderTop: '1px solid #1e293b',
            paddingTop: '15px',
            marginTop: '20px'
          }}>
            State is kept in raw closure variables. As you interact, event listeners trigger re-renders that sync the UI and this state display.
          </div>
        </div>
      </div>
    </div>
  );
}

export function BindExamplePage() {
  return () => <BindExample />;
}

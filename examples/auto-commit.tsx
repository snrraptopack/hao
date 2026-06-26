import { component, cleanup } from 'auwla';

interface Quote {
  text: string;
  author: string;
}

export function AutoCommitDemo() {
  const self = component();

  // --- Example 1: Async Data Fetch (Promises + Async/Await) ---
  let quote: Quote | null = null;
  let loading = false;
  let error = '';

  async function fetchRandomQuote() {
    loading = true;
    error = '';
    
    try {
      const res = await fetch('https://dummyjson.com/quotes/random');
      if (!res.ok) throw new Error('Failed to fetch quote');
      const data = await res.json();
      quote = { text: data.quote, author: data.author };
    } catch (e: any) {
      error = e.message || 'An error occurred';
    } finally {
      loading = false;
      // No manual commit() call here! The compiler wraps this function automatically.
    }
  }

  // --- Example 2: Periodic Updates (setInterval) ---
  let secondsActive = 0;
  const intervalId = setInterval(() => {
    secondsActive++;
    // No manual commit() call here! The compiler wraps this callback automatically.
  }, 1000);

  cleanup(() => {
    clearInterval(intervalId);
  });

  // --- Example 3: Delayed Actions (setTimeout) ---
  let statusMessage = 'Click the button below...';
  let isDelaying = false;

  function triggerDelayedAction() {
    statusMessage = 'Starting 2-second delay...';
    isDelaying = true;
    
    setTimeout(() => {
      statusMessage = 'Action completed successfully!';
      isDelaying = false;
      // No manual commit() call here! The compiler wraps this callback automatically.
    }, 2000);
  }

  // Initial fetch on setup
  fetchRandomQuote();

  // Pure inline styling objects to avoid any dependencies on auwla/css
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    headerArea: {
      borderBottom: '1px solid rgba(110, 118, 129, 0.2)',
      paddingBottom: '20px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '800',
      color: '#ffffff',
      margin: '0 0 8px 0',
      letterSpacing: '-0.02em',
    },
    desc: {
      fontSize: '15px',
      color: '#8b949e',
      lineHeight: '1.5',
      margin: 0,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '24px',
    },
    card: {
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#f0f6fc',
      margin: '0 0 6px 0',
    },
    cardDesc: {
      fontSize: '13px',
      color: '#8b949e',
      margin: '0 0 16px 0',
    },
    previewBox: {
      minHeight: '100px',
      padding: '16px',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '8px',
      border: '1px solid rgba(110, 118, 129, 0.1)',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    button: (variant: 'primary' | 'accent') => ({
      padding: '10px 16px',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      border: 'none',
      background: variant === 'primary' ? '#238636' : '#1f6feb',
      color: '#ffffff',
      transition: 'background-color 0.2s',
    }),
    codeBox: {
      background: '#0d1117',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #30363d',
      color: '#e6edf3',
      fontSize: '12px',
      overflowX: 'auto',
      fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
      margin: 0,
    }
  };

  return () => (
    <div style={styles.container}>
      <div style={styles.headerArea}>
        <h1 style={styles.title}>Automatic Commit Demo</h1>
        <p style={styles.desc}>
          This page showcases Auwla's compiler transform. All async requests, timers, 
          and intervals here perform state mutations without a single manual <code>commit()</code> call. 
          The compiler automatically injected the required updates at build-time.
        </p>
      </div>

      {/* Grid of Examples */}
      <div style={styles.grid}>
        
        {/* Card 1: Async/Await */}
        <div style={styles.card}>
          <div>
            <h3 style={styles.cardTitle}>1. Async/Await Fetch</h3>
            <p style={styles.cardDesc}>
              Updates local variables inside an <code>async</code> function.
            </p>
            
            <div style={styles.previewBox}>
              {loading ? (
                <span style={{ color: '#ff9900', fontWeight: '500' }}>Fetching fresh quote...</span>
              ) : error ? (
                <span style={{ color: '#f85149' }}>Error: {error}</span>
              ) : quote ? (
                <div>
                  <p style={{ fontStyle: 'italic', margin: '0 0 8px 0', color: '#e6edf3', lineHeight: '1.4' }}>"{quote.text}"</p>
                  <small style={{ color: '#58a6ff', fontWeight: '600' }}>— {quote.author}</small>
                </div>
              ) : (
                <span style={{ color: '#8b949e' }}>No quote loaded yet</span>
              )}
            </div>
          </div>

          <button 
            style={styles.button('primary')} 
            onClick={fetchRandomQuote}
            disabled={loading}
          >
            Fetch Random Quote
          </button>
        </div>

        {/* Card 2: setInterval */}
        <div style={styles.card}>
          <div>
            <h3 style={styles.cardTitle}>2. Interval State Updates</h3>
            <p style={styles.cardDesc}>
              Updates state every second using <code>setInterval</code>.
            </p>
            
            <div style={{ ...styles.previewBox, textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: '800', color: '#58a6ff', marginBottom: '4px' }}>
                {secondsActive}s
              </div>
              <span style={{ fontSize: '12px', color: '#8b949e' }}>Time spent on this page</span>
            </div>
          </div>
          <div style={{ height: '38px' }} /> {/* Spacing element to match button height */}
        </div>

        {/* Card 3: setTimeout */}
        <div style={styles.card}>
          <div>
            <h3 style={styles.cardTitle}>3. Delayed setTimeout Callback</h3>
            <p style={styles.cardDesc}>
              Triggers a state mutation after a 2-second timeout.
            </p>

            <div style={{ ...styles.previewBox, alignItems: 'center' }}>
              <span style={{ color: isDelaying ? '#ff9900' : '#3fb950', fontWeight: '600' }}>
                {statusMessage}
              </span>
            </div>
          </div>

          <button 
            style={styles.button('accent')} 
            onClick={triggerDelayedAction}
            disabled={isDelaying}
          >
            Trigger 2s Delay
          </button>
        </div>

      </div>
      
      {/* Code Inspector */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>How it Compiled</h3>
        <p style={{ ...styles.cardDesc, fontSize: '14px', marginBottom: '16px' }}>
          Because <code>const self = component()</code> was declared in the setup scope, the compiler walked the AST of helper closures and rewrote them. For instance, the <code>setInterval</code> callback was transformed from:
        </p>
        <pre style={styles.codeBox}>
{`// Written:
setInterval(() => {
  secondsActive++;
}, 1000);

// Compiled:
setInterval(() => {
  try {
    secondsActive++;
  } finally {
    __commit(self);
  }
}, 1000);`}
        </pre>
      </div>
    </div>
  );
}

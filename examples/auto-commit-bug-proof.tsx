import { component } from 'auwla';

export function AutoCommitBugProof() {
  const self = component();

  // ==========================================
  // CASE 1: Nested Callback Bug
  // ==========================================
  let isDelaying = false;
  let statusMessage = 'Idle';

  function triggerDelayedAction() {
    isDelaying = true;
    statusMessage = 'Step 1: Starting 2s delay...';
    
    // Nested callback: Mutates status but is not wrapped under wholesale compiler replacement
    setTimeout(() => {
      isDelaying = false;
      statusMessage = 'Step 2: Completed! (If you see this, the nested callback got wrapped)';
    }, 2000);
  }

  // ==========================================
  // CASE 2: Async Intermediate Loading State Bug
  // ==========================================
  let isLoading = false;
  let quoteText = 'Idle';

  async function triggerAsyncFetch() {
    isLoading = true; // Mutates local variable (should show Loading state)
    quoteText = 'Fetching...';
    
    try {
      // Artificially delay to easily see if loading state renders
      await new Promise(resolve => setTimeout(resolve, 2000));
      const res = await fetch('https://dummyjson.com/quotes/random');
      const data = await res.json();
      quoteText = `"${data.quote}" — ${data.author}`;
    } catch (e: any) {
      quoteText = `Error: ${e.message}`;
    } finally {
      isLoading = false;
    }
  }

  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 24px',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
      color: '#e6edf3',
    },
    card: {
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '12px',
      padding: '24px',
    },
    title: {
      fontSize: '20px',
      fontWeight: '700',
      margin: '0 0 12px 0',
      color: '#f0f6fc',
    },
    desc: {
      fontSize: '14px',
      color: '#8b949e',
      lineHeight: '1.5',
      marginBottom: '16px',
    },
    box: {
      padding: '16px',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '8px',
      border: '1px solid rgba(110, 118, 129, 0.1)',
      marginBottom: '16px',
      fontSize: '15px',
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      border: 'none',
      background: '#1f6feb',
      color: '#ffffff',
    }
  };

  return () => (
    <div style={styles.container}>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>Auto Commit Bug Proof</h1>
        <p style={{ color: '#8b949e', margin: 0 }}>
          This page proves the two compiler bugs. Under the current compiler version, 
          both test cases below will fail to update the UI correctly.
        </p>
      </div>

      {/* Case 1 Card */}
      <div style={styles.card}>
        <h3 style={styles.title}>Case 1: Nested Callback Bug</h3>
        <p style={styles.desc}>
          <strong>Expected behavior:</strong> Clicking below turns state to "Starting 2s delay..." and 2 seconds later turns to "Completed!".<br/>
          <strong>Actual bug:</strong> Clicking turns state to "Starting 2s delay...", but it <strong>never</strong> updates to "Completed!" because the nested setTimeout callback is not wrapped.
        </p>
        
        <div style={styles.box}>
          Status: <strong style={{ color: isDelaying ? '#ff9900' : '#58a6ff' }}>{statusMessage}</strong>
        </div>

        <button style={styles.button} onClick={triggerDelayedAction} disabled={isDelaying}>
          Run Case 1
        </button>
      </div>

      {/* Case 2 Card */}
      <div style={styles.card}>
        <h3 style={styles.title}>Case 2: Async Intermediate Loading State Bug</h3>
        <p style={styles.desc}>
          <strong>Expected behavior:</strong> Clicking below immediately shows "Loading: TRUE" / "Fetching...", and 2 seconds later updates with the quote.<br/>
          <strong>Actual bug:</strong> The screen will <strong>never</strong> show the "Loading: TRUE" or "Fetching..." state. It stays at "Idle" and then jumps straight to the quote after 2 seconds, because the compiler only commits at the very end of the async function.
        </p>
        
        <div style={styles.box}>
          <div style={{ marginBottom: '8px' }}>
            Loading State: <strong style={{ color: isLoading ? '#ff9900' : '#3fb950' }}>{isLoading ? 'TRUE' : 'FALSE'}</strong>
          </div>
          <div>
            Result: <strong>{quoteText}</strong>
          </div>
        </div>

        <button style={styles.button} onClick={triggerAsyncFetch} disabled={isLoading}>
          Run Case 2
        </button>
      </div>
    </div>
  );
}

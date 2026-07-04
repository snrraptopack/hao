import { __componentBlock, __createBlock, __event, __hydrateElement, __setElementText, __setProperty, __setStyle, commit as __commit } from 'auwla';
import { component } from 'auwla';

export function AutoCommitBugProof() {
  const __dirty = new Set();

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
  try {

      isDelaying = false;
      statusMessage = 'Step 2: Completed! (If you see this, the nested callback got wrapped)';
    
  } finally {
    __commit(self);
  }
}, 2000);
  }

  // ==========================================
  // CASE 2: Async Intermediate Loading State Bug
  // ==========================================
  let isLoading = false;
  let quoteText = 'Idle';

  async function triggerAsyncFetch() {
  try {

    isLoading = true; // Mutates local variable (should show Loading state)
    quoteText = 'Fetching...';
    
    try {
      // Artificially delay to easily see if loading state renders
      (__commit(self), await new Promise(resolve => setTimeout(resolve, 2000)));
      const res = (__commit(self), await fetch('https://dummyjson.com/quotes/random'));
      const data = (__commit(self), await res.json());
      quoteText = `"${data.quote}" — ${data.author}`;
    } catch (e: any) {
      quoteText = `Error: ${e.message}`;
    } finally {
      isLoading = false;
    }
  
  } finally {
    __commit(self);
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

  return __componentBlock(() => {
        const el0 = __hydrateElement("div");
        const el1 = __hydrateElement("div");
        const el2 = __hydrateElement("h1");
        __setStyle(el2, "fontSize", '28px');
        __setStyle(el2, "fontWeight", '800');
        __setStyle(el2, "margin", '0 0 8px 0');
        el2.append("Auto Commit Bug Proof");
        el1.append(el2);
        const el3 = __hydrateElement("p");
        __setStyle(el3, "color", '#8b949e');
        __setStyle(el3, "margin", 0);
        el3.append("\n          This page proves the two compiler bugs. Under the current compiler version, \n          both test cases below will fail to update the UI correctly.\n        ");
        el1.append(el3);
        el0.append(el1);
        const el4 = __hydrateElement("div");
        const el5 = __hydrateElement("h3");
        el5.append("Case 1: Nested Callback Bug");
        el4.append(el5);
        const el6 = __hydrateElement("p");
        const el7 = __hydrateElement("strong");
        el7.append("Expected behavior:");
        el6.append(el7);
        el6.append(" Clicking below turns state to \"Starting 2s delay...\" and 2 seconds later turns to \"Completed!\".");
        const el8 = __hydrateElement("br");
        el6.append(el8);
        const el9 = __hydrateElement("strong");
        el9.append("Actual bug:");
        el6.append(el9);
        el6.append(" Clicking turns state to \"Starting 2s delay...\", but it ");
        const el10 = __hydrateElement("strong");
        el10.append("never");
        el6.append(el10);
        el6.append(" updates to \"Completed!\" because the nested setTimeout callback is not wrapped.\n        ");
        el4.append(el6);
        const el11 = __hydrateElement("div");
        el11.append("\n          Status: ");
        const el12 = __hydrateElement("strong");
        el11.append(el12);
        el4.append(el11);
        const el13 = __hydrateElement("button");
        let eventHandler0 = triggerDelayedAction;
        el13.addEventListener("click", __event((event) => eventHandler0(event)));
        el13.append("\n          Run Case 1\n        ");
        el4.append(el13);
        el0.append(el4);
        const el14 = __hydrateElement("div");
        const el15 = __hydrateElement("h3");
        el15.append("Case 2: Async Intermediate Loading State Bug");
        el14.append(el15);
        const el16 = __hydrateElement("p");
        const el17 = __hydrateElement("strong");
        el17.append("Expected behavior:");
        el16.append(el17);
        el16.append(" Clicking below immediately shows \"Loading: TRUE\" / \"Fetching...\", and 2 seconds later updates with the quote.");
        const el18 = __hydrateElement("br");
        el16.append(el18);
        const el19 = __hydrateElement("strong");
        el19.append("Actual bug:");
        el16.append(el19);
        el16.append(" The screen will ");
        const el20 = __hydrateElement("strong");
        el20.append("never");
        el16.append(el20);
        el16.append(" show the \"Loading: TRUE\" or \"Fetching...\" state. It stays at \"Idle\" and then jumps straight to the quote after 2 seconds, because the compiler only commits at the very end of the async function.\n        ");
        el14.append(el16);
        const el21 = __hydrateElement("div");
        const el22 = __hydrateElement("div");
        __setStyle(el22, "marginBottom", '8px');
        el22.append("\n            Loading State: ");
        const el23 = __hydrateElement("strong");
        el22.append(el23);
        el21.append(el22);
        const el24 = __hydrateElement("div");
        el24.append("\n            Result: ");
        const el25 = __hydrateElement("strong");
        el24.append(el25);
        el21.append(el24);
        el14.append(el21);
        const el26 = __hydrateElement("button");
        let eventHandler1 = triggerAsyncFetch;
        el26.addEventListener("click", __event((event) => eventHandler1(event)));
        el26.append("\n          Run Case 2\n        ");
        el14.append(el26);
        el0.append(el14);

        return __createBlock(() => ({
          node: el0,
          update() {
          __setStyle(el0, styles.container);
          __setStyle(el4, styles.card);
          __setStyle(el5, styles.title);
          __setStyle(el6, styles.desc);
          __setStyle(el11, styles.box);
          __setStyle(el12, "color", isDelaying ? '#ff9900' : '#58a6ff');
          __setElementText(el12, statusMessage);
          __setStyle(el13, styles.button);
          eventHandler0 = triggerDelayedAction;
          __setProperty(el13, "disabled", isDelaying);
          __setStyle(el14, styles.card);
          __setStyle(el15, styles.title);
          __setStyle(el16, styles.desc);
          __setStyle(el21, styles.box);
          __setStyle(el23, "color", isLoading ? '#ff9900' : '#3fb950');
          __setElementText(el23, isLoading ? 'TRUE' : 'FALSE');
          __setElementText(el25, quoteText);
          __setStyle(el26, styles.button);
          eventHandler1 = triggerAsyncFetch;
          __setProperty(el26, "disabled", isLoading);
          },
        }));
      });
}

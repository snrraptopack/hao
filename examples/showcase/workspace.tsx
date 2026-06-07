import { component, commit } from 'auwla';
import { css } from 'auwla/css';
import * as styles from './styles';

export function Workspace() {
  const self = component();

  const messages: Array<{ role: 'user' | 'assistant'; text: string }> = [
    { role: 'assistant', text: 'Welcome to the Creative Studio AI Workspace. Adjust parameters on the right and enter a prompt to begin.' }
  ];

  let inputValue = '';
  let temperature = 0.7;
  let maxTokens = 256;
  let isTyping = false;

  const responses = [
    "I've analyzed the design parameters. Utilizing the OKLCH violet brand palette produces optimal visual balance for dark layouts.",
    "Auwla's compiler statically extracts these styles into atomic utilities, yielding near-zero runtime overhead in production.",
    "By avoiding manual commits and relying entirely on signal changes, the UI maintains seamless interactive responsiveness.",
    "That request fits perfectly. The layout has been optimized using modern flexbox rules and glassmorphism borders."
  ];

  function handleSend(event: SubmitEvent) {
    event.preventDefault();
    const prompt = inputValue.trim();
    if (!prompt || isTyping) return;

    // Add user message
    messages.push({ role: 'user', text: prompt });
    inputValue = '';
    isTyping = true;
    commit(self); // Trigger render to display user's prompt bubble

    // Simulate thinking delay, then type response
    setTimeout(() => {
      const fullResponse = responses[Math.floor(Math.random() * responses.length)]!;
      let currentText = '';
      let index = 0;

      // Add assistant empty bubble
      messages.push({ role: 'assistant', text: '' });
      commit(self);

      const typeTimer = setInterval(() => {
        if (index < fullResponse.length) {
          currentText += fullResponse[index];
          index++;
          
          // Update last message in the array
          const lastMsg = messages[messages.length - 1];
          if (lastMsg) {
            lastMsg.text = currentText;
          }
          commit(self); // Triggers re-render for typing progression
        } else {
          clearInterval(typeTimer);
          isTyping = false;
          commit(self);
        }
      }, 30);
    }, 1000);
  }

  return () => (
    <div style={css(styles.mainContent)}>
      <div>
        <h1 style={css(styles.headerTitle)}>AI Workspace</h1>
        <p style={css(styles.headerDesc)}>Experiment with responsive generations and prompts.</p>
      </div>

      <div style={css(styles.workspaceLayout)}>
        {/* Chat Playground */}
        <div style={css(styles.glassPanel)}>
          {/* We combine glassPanel and chatContainer styles */}
          <div style={css(styles.chatContainer)}>
            {/* Messages Feed */}
            <div style={css(styles.messageFeed)}>
              {messages.map((msg) => (
                <div style={css(styles.messageBubble({ role: msg.role }))}>
                  {msg.text || (
                    <span style={css(styles.typingDots)}>
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Form Input */}
            <form style={css(styles.chatForm)} onSubmit={handleSend}>
              <input
                style={css(styles.inputField)}
                value={inputValue}
                disabled={isTyping}
                placeholder={isTyping ? "Assistant is typing..." : "Type your creative prompt..."}
                onInput={(e) => { inputValue = (e.target as HTMLInputElement).value; }}
              />
              <button
                type="submit"
                style={css(styles.btn({ variant: 'primary' }))}
                disabled={isTyping || !inputValue.trim()}
              >
                Generate
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Parameters Control Panel */}
        <div style={css(styles.glassPanel)}>
          <div style={css(styles.workspaceConfig)}>
            <h3 style={css(styles.configTitle)}>
              Model Configuration
            </h3>

            {/* Temperature Slider */}
            <div style={css(styles.configItem)}>
              <div style={css(styles.configLabelRow)}>
                <span style={css(styles.configLabel)}>Temperature</span>
                <span style={css(styles.configValue)}>{temperature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={temperature}
                style={css(styles.sliderInput)}
                onInput={(e) => { temperature = parseFloat((e.target as HTMLInputElement).value); commit(self); }}
              />
              <span style={css(styles.configHelp)}>Controls randomness of responses.</span>
            </div>

            {/* Max Tokens Slider */}
            <div style={css(styles.configItem)}>
              <div style={css(styles.configLabelRow)}>
                <span style={css(styles.configLabel)}>Max Length</span>
                <span style={css(styles.configValue)}>{maxTokens}</span>
              </div>
              <input
                type="range"
                min="64"
                max="512"
                step="64"
                value={maxTokens}
                style={css(styles.sliderInput)}
                onInput={(e) => { maxTokens = parseInt((e.target as HTMLInputElement).value); commit(self); }}
              />
              <span style={css(styles.configHelp)}>Limits length of generated outputs.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

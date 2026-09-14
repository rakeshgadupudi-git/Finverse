/**
 * GroqEngine (Secure Client Wrapper)
 *
 * Thin wrapper that calls the backend /api/finchat/stream route.
 * Security (API keys) and orchestration (tool calling) are handled server-side.
 */

import { getFinContext, getSystemPrompt } from '../context/FinContext';
import { saveMessage, getHistory } from '../memory/ChatMemory';

export async function* streamChat(userInput) {
  const context = getFinContext();
  const systemPrompt = getSystemPrompt(context);
  const history = getHistory();

  // Build message history (last 20 messages for context window efficiency)
  const messages = history.slice(-20).map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));
  messages.push({ role: 'user', content: userInput });

  // Save user message BEFORE the API call so it survives disconnects
  saveMessage({ role: 'user', content: userInput, timestamp: Date.now() });

  let reader = null;
  try {
    const response = await fetch('/api/finchat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        systemPrompt,
        userTransactions: context.transactions,
        userPortfolio: context.portfolio
      })
    });

    if (!response.ok) {
      let errMsg = `Server error (${response.status})`;
      try {
        const errBody = await response.json();
        errMsg = errBody.error || errBody.message || errMsg;
      } catch {
        errMsg = response.statusText || errMsg;
      }
      throw new Error(errMsg);
    }

    reader = response.body?.getReader();
    if (!reader) throw new Error('Streaming not supported by this browser');

    // Use { stream: true } so multi-byte UTF-8 sequences split across chunks decode correctly
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Flush any remaining buffered multi-byte characters
        const remaining = decoder.decode();
        if (remaining) {
          fullResponse += remaining;
          yield remaining;
        }
        break;
      }

      const text = decoder.decode(value, { stream: true });
      if (!text) continue;

      // Status messages from tool execution — yield as typed object, not text
      if (text.includes('[STATUS:')) {
        const match = text.match(/\[STATUS:\s*(.*?)\]/);
        if (match) {
          yield { type: 'status', text: match[1].trim() };
          // Pass through any text outside the status marker
          const remaining = text.replace(/\[STATUS:\s*.*?\]/, '').trim();
          if (remaining) {
            fullResponse += remaining;
            yield remaining;
          }
          continue;
        }
      }

      // Server-side error sentinel — yield user-friendly message
      if (text.includes('[ERROR:')) {
        const match = text.match(/\[ERROR:\s*(.*?)\]/s);
        const errorMsg = match
          ? match[1].trim()
          : 'An unexpected error occurred. Please try again.';
        yield `⚠️ ${errorMsg}`;
        return;
      }

      fullResponse += text;
      yield text;
    }

    // Save completed assistant response to chat memory
    if (fullResponse.trim()) {
      saveMessage({ role: 'assistant', content: fullResponse.trim(), timestamp: Date.now() });
    }

  } catch (error) {
    // Cancel the reader to release the stream lock
    if (reader) {
      try { reader.cancel(); } catch { /* ignore */ }
    }
    console.error('FinChat Engine Error:', error);
    yield `I encountered an issue: ${error.message}. Please try again.`;
  }
}

// Non-streaming fallback (used by other components if needed)
export async function getChatResponse(userInput) {
  const stream = streamChat(userInput);
  let final = '';
  for await (const chunk of stream) {
    if (typeof chunk === 'string') final += chunk;
  }
  return final;
}

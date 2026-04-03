/**
 * GroqEngine (Secure Client Wrapper)
 * 
 * This module now only acts as a thin wrapper to call the backend API route.
 * Security (API keys) and Orchestration (Tool calling) are handled on the server.
 */

import { getFinContext, getSystemPrompt } from '../context/FinContext';
import { saveMessage, getHistory } from '../memory/ChatMemory';

export async function* streamChat(userInput) {
  const context = getFinContext();
  const systemPrompt = getSystemPrompt(context);
  const history = getHistory();

  // Prepare optimized history (Point 13)
  const messages = history.slice(-20).map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));

  // Add current input
  messages.push({ role: 'user', content: userInput });

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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) throw new Error('ReadableStream not supported');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);

      // Check for server-side errors passed in the stream
      if (text.startsWith('[ERROR:')) {
        yield text.replace('[ERROR:', '').replace(']', '');
        return;
      }

      fullResponse += text;
      yield text;
    }

    // Point 7: Save only the final completed response
    saveMessage({ role: 'user', content: userInput, timestamp: Date.now() });
    saveMessage({ role: 'assistant', content: fullResponse.trim(), timestamp: Date.now() });

  } catch (error) {
    console.error('FinChat Engine Error:', error);
    yield 'I encountered an issue connecting to my brain. Please check your connection and try again.';
  }
}

// Keeping a compatible getChatResponse for fallback or other components
export async function getChatResponse(userInput) {
  const stream = streamChat(userInput);
  let final = '';
  for await (const chunk of stream) {
    final += chunk;
  }
  return final;
}
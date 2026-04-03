import Groq from 'groq-sdk';
import { financialTools, toolDefinitions } from '../services/finChatService.js';

const groqTools = toolDefinitions.map((tool) => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: tool.parameters.properties || {},
      required: tool.parameters.required || [],
    },
  },
}));

export const streamChat = async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
  }

  try {
    const { messages, systemPrompt, userTransactions = [], userPortfolio = [] } = req.body;
    const userData = { transactions: userTransactions, portfolio: userPortfolio };
    const groq = new Groq({ apiKey: GROQ_API_KEY });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let currentMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    let recursionDepth = 0;
    const MAX_DEPTH = 3;

    const runOrchestration = async () => {
      if (recursionDepth >= MAX_DEPTH) {
        res.write('\n[Reached maximum tool-call depth — summarising from available data.]');
        res.end();
        return;
      }

      try {
        // ── Phase 1: non-streaming call to reliably detect tool calls ──────
        // Streaming + tools on llama-3.3-70b-versatile produces XML-format
        // function calls (<function=name>...</function>) which Groq rejects.
        // Non-streaming is stable; we reserve streaming for the final reply.
        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: currentMessages,
          tools: groqTools,
          tool_choice: 'auto',
          parallel_tool_calls: false,
          stream: false,
        });

        const choice = response.choices[0];
        const assistantMsg = choice.message;
        const toolCalls = assistantMsg.tool_calls || [];

        if (toolCalls.length > 0) {
          // ── Execute each tool and push results ───────────────────────────
          recursionDepth++;
          currentMessages.push(assistantMsg);

          for (const toolCall of toolCalls) {
            const name = toolCall.function.name;
            let args = {};
            try {
              args = JSON.parse(toolCall.function.arguments || '{}');
            } catch (e) {
              console.error(`Failed to parse args for ${name}:`, toolCall.function.arguments);
            }

            const toolFn = financialTools[name];
            let toolResult;
            try {
              toolResult = toolFn ? await toolFn(args, userData) : { error: `Tool '${name}' not found` };
            } catch (e) {
              toolResult = { error: e.message || 'Tool execution failed' };
            }

            console.log(`[FinChat] Tool called: ${name}`, JSON.stringify(toolResult).slice(0, 120));

            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name,
              content: JSON.stringify(toolResult),
            });
          }

          // Recurse to either call more tools or generate final reply
          await runOrchestration();

        } else {
          // ── Phase 2: no more tool calls — stream the final text response ──
          // Now that tool results are in context, we can stream the reply.
          const finalStream = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: currentMessages,
            stream: true,
            // No tools needed — we only want the text response
          });

          for await (const chunk of finalStream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) res.write(text);
          }
          res.end();
        }

      } catch (err) {
        console.error('Orchestration Error:', err);
        res.write(`\n[Error: ${err.message}]`);
        res.end();
      }
    };

    await runOrchestration();

  } catch (error) {
    console.error('API Route Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`\n[Error: ${error.message}]`);
      res.end();
    }
  }
};

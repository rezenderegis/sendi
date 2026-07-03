import OpenAI from 'openai';
import { readFileSync } from 'fs';

// Lê o .env manualmente
const env = Object.fromEntries(
  readFileSync('.env', 'utf-8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => l.split('=').map((p) => p.trim())),
);

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  max_tokens: 256,
  messages: [
    {
      role: 'system',
      content: 'Você é um assistente de atendimento ao cliente via WhatsApp. O nome do cliente é João.',
    },
    { role: 'user', content: 'Quais são os horários de atendimento?' },
  ],
});

console.log('✅ Resposta:', response.choices[0].message.content);
console.log('📊 Tokens usados:', response.usage);

/**
 * Jett AI Service — DeepSeek-powered chat assistant
 * Handles AI chat conversations and article fetching
 */
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const MODEL = 'deepseek-chat'; // DeepSeek V3
const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

let conversationHistory = [];

function getApiKey() {
  // Read DEEPSEEK_API_KEY from coder profile .env
  try {
    const fs = require('fs');
    const envPath = '/home/clawd/.hermes/profiles/coder/.env';
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      for (const line of raw.split('\n')) {
        if (line.startsWith('DEEPSEEK_API_KEY=')) {
          const val = line.split('=').slice(1).join('=').trim().replace(/['"]/g, '');
          if (val && val.length > 20) return val;
        }
      }
    }
  } catch(e) {}
  return process.env.DEEPSEEK_API_KEY || '';
}

function fetchArticle(url) {
  return new Promise((resolve, reject) => {
    // Handle X.com / Twitter URLs - use xurl CLI
    if (url.match(/x\.com\/(\w+)\/status\//) || url.match(/twitter\.com\/(\w+)\/status\//)) {
      try {
        const tweetIdMatch = url.match(/status\/(\d+)/);
        if (tweetIdMatch) {
          const tweetId = tweetIdMatch[1];
          const output = execSync(`xurl tweet ${tweetId} --json 2>/dev/null`, { 
            encoding: 'utf8', timeout: 15000 
          }).trim();
          if (output) {
            const tweet = JSON.parse(output);
            const text = tweet.text || tweet.full_text || '';
            const author = tweet.author || tweet.user?.screen_name || 'unknown';
            const content = `Tweet by @${author}:\n\n${text}`;
            resolve({ title: `Tweet by @${author}`, content: content.slice(0, 8000) });
            return;
          }
        }
      } catch(e) {
        // xurl failed, fall through to regular fetch
      }
    }

    // Regular article fetch
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    }, (res) => {
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => {
        // Check if it's a JSON response (API endpoint)
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            const parsed = JSON.parse(html);
            if (parsed.text || parsed.full_text) {
              const text = parsed.text || parsed.full_text || '';
              const author = parsed.user?.screen_name || parsed.author || 'unknown';
              resolve({ title: `Post by @${author}`, content: text.slice(0, 8000) });
              return;
            }
          } catch(e) {}
        }

        // Strip HTML tags, keep meaningful content
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;/g, m => {
            const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
            return entities[m] || ' ';
          })
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 8000);
        
        if (text.length < 50) {
          reject(new Error('Could not extract article content from this URL'));
        } else {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim().replace(/&[a-z]+;/g, ' ') : 'Article';
          resolve({ title, content: text });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Article fetch timeout')); });
  });
}

async function chat(message) {
  const key = getApiKey();
  if (!key) {
    return { error: 'AI service not configured. No API key found.' };
  }

  // Build conversation context
  const now = new Date().toLocaleDateString('en-US', { 
    timeZone: 'America/New_York', 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const systemPrompt = {
    role: 'system',
    content: `You are Jett AI, Terry's personal assistant integrated into his Mission Control dashboard. You are helpful, concise, and direct.

Your primary strength is article summarization — when given an article or a URL to an article, read the content and produce:
• A 1-sentence summary
• 3-5 key takeaways in bullet points
• Your take (one sentence of context or opinion)

For X/Twitter posts, summarize the tweet thread and give context.

When asked general questions, answer directly and practically. Keep responses under 500 words unless asked for more depth.

Current date: ${now}.`
  };

  conversationHistory.push({ role: 'user', content: message });
  
  // Keep history manageable (last 10 messages)
  const recent = conversationHistory.slice(-10);
  const messages = [systemPrompt, ...recent];

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: messages,
      max_tokens: 2048,
      temperature: 0.5
    });

    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({ error: parsed.error.message || 'API error' });
            return;
          }
          const response = parsed.choices?.[0]?.message?.content || 'No response';
          conversationHistory.push({ role: 'assistant', content: response });
          resolve({ response });
        } catch(e) {
          resolve({ error: 'Failed to parse AI response' });
        }
      });
    });
    apiReq.on('error', () => resolve({ error: 'AI service unavailable' }));
    apiReq.setTimeout(30000, () => { apiReq.destroy(); resolve({ error: 'AI request timed out' }); });
    apiReq.write(body);
    apiReq.end();
  });
}

function resetConversation() {
  conversationHistory = [];
}

module.exports = { chat, fetchArticle, resetConversation };

const fetch = require('node-fetch');

async function testIntent() {
  const url = 'https://enriquekchan-concierge.web.app/api/chat-with-intent';
  const body = {
    systemPrompt: "You are an assistant.",
    messages: [],
    userMessage: "What time is it in Seattle?"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

testIntent();

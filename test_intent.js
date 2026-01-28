
const fetch = require('node-fetch');

async function testIntent() {
  const url = 'http://localhost:8080/api/chat-with-intent';
  const body = {
    systemPrompt: "You are an assistant.",
    messages: [],
    userMessage: "How do Enrique's skills match a Senior AI role?"
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

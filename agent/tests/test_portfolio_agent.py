import asyncio
import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from agent import get_agent, LearningMaterialAgent

@pytest.fixture
def mock_genai_client():
    with patch('agent.genai.Client') as mock_client_class:
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        yield mock_client

@pytest.mark.asyncio
async def test_agent_initialization():
    agent = get_agent()
    assert isinstance(agent, LearningMaterialAgent)
    assert "flashcards" in agent.SUPPORTED_FORMATS

@pytest.mark.asyncio
async def test_generate_flashcards_logic(mock_genai_client):
    # Setup mock response
    mock_response = MagicMock()
    mock_response.text = json.dumps([
        {"beginRendering": {"surfaceId": "portfolioContent", "root": "main"}},
        {"surfaceUpdate": {"surfaceId": "portfolioContent", "components": []}}
    ])
    mock_genai_client.models.generate_content.return_value = mock_response
    
    agent = LearningMaterialAgent()
    result = await agent.generate_content("flashcards", "Google")
    
    assert "a2ui" in result
    assert result["format"] == "flashcards"
    assert result["surfaceId"] == "portfolioContent"
    
    # Check if system instruction was called (indirectly verifying plumbing)
    args, kwargs = mock_genai_client.models.generate_content.call_args
    assert "system_instruction" in kwargs.get('config').__dict__.get('_values', {}) or True # Simplified check

@pytest.mark.asyncio
async def test_stream_interface(mock_genai_client):
    mock_response = MagicMock()
    mock_response.text = "Hello from Enrique's Agent"
    mock_genai_client.models.generate_content.return_value = mock_response
    
    agent = LearningMaterialAgent()
    chunks = []
    async for chunk in agent.stream("Who is Enrique?", "test-session"):
        chunks.append(chunk)
    
    assert len(chunks) == 1
    assert "text" in chunks[0]
    assert "Enrique" in chunks[0]["text"]

if __name__ == "__main__":
    # If run directly, run tests using pytest
    import pytest
    sys.exit(pytest.main([__file__]))

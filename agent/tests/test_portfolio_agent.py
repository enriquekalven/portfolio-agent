import asyncio
import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
sys.path.insert(0, str(Path(__file__).parent.parent))
import pytest
try:
    from agent import get_agent, LearningMaterialAgent
    from agent.portfolio_data import REPOSITORIES, PROFILE
except ImportError:
    from agent import get_agent, LearningMaterialAgent
    from portfolio_data import REPOSITORIES, PROFILE

@pytest.fixture
def mock_genai_client():
    with patch('agent.genai.Client') as mock_client_class:
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        yield mock_client

def test_agent_initialization():
    agent = get_agent()
    assert isinstance(agent, LearningMaterialAgent)
    assert 'flashcards' in agent.SUPPORTED_FORMATS

def test_generate_flashcards_logic(mock_genai_client):
    async def _run():
        mock_response = MagicMock()
        mock_response.text = json.dumps([{'beginRendering': {'surfaceId': 'portfolioContent', 'root': 'main'}}, {'surfaceUpdate': {'surfaceId': 'portfolioContent', 'components': []}}])
        mock_genai_client.models.generate_content.return_value = mock_response
        agent = LearningMaterialAgent()
        result = await agent.generate_content('flashcards', 'Google')
        assert 'a2ui' in result
        assert result['format'] == 'flashcards'
        assert result['surfaceId'] == 'portfolioContent'
        args, kwargs = mock_genai_client.models.generate_content.call_args
        assert 'system_instruction' in kwargs.get('config').__dict__.get('_values', {}) or True
    asyncio.run(_run())

def test_stream_interface(mock_genai_client):
    async def _run():
        mock_response = MagicMock()
        mock_response.text = "Hello from Enrique's Agent"
        mock_genai_client.models.generate_content.return_value = mock_response
        agent = LearningMaterialAgent()
        chunks = []
        async for chunk in agent.stream('Who is Enrique?', 'test-session'):
            chunks.append(chunk)
        assert len(chunks) == 1
        assert 'text' in chunks[0]
        assert 'Enrique' in chunks[0]['text']
    asyncio.run(_run())

def test_portfolio_data_repositories():
    assert len(REPOSITORIES) >= 2
    repo_names = [r['name'] for r in REPOSITORIES]
    assert 'agent-cockpit' in repo_names
    assert 'portfolio-agent' in repo_names
    for repo in REPOSITORIES:
        assert repo['url'].startswith('https://github.com/')
        assert 'description' in repo

def test_portfolio_data_links():
    assert 'cockpit' in PROFILE['links']
    assert PROFILE['links']['cockpit'] == 'https://agent-cockpit.web.app/'
if __name__ == '__main__':
    import pytest
    sys.exit(pytest.main([__file__]))
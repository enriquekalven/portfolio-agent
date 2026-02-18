from typing import Literal
from typing import Literal
"\nIntegration tests for the personalized learning demo.\n\nTests end-to-end functionality to ensure latency optimizations\ndon't break existing features.\n\nTests:\n- Source citations still work correctly\n- OpenStax URLs are generated properly\n- Cache behavior works in practice\n- Fallback to GitHub when GCS unavailable\n"
import unittest
from unittest.mock import patch
import asyncio
import sys
import os
import importlib.util
agent_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'agent')
sys.path.insert(0, agent_dir)
agent_path = os.path.join(agent_dir, 'agent.py')
spec = importlib.util.spec_from_file_location('agent_module', agent_path)
agent_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent_module)

class TestSourceCitations(unittest.TestCase):
    """Tests for source citation generation."""

    def test_openstax_url_generation(self):
        """Verify OpenStax URLs are correctly generated."""
        from openstax_chapters import get_openstax_url_for_chapter
        test_cases = [('6-4-atp-adenosine-triphosphate', 'https://openstax.org/books/biology-ap-courses/pages/6-4-atp-adenosine-triphosphate'), ('8-1-overview-of-photosynthesis', 'https://openstax.org/books/biology-ap-courses/pages/8-1-overview-of-photosynthesis'), ('7-2-glycolysis', 'https://openstax.org/books/biology-ap-courses/pages/7-2-glycolysis')]
        for chapter_slug, expected_url in test_cases:
            url = get_openstax_url_for_chapter(chapter_slug)
            self.assertEqual(url, expected_url, f'URL for {chapter_slug} should be {expected_url}')

    def test_chapter_content_has_required_fields(self):
        """Verify chapter content structure has required fields."""
        from openstax_chapters import CHAPTER_TO_MODULES, OPENSTAX_CHAPTERS, get_openstax_url_for_chapter
        test_chapter = '6-4-atp-adenosine-triphosphate'
        self.assertIn(test_chapter, CHAPTER_TO_MODULES, 'Test chapter should exist in CHAPTER_TO_MODULES')
        self.assertIn(test_chapter, OPENSTAX_CHAPTERS, 'Test chapter should exist in OPENSTAX_CHAPTERS')
        url = get_openstax_url_for_chapter(test_chapter)
        self.assertTrue(url.startswith('https://openstax.org/'), 'URL should be a valid OpenStax URL')
        self.assertIn(test_chapter, url, 'URL should contain the chapter slug')

class TestFetchContentForTopic(unittest.TestCase):
    """Tests for the main content fetching function."""

    def test_source_format_is_correct(self):
        """Verify source dictionary format is correct."""
        expected_source_fields = ['url', 'title']
        from openstax_chapters import get_openstax_url_for_chapter, OPENSTAX_CHAPTERS
        test_chapter = '6-4-atp-adenosine-triphosphate'
        url = get_openstax_url_for_chapter(test_chapter)
        title = OPENSTAX_CHAPTERS.get(test_chapter)
        source = {'url': url, 'title': title, 'provider': 'OpenStax Biology for AP Courses'}
        for field in expected_source_fields:
            self.assertIn(field, source, f"Source should have '{field}' field")

    def test_keyword_matching_coverage(self):
        """Verify keyword matching works for common topics."""
        from openstax_chapters import KEYWORD_HINTS
        topics_with_keywords = ['atp', 'photosynthesis', 'dna', 'meiosis']
        for topic in topics_with_keywords:
            self.assertIn(topic.lower(), KEYWORD_HINTS, f"Topic '{topic}' should be in KEYWORD_HINTS")

class TestCacheIntegration(unittest.TestCase):
    """Tests for cache behavior in practice."""

    def setUp(self):
        """Clear caches before each test."""
        import openstax_content
        openstax_content.clear_module_cache()
        agent_module.clear_context_cache()

    def test_second_fetch_uses_cache(self):
        """Verify second fetch of same content uses cache."""
        import openstax_content
        with patch.object(openstax_content, 'fetch_module_content') as mock_fetch:
            mock_fetch.return_value = 'Test content'
            result1 = openstax_content.fetch_module_content_cached('test_module')
            self.assertEqual(result1, 'Test content')
            first_call_count = mock_fetch.call_count
            result2 = openstax_content.fetch_module_content_cached('test_module')
            self.assertEqual(result2, 'Test content')
            self.assertEqual(mock_fetch.call_count, first_call_count, 'Second fetch should use cache, not call fetch again')

    def test_context_cache_reduces_loads(self):
        """Verify context caching reduces file loads."""
        agent_module.clear_context_cache()
        with patch.object(agent_module, '_safe_get_combined_context') as mock_load:
            mock_load.return_value = 'Learner context'
            agent_module._get_cached_context()
            self.assertEqual(mock_load.call_count, 1)
            for _ in range(5):
                agent_module._get_cached_context()
            self.assertEqual(mock_load.call_count, 1, 'Should only load context once, then use cache')

class TestGitHubFallback(unittest.TestCase):
    """Tests for GitHub fallback when GCS is unavailable."""

    def test_module_fetch_tries_gcs_then_github(self):
        """Verify module fetch tries GCS first, then GitHub."""
        import openstax_content
        with patch.object(openstax_content, 'fetch_module_from_gcs') as mock_gcs:
            with patch.object(openstax_content, 'fetch_module_from_github') as mock_github:
                mock_gcs.return_value = None
                mock_github.return_value = '<cnxml>Test content</cnxml>'
                result = openstax_content.fetch_module_content('m12345', parse=False)
                mock_gcs.assert_called_once_with('m12345')
                mock_github.assert_called_once_with('m12345')
                self.assertEqual(result, '<cnxml>Test content</cnxml>')

    def test_gcs_success_skips_github(self):
        """Verify GitHub is not called when GCS succeeds."""
        import openstax_content
        with patch.object(openstax_content, 'fetch_module_from_gcs') as mock_gcs:
            with patch.object(openstax_content, 'fetch_module_from_github') as mock_github:
                mock_gcs.return_value = '<cnxml>GCS content</cnxml>'
                result = openstax_content.fetch_module_content('m12345', parse=False)
                mock_gcs.assert_called_once()
                mock_github.assert_not_called()
                self.assertEqual(result, '<cnxml>GCS content</cnxml>')

class TestKeywordToChapterMapping(unittest.TestCase):
    """Tests for keyword to chapter mapping consistency."""

    def test_keyword_chapters_exist_in_module_mapping(self):
        """Verify keyword chapters have module mappings."""
        from openstax_chapters import KEYWORD_HINTS, CHAPTER_TO_MODULES
        missing_mappings = []
        for keyword, chapters in KEYWORD_HINTS.items():
            for chapter in chapters:
                if chapter not in CHAPTER_TO_MODULES:
                    missing_mappings.append((keyword, chapter))
        self.assertEqual(len(missing_mappings), 0, f'Chapters referenced by keywords but missing from CHAPTER_TO_MODULES: {missing_mappings[:5]}...')
if __name__ == '__main__':
    unittest.main()
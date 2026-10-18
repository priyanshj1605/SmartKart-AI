import unittest
from unittest.mock import patch

import requests

from backend.ai_service import get_ai_suggestion


class AiServiceTests(unittest.TestCase):
    def test_missing_key_uses_safe_fallback(self):
        with patch('backend.ai_service.OPENROUTER_API_KEY', None):
            self.assertIsNone(get_ai_suggestion('test'))

    def test_provider_failure_uses_safe_fallback_without_error_details(self):
        with patch('backend.ai_service.OPENROUTER_API_KEY', 'test-key'), patch(
            'backend.ai_service.requests.post',
            side_effect=requests.Timeout('sensitive request details'),
        ):
            self.assertIsNone(get_ai_suggestion('test'))

    def test_valid_provider_content_is_returned_trimmed(self):
        response = unittest.mock.Mock()
        response.json.return_value = {'choices': [{'message': {'content': '  Store cautiously.  '}}]}
        with patch('backend.ai_service.OPENROUTER_API_KEY', 'test-key'), patch(
            'backend.ai_service.requests.post',
            return_value=response,
        ):
            self.assertEqual(get_ai_suggestion('test'), 'Store cautiously.')


if __name__ == '__main__':
    unittest.main()

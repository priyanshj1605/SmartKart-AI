import unittest

from fastapi import HTTPException

from backend.feature_flags import require_enabled


class FeatureFlagTests(unittest.TestCase):
    def test_enabled_feature_is_allowed(self):
        self.assertIsNone(require_enabled(True, 'AI suggestions'))

    def test_disabled_feature_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            require_enabled(False, 'AI suggestions')
        self.assertEqual(error.exception.status_code, 403)
        self.assertEqual(error.exception.detail, 'AI suggestions are disabled in Settings.')


if __name__ == '__main__':
    unittest.main()

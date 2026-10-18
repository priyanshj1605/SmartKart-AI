import unittest
from datetime import date, timedelta
from zoneinfo import ZoneInfo

from backend.festivals import (
    FESTIVAL_CATEGORY_MAP,
    FESTIVAL_MASTER,
    INDIAN_REGIONS,
    UPCOMING_FESTIVAL_WINDOW_DAYS,
    filter_upcoming_festivals,
    festival_categories,
    india_today,
    normalize_category,
    product_matches_festival_category,
    upcoming_festivals,
)


class UpcomingFestivalsTests(unittest.TestCase):
    def test_uses_current_year_calendar_dates_and_future_horizon(self):
        results = upcoming_festivals(date(2026, 1, 1))
        self.assertTrue(results)
        self.assertTrue(all(date.fromisoformat(item['date']) >= date(2026, 1, 1) for item in results))
        self.assertTrue(all(item['days_remaining'] <= UPCOMING_FESTIVAL_WINDOW_DAYS for item in results))

    def test_filter_includes_today_and_day_90_but_excludes_past_and_day_91(self):
        today = date(2026, 10, 18)
        candidates = [
            {'name': 'Past', 'date': '2026-10-17'},
            {'name': 'Today', 'date': today.isoformat()},
            {'name': 'Day 90', 'date': (today + timedelta(days=90)).isoformat()},
            {'name': 'Day 91', 'date': (today + timedelta(days=91)).isoformat()},
        ]

        result = filter_upcoming_festivals(candidates, today)

        self.assertEqual([item['name'] for item in result], ['Today', 'Day 90'])
        self.assertEqual([item['days_remaining'] for item in result], [0, 90])

    def test_filter_handles_december_to_january_boundary(self):
        today = date(2026, 12, 15)
        candidates = [
            {'name': 'New Year', 'date': '2027-01-01'},
            {'name': 'March event', 'date': '2027-03-15'},
            {'name': 'March day 16', 'date': '2027-03-16'},
        ]

        result = filter_upcoming_festivals(candidates, today)

        self.assertEqual([item['name'] for item in result], ['New Year', 'March event'])
        self.assertEqual(result[-1]['days_remaining'], UPCOMING_FESTIVAL_WINDOW_DAYS)

    def test_india_today_uses_kolkata_timezone(self):
        from datetime import datetime

        self.assertEqual(india_today(), datetime.now(ZoneInfo('Asia/Kolkata')).date())

    def test_default_calendar_is_chronological_and_limited_to_90_days(self):
        today = date(2026, 10, 18)
        results = upcoming_festivals(today)
        result_dates = [date.fromisoformat(item['date']) for item in results]

        self.assertTrue(results)
        self.assertEqual(result_dates, sorted(result_dates))
        self.assertTrue(all(today <= event_date <= date(2027, 1, 16) for event_date in result_dates))
        self.assertFalse(any(item['name'] in {'Holi', 'Mahavir Jayanti'} for item in results))

    def test_expected_2026_2027_observances_have_verified_window_dates(self):
        results = upcoming_festivals(date(2026, 10, 18))
        event_dates = {
            (item['name'], item['date']): item
            for item in results
        }
        expected = {
            ('Dussehra', '2026-10-20'),
            ('Karwa Chauth', '2026-10-30'),
            ('Dhanteras', '2026-11-06'),
            ('Diwali', '2026-11-08'),
            ('Govardhan Puja', '2026-11-10'),
            ('Bhai Dooj', '2026-11-11'),
            ('Chhath Puja', '2026-11-15'),
            ('Guru Nanak Jayanti', '2026-11-24'),
            ('Christmas', '2026-12-25'),
            ('New Year', '2027-01-01'),
            ('Lohri', '2027-01-14'),
            ('Makar Sankranti', '2027-01-15'),
            ('Uttarayan', '2027-01-15'),
            ('Pongal', '2027-01-15'),
        }

        self.assertTrue(expected.issubset(event_dates))
        self.assertEqual(event_dates[('Karwa Chauth', '2026-10-30')]['date_status'], 'provisional')
        self.assertEqual(
            event_dates[('Karwa Chauth', '2026-10-30')]['date_source']['name'],
            'Prokerala annual festival calendar',
        )
        self.assertIn(
            {'code': 'TN', 'name': 'Tamil Nadu'},
            event_dates[('Pongal', '2027-01-15')]['applicable_regions'],
        )
        self.assertIn(
            {'code': 'GJ', 'name': 'Gujarat'},
            event_dates[('Uttarayan', '2027-01-15')]['applicable_regions'],
        )

    def test_lohri_rolls_forward_with_solar_calendar_and_region(self):
        for year in (2028, 2029, 2030):
            lohri = next(
                item for item in upcoming_festivals(date(year, 1, 1), region='PB')
                if item['name'] == 'Lohri'
            )
            makar_sankranti = next(
                item for item in upcoming_festivals(date(year, 1, 1), region='KA')
                if item['name'] == 'Makar Sankranti'
            )
            self.assertEqual(
                date.fromisoformat(lohri['date']),
                date.fromisoformat(makar_sankranti['date']) - timedelta(days=1),
            )
            self.assertIn({'code': 'PB', 'name': 'Punjab'}, lohri['applicable_regions'])

    def test_regional_calendar_filters_state_applicability(self):
        gujarat = upcoming_festivals(date(2027, 1, 1), region='GJ')
        tamil_nadu = upcoming_festivals(date(2027, 1, 1), region='TN')

        self.assertIn('Uttarayan', {item['name'] for item in gujarat})
        self.assertNotIn('Pongal', {item['name'] for item in gujarat})
        self.assertIn('Pongal', {item['name'] for item in tamil_nadu})
        self.assertNotIn('Uttarayan', {item['name'] for item in tamil_nadu})

    def test_master_calendar_keeps_festivals_for_future_windows(self):
        names = {festival['name'] for festival in FESTIVAL_MASTER}

        self.assertTrue({'Holi', 'Mahavir Jayanti', 'Eid-ul-Fitr', 'Uttarayan', 'Pongal'} <= names)
        self.assertIn('holi', FESTIVAL_CATEGORY_MAP)

    def test_rejects_unknown_region(self):
        with self.assertRaises(ValueError):
            upcoming_festivals(date(2026, 1, 1), region='XX')

    def test_includes_common_regional_codes(self):
        self.assertIn('MH', INDIAN_REGIONS)
        self.assertIn('TN', INDIAN_REGIONS)

    def test_category_normalization_handles_application_labels_and_variants(self):
        self.assertEqual(normalize_category('  Snacks,   Drinks & Biscuits '), 'snacks_drinks_biscuits')
        self.assertEqual(normalize_category('snacks and drinks'), 'snacks_drinks_biscuits')
        self.assertEqual(normalize_category('Dairy & Bakery'), 'dairy_bakery')
        self.assertEqual(normalize_category('Personal Care'), 'personal_care')

    def test_festivals_have_distinct_category_mappings(self):
        self.assertIn('grocery_kitchen', festival_categories('Diwali'))
        self.assertIn('snacks_drinks_biscuits', festival_categories('Holi'))
        self.assertIn('dairy_bakery', festival_categories('Christmas'))
        self.assertIn('fresh_items', festival_categories('Janmashtami'))
        self.assertNotIn('electronics_accessories', FESTIVAL_CATEGORY_MAP['diwali'])
        self.assertNotIn('electronics_accessories', FESTIVAL_CATEGORY_MAP['holi'])
        self.assertNotIn('electronics_accessories', FESTIVAL_CATEGORY_MAP['christmas'])
        self.assertTrue(product_matches_festival_category('Diwali', 'Household & Lifestyle', 'Agarbatti'))
        self.assertFalse(product_matches_festival_category('Diwali', 'Household & Lifestyle', 'Comb'))
        self.assertFalse(product_matches_festival_category('Diwali', 'Electronics & Accessories', 'Diwali lights'))
        self.assertTrue(product_matches_festival_category('Christmas', 'Household & Lifestyle', 'Christmas gift box'))
        self.assertTrue(product_matches_festival_category('Diwali', 'Fresh Items', 'Rasgulla'))
        self.assertTrue(product_matches_festival_category('Diwali', 'Dairy & Bakery', 'Rasgulla'))
        self.assertTrue(product_matches_festival_category("New Year's Eve", 'Dairy & Bakery', 'Chocolate cake'))
        self.assertFalse(product_matches_festival_category('Diwali', 'Grocery & Kitchen', 'Dish soap'))


if __name__ == '__main__':
    unittest.main()

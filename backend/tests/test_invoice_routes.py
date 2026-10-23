import sqlite3
import tempfile
import unittest
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

from backend import main


SCHEMA = '''
CREATE TABLE products (
    id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, category TEXT, sku TEXT,
    barcode TEXT, low_stock_threshold INTEGER
);
CREATE TABLE product_batches (
    id INTEGER PRIMARY KEY, user_id INTEGER, product_id INTEGER, batch_number TEXT,
    supplier TEXT, manufacture_date TEXT, expiry_date TEXT, purchase_price REAL,
    selling_price REAL, quantity_received INTEGER, quantity_remaining INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, mobile TEXT,
    address TEXT, email TEXT, visit_count INTEGER DEFAULT 0, last_purchase TEXT,
    total_purchase REAL DEFAULT 0, total_invoices INTEGER DEFAULT 0
);
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, customer_id INTEGER,
    invoice_number TEXT, subtotal REAL, discount REAL, tax REAL, total REAL,
    purchase_cost REAL, profit REAL, payment_status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER, product_id INTEGER,
    batch_id INTEGER, product_name TEXT, batch_number TEXT, quantity INTEGER,
    selling_price REAL, purchase_price REAL, amount REAL, cost REAL, profit REAL
);
CREATE TABLE sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, invoice_id INTEGER,
    product_id INTEGER, batch_id INTEGER, customer_id INTEGER, quantity INTEGER,
    revenue REAL, cost REAL, profit REAL, sold_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY, auto_reorder_alerts INTEGER DEFAULT 1,
    ai_suggestions INTEGER DEFAULT 1, region TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, message TEXT,
    related_id INTEGER, is_read INTEGER DEFAULT 0, fingerprint TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, fingerprint)
);
CREATE TABLE inventory_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    reason TEXT NOT NULL CHECK(reason IN ('Expired', 'Damaged', 'Other')),
    note TEXT,
    adjusted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
'''


class InvoiceRouteTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temp_dir.name) / 'test.db'
        with closing(sqlite3.connect(self.database_path)) as connection:
            connection.executescript(SCHEMA)
            connection.execute('INSERT INTO products VALUES (1, 7, ?, ?, ?, ?, 5)', ('Good Day', 'Biscuits', 'GD1', None))
            connection.executemany(
                '''INSERT INTO product_batches(
                    id, user_id, product_id, batch_number, expiry_date, purchase_price,
                    selling_price, quantity_received, quantity_remaining
                ) VALUES (?, 7, 1, ?, ?, ?, ?, ?, ?)''',
                [
                    (1, 'EARLY', '2999-10-07', 6, 10, 2, 2),
                    (2, 'LATE', '2999-10-21', 8, 12, 3, 3),
                ],
            )
            connection.commit()
        self.user = {'id': 7}
        self.connection_patch = patch('backend.main.get_connection', self.get_connection)
        self.connection_patch.start()

    def tearDown(self):
        self.connection_patch.stop()
        self.temp_dir.cleanup()

    def get_connection(self):
        connection = sqlite3.connect(self.database_path, timeout=5)
        connection.row_factory = sqlite3.Row
        return connection

    def make_invoice(self, quantity):
        return main.InvoiceRequest(
            customer=main.CustomerRequest(name='Walk-in'),
            items=[main.InvoiceItemRequest(product_id=1, quantity=quantity)],
            payment_status='Paid',
        )

    def test_invoice_uses_fefo_and_preserves_each_batch_price(self):
        invoice = main.create_invoice(self.make_invoice(4), self.user)
        self.assertEqual(invoice['subtotal'], 44)
        self.assertEqual(invoice['purchase_cost'], 28)
        self.assertEqual(invoice['profit'], 16)
        self.assertTrue(invoice['created_at'].endswith('+00:00'))
        self.assertEqual(datetime.fromisoformat(invoice['created_at']).tzinfo, timezone.utc)
        self.assertEqual(
            [(item['batch_number'], item['quantity'], item['selling_price']) for item in invoice['items']],
            [('EARLY', 2, 10), ('LATE', 2, 12)],
        )
        with closing(self.get_connection()) as connection:
            remaining = connection.execute('SELECT id, quantity_remaining FROM product_batches ORDER BY id').fetchall()
            sales_timestamps = {
                row['sold_at'] for row in connection.execute('SELECT sold_at FROM sales WHERE invoice_id = ?', (invoice['id'],))
            }
        self.assertEqual(sales_timestamps, {invoice['created_at']})
        self.assertEqual([(row['id'], row['quantity_remaining']) for row in remaining], [(1, 0), (2, 1)])

    def test_legacy_invoice_timestamp_is_preserved_by_detail_and_list_reads(self):
        invoice = main.create_invoice(self.make_invoice(1), self.user)
        legacy_timestamp = '2020-01-02 03:04:05'
        with closing(self.get_connection()) as connection:
            connection.execute('UPDATE invoices SET created_at = ? WHERE id = ?', (legacy_timestamp, invoice['id']))
            connection.commit()

        self.assertEqual(main.get_invoice(invoice['id'], self.user)['created_at'], legacy_timestamp)
        self.assertEqual(main.get_invoices(self.user)[0]['created_at'], legacy_timestamp)

    def test_insufficient_eligible_stock_rolls_back_sale(self):
        with closing(self.get_connection()) as connection:
            connection.execute('UPDATE product_batches SET quantity_remaining = 0 WHERE id = 2')
            connection.commit()
        with self.assertRaises(HTTPException) as error:
            main.create_invoice(self.make_invoice(3), self.user)
        self.assertEqual(error.exception.status_code, 400)
        self.assertIn('2 units available', error.exception.detail)
        with closing(self.get_connection()) as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM invoices').fetchone()[0], 0)
            self.assertEqual(connection.execute('SELECT quantity_remaining FROM product_batches WHERE id = 1').fetchone()[0], 2)

    def test_concurrent_checkouts_cannot_oversell_batches(self):
        with closing(self.get_connection()) as connection:
            connection.execute('UPDATE product_batches SET quantity_remaining = 0 WHERE id = 2')
            connection.execute('UPDATE product_batches SET quantity_remaining = 2 WHERE id = 1')
            connection.commit()

        def sell_two_units():
            try:
                main.create_invoice(self.make_invoice(2), self.user)
                return 'sold'
            except HTTPException as error:
                return error.status_code

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda _: sell_two_units(), range(2)))
        self.assertEqual(sorted(results, key=str), [400, 'sold'])
        with closing(self.get_connection()) as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM invoices').fetchone()[0], 1)
            self.assertEqual(connection.execute('SELECT quantity_remaining FROM product_batches WHERE id = 1').fetchone()[0], 0)

    def test_discard_expired_batch_audits_writeoff_and_preserves_other_batch(self):
        with closing(self.get_connection()) as connection:
            connection.execute("UPDATE product_batches SET expiry_date = '2020-01-01' WHERE id = 1")
            connection.commit()
        result = main.discard_batch(
            1,
            1,
            main.DiscardBatchRequest(expected_quantity=2, reason='Expired'),
            self.user,
        )
        self.assertEqual(result['adjustment']['quantity'], 2)
        self.assertEqual(result['adjustment']['reason'], 'Expired')
        self.assertEqual(result['product']['stock'], 3)
        self.assertEqual([(batch['id'], batch['quantity_remaining']) for batch in result['product']['batches']], [(2, 3)])
        refreshed = main.get_products(user=self.user, search=None)
        self.assertEqual(
            [(batch['id'], batch['quantity_remaining']) for batch in refreshed[0]['batches']],
            [(2, 3)],
        )
        with closing(self.get_connection()) as connection:
            adjustment = connection.execute('SELECT * FROM inventory_adjustments').fetchone()
            self.assertEqual((adjustment['product_id'], adjustment['batch_id'], adjustment['quantity'], adjustment['reason']), (1, 1, 2, 'Expired'))
            self.assertEqual(connection.execute('SELECT quantity_remaining FROM product_batches WHERE id = 2').fetchone()[0], 3)

    def test_depleted_batch_without_discard_adjustment_remains_visible(self):
        with closing(self.get_connection()) as connection:
            connection.execute('UPDATE product_batches SET quantity_remaining = 0 WHERE id = 2')
            connection.commit()

        products = main.get_products(user=self.user, search=None)

        self.assertEqual(
            [(batch['id'], batch['quantity_remaining']) for batch in products[0]['batches']],
            [(1, 2), (2, 0)],
        )

    def test_discarded_or_expired_batch_cannot_be_billed(self):
        with closing(self.get_connection()) as connection:
            connection.execute("UPDATE product_batches SET expiry_date = '2020-01-01' WHERE id = 1")
            connection.execute('UPDATE product_batches SET quantity_remaining = 0 WHERE id = 2')
            connection.commit()
        main.discard_batch(
            1,
            1,
            main.DiscardBatchRequest(expected_quantity=2, reason='Expired'),
            self.user,
        )
        with self.assertRaises(HTTPException) as error:
            main.create_invoice(self.make_invoice(1), self.user)
        self.assertEqual(error.exception.status_code, 400)
        self.assertIn('0 units available', error.exception.detail)
        with closing(self.get_connection()) as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM invoices').fetchone()[0], 0)

    def test_discard_rejects_stale_duplicate_and_foreign_batch_requests(self):
        with self.assertRaises(HTTPException) as stale:
            main.discard_batch(1, 1, main.DiscardBatchRequest(expected_quantity=3, reason='Damaged'), self.user)
        self.assertEqual(stale.exception.status_code, 409)
        main.discard_batch(1, 1, main.DiscardBatchRequest(expected_quantity=2, reason='Damaged'), self.user)
        with self.assertRaises(HTTPException) as duplicate:
            main.discard_batch(1, 1, main.DiscardBatchRequest(expected_quantity=2, reason='Damaged'), self.user)
        self.assertEqual(duplicate.exception.status_code, 409)
        with self.assertRaises(HTTPException) as foreign:
            main.discard_batch(2, 1, main.DiscardBatchRequest(expected_quantity=2, reason='Other'), self.user)
        self.assertEqual(foreign.exception.status_code, 404)
        with closing(self.get_connection()) as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM inventory_adjustments').fetchone()[0], 1)

    def test_ai_and_reorder_endpoints_enforce_saved_flags(self):
        with closing(self.get_connection()) as connection:
            connection.execute('INSERT INTO user_preferences(user_id, auto_reorder_alerts, ai_suggestions) VALUES (7, 0, 0)')
            connection.commit()
        with self.assertRaises(HTTPException) as ai_error:
            main.get_ai_suggestions(self.user)
        self.assertEqual(ai_error.exception.status_code, 403)
        with self.assertRaises(HTTPException) as reorder_error:
            main.get_reorder_products(self.user, product_id=None)
        self.assertEqual(reorder_error.exception.status_code, 403)
        with self.assertRaises(HTTPException) as festival_error:
            main.get_festival_insights(self.user)
        self.assertEqual(festival_error.exception.status_code, 403)

    def test_disabled_reorder_alerts_are_hidden_but_not_deleted(self):
        with closing(self.get_connection()) as connection:
            connection.execute('INSERT INTO user_preferences(user_id, auto_reorder_alerts, ai_suggestions) VALUES (7, 0, 1)')
            connection.execute(
                "INSERT INTO notifications(user_id, type, message, related_id, fingerprint) VALUES (7, 'reorder', 'Existing alert', 1, 'reorder-1')"
            )
            connection.commit()
        visible = main.notifications(self.user)
        self.assertFalse(any(item['type'] == 'reorder' for item in visible))
        with closing(self.get_connection()) as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM notifications WHERE type = 'reorder'").fetchone()[0], 1)

    def test_enabled_reorder_alert_has_stock_expiry_and_quantity(self):
        visible = main.notifications(self.user)
        reorder = next(item for item in visible if item['type'] == 'reorder')
        self.assertEqual(reorder['current_stock'], 5)
        self.assertEqual(reorder['suggested_order_quantity'], 5)
        self.assertEqual(reorder['expiry_date'], '2999-10-07')
        self.assertEqual(reorder['expiry_quantity'], 2)
        self.assertIn('Suggested reorder: 5 units', reorder['message'])

    def test_festival_insights_use_calendar_inventory_and_safe_fallback(self):
        today = datetime(2026, 10, 18, tzinfo=timezone.utc).date()
        with closing(self.get_connection()) as connection:
            connection.execute('INSERT INTO user_preferences(user_id, auto_reorder_alerts, ai_suggestions, region) VALUES (7, 1, 1, ?)', ('MH',))
            connection.execute('INSERT INTO products VALUES (2, 7, ?, ?, ?, ?, 5)', ('Mithai box', 'Sweets', 'S1', None))
            connection.execute(
                '''INSERT INTO product_batches(
                    id, user_id, product_id, batch_number, expiry_date, purchase_price,
                    selling_price, quantity_received, quantity_remaining
                ) VALUES (3, 7, 2, 'MITHAI', '2026-11-20', 80, 120, 4, 4)'''
            )
            connection.commit()
        expected_diwali = next(
            item for item in main.upcoming_festivals(today, 'MH') if item['name'] == 'Diwali'
        )
        with patch('backend.main.india_today', return_value=today), patch(
            'backend.main.get_ai_suggestion',
            return_value=None,
        ):
            result = main.get_festival_insights(self.user)
        diwali = next(item for item in result['festivals'] if item['name'] == 'Diwali')
        mithai = next(product for product in diwali['products'] if product['id'] == 2)
        self.assertEqual(diwali['date'], expected_diwali['date'])
        self.assertEqual(mithai['current_stock'], 4)
        self.assertFalse(mithai['sales_history_sufficient'])
        self.assertIsNone(mithai['estimated_demand_units'])
        self.assertEqual(mithai['quantity_expiring_in_preparation_window'], 0)
        self.assertFalse(result['ai_assisted'])
        self.assertIn('not enough store-specific sales history', diwali['reason'])

    def test_festival_insights_reapplies_90_day_filter_to_source_results(self):
        today = datetime(2026, 10, 18, tzinfo=timezone.utc).date()
        supplied = [
            {'name': 'Past', 'date': '2026-10-17', 'days_remaining': -1, 'preparation_window_days': 1, 'suggested_categories': [], 'reason': ''},
            {'name': 'Today', 'date': '2026-10-18', 'days_remaining': 0, 'preparation_window_days': 1, 'suggested_categories': [], 'reason': ''},
            {'name': 'Day 90', 'date': '2027-01-16', 'days_remaining': 90, 'preparation_window_days': 1, 'suggested_categories': [], 'reason': ''},
            {'name': 'Day 91', 'date': '2027-01-17', 'days_remaining': 91, 'preparation_window_days': 1, 'suggested_categories': [], 'reason': ''},
        ]
        with patch('backend.main.india_today', return_value=today), patch(
            'backend.main.upcoming_festivals', return_value=supplied
        ), patch('backend.main.get_ai_suggestion', return_value=None):
            result = main.get_festival_insights(self.user)

        self.assertEqual([festival['name'] for festival in result['festivals']], ['Today', 'Day 90'])
        self.assertEqual([festival['days_remaining'] for festival in result['festivals']], [0, 90])

    def test_festival_matching_uses_categories_and_only_eligible_batch_stock(self):
        today = datetime(2026, 10, 18, tzinfo=timezone.utc)
        festivals = [
            {'name': 'Diwali', 'date': '2026-11-10', 'days_remaining': 23, 'preparation_window_days': 30, 'suggested_categories': [], 'reason': 'Diwali.'},
            {'name': 'Holi', 'date': '2026-11-20', 'days_remaining': 33, 'preparation_window_days': 14, 'suggested_categories': [], 'reason': 'Holi.'},
            {'name': 'Christmas', 'date': '2026-12-25', 'days_remaining': 68, 'preparation_window_days': 21, 'suggested_categories': [], 'reason': 'Christmas.'},
            {'name': 'Janmashtami', 'date': '2026-12-01', 'days_remaining': 44, 'preparation_window_days': 14, 'suggested_categories': [], 'reason': 'Janmashtami.'},
        ]
        products = [
            (2, 'Mithai box', 'Sweets'),
            (3, 'Seasonal beverage', 'Snacks, Drinks & Biscuits'),
            (4, 'Holi Colours', 'Electronics & Accessories'),
            (5, 'Chocolate gift', 'Chocolates'),
            (6, 'Christmas cake', 'Dairy & Bakery'),
            (7, 'Butter', 'Fresh Items'),
            (8, 'Decorative sweets', 'Electronics & Accessories'),
            (9, 'Past-use sweets', 'Sweets'),
            (10, 'Agarbatti', 'Household & Lifestyle'),
            (11, 'Comb', 'Beauty & Wellness'),
            (12, 'Christmas gift hamper', 'Household & Lifestyle'),
            (13, 'Festive Makeup Kit', 'Beauty & Wellness'),
            (14, 'Rasgulla', 'Fresh Items'),
        ]
        with closing(self.get_connection()) as connection:
            connection.executemany(
                'INSERT INTO products VALUES (?, 7, ?, ?, ?, ?, 5)',
                [(product_id, name, category, f'SKU-{product_id}', None) for product_id, name, category in products],
            )
            batches = [
                (3, 2, 'MITHAI-1', '2026-11-20', 4),
                (4, 2, 'MITHAI-2', '2026-12-01', 6),
                (5, 3, 'HOLI-DRINK', '2027-04-01', 7),
                (6, 4, 'UNRELATED-HOLI', '2027-04-01', 8),
                (7, 5, 'CHOCOLATE', '2027-01-15', 5),
                (8, 6, 'CAKE', '2027-01-15', 3),
                (9, 7, 'BUTTER', '2027-09-01', 9),
                (10, 8, 'MISLEADING-NAME', '2026-11-20', 12),
                (11, 2, 'ALREADY-EXPIRED', '2026-10-17', 20),
                (12, 2, 'ZERO-STOCK', '2026-12-01', 0),
                (13, 2, 'DISCARDED', '2026-12-01', 30),
                (14, 2, 'EXPIRES-BEFORE-FESTIVAL', '2026-11-09', 11),
                (15, 9, 'ONLY-OLD-STOCK', '2026-11-09', 2),
                (16, 10, 'PUJA-INCENSE', '2027-09-01', 4),
                (17, 11, 'ORDINARY-COMB', '2027-09-01', 5),
                (18, 12, 'GIFT-HAMPER', '2027-01-15', 6),
                (19, 13, 'MAKEUP-KIT', '2026-11-20', 2),
                (20, 14, 'FRESH-MITHAI', '2026-12-01', 3),
            ]
            connection.executemany(
                '''INSERT INTO product_batches(
                    id, user_id, product_id, batch_number, expiry_date, purchase_price,
                    selling_price, quantity_received, quantity_remaining
                ) VALUES (?, 7, ?, ?, ?, 1, 2, ?, ?)''',
                [(batch_id, product_id, number, expiry, quantity, quantity) for batch_id, product_id, number, expiry, quantity in batches],
            )
            connection.execute(
                "INSERT INTO inventory_adjustments(user_id, product_id, batch_id, quantity, reason) VALUES (7, 2, 13, 30, 'Damaged')"
            )
            connection.commit()

        with patch('backend.main.india_today', return_value=today.date()), patch(
            'backend.main.upcoming_festivals', return_value=festivals
        ), patch(
            'backend.main.get_ai_suggestion', return_value=None
        ):
            result = main.get_festival_insights(self.user)

        by_name = {festival['name']: festival for festival in result['festivals']}
        diwali = {product['id']: product for product in by_name['Diwali']['products']}
        holi = {product['id']: product for product in by_name['Holi']['products']}
        christmas = {product['id']: product for product in by_name['Christmas']['products']}
        janmashtami = {product['id']: product for product in by_name['Janmashtami']['products']}

        self.assertEqual(diwali[2]['current_stock'], 10)
        self.assertEqual(diwali[2]['quantity_expiring_in_preparation_window'], 11)
        self.assertEqual(diwali[2]['suggested_reorder_quantity'], 0)
        self.assertEqual(diwali[9]['current_stock'], 0)
        self.assertNotIn(4, holi)
        self.assertNotIn(8, diwali)
        self.assertNotIn(11, diwali)
        self.assertNotIn(10, christmas)
        self.assertIn(10, diwali)
        self.assertIn(10, janmashtami)
        self.assertIn(12, christmas)
        self.assertIn(13, diwali)
        self.assertEqual(diwali[14]['current_stock'], 3)
        self.assertEqual(holi[3]['current_stock'], 7)
        self.assertEqual(set(christmas), {3, 5, 6, 12})
        self.assertEqual(janmashtami[7]['current_stock'], 9)
        self.assertEqual(diwali[2]['current_stock'], 4 + 6)

        stockless_sweets = next(product for product in by_name['Diwali']['products'] if product['id'] == 2)
        self.assertFalse(stockless_sweets['sales_history_sufficient'])
        self.assertIsNone(stockless_sweets['estimated_demand_units'])

    def test_region_preference_round_trips(self):
        result = main.update_preferences(
            main.PreferencesRequest(auto_reorder_alerts=False, ai_suggestions=True, region='MH'),
            self.user,
        )
        self.assertEqual(result['region'], 'MH')
        saved = main.get_preferences(self.user)
        self.assertEqual(saved['region'], 'MH')
        self.assertFalse(saved['auto_reorder_alerts'])
        self.assertTrue(saved['ai_suggestions'])


if __name__ == '__main__':
    unittest.main()

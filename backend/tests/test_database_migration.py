import sqlite3
import unittest

from backend.database import _create_schema


class InventoryAdjustmentMigrationTests(unittest.TestCase):
    def test_existing_preferences_and_inventory_survive_schema_upgrade(self):
        connection = sqlite3.connect(':memory:')
        connection.row_factory = sqlite3.Row
        connection.execute('''CREATE TABLE user_preferences (
            user_id INTEGER PRIMARY KEY,
            auto_reorder_alerts INTEGER NOT NULL DEFAULT 1,
            ai_suggestions INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )''')
        connection.execute('INSERT INTO user_preferences(user_id, auto_reorder_alerts, ai_suggestions) VALUES (11, 0, 1)')
        _create_schema(connection)
        connection.execute('''INSERT INTO users(id, email, password_hash, name)
            VALUES (11, 'migration@example.invalid', 'hash', 'Migration Test')''')
        connection.execute('''INSERT INTO products(id, user_id, name, low_stock_threshold)
            VALUES (14, 11, 'Existing product', 5)''')
        connection.execute('''INSERT INTO product_batches(
            id, user_id, product_id, batch_number, purchase_price, selling_price,
            quantity_received, quantity_remaining
        ) VALUES (17, 11, 14, 'EXISTING', 3, 5, 7, 6)''')
        connection.commit()

        _create_schema(connection)

        preference = connection.execute('SELECT * FROM user_preferences WHERE user_id = 11').fetchone()
        batch = connection.execute('SELECT quantity_remaining FROM product_batches WHERE id = 17').fetchone()
        adjustment_columns = {
            row['name'] for row in connection.execute('PRAGMA table_info(inventory_adjustments)')
        }
        self.assertIn('region', preference.keys())
        self.assertEqual((preference['auto_reorder_alerts'], preference['ai_suggestions']), (0, 1))
        self.assertEqual(batch['quantity_remaining'], 6)
        self.assertTrue({'quantity', 'reason', 'note', 'adjusted_at'} <= adjustment_columns)
        connection.close()


if __name__ == '__main__':
    unittest.main()

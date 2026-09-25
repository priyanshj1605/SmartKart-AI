import sqlite3
from pathlib import Path

from .security import hash_password

DB_PATH = Path(__file__).resolve().parent / 'smartkart.db'


def get_connection():
    connection = sqlite3.connect(DB_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys = ON')
    return connection


def _columns(connection, table):
    return {row['name'] for row in connection.execute(f'PRAGMA table_info({table})').fetchall()}


def _create_schema(connection):
    connection.executescript('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT,
        sku TEXT,
        barcode TEXT,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, sku)
    );
    CREATE TABLE IF NOT EXISTS product_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        batch_number TEXT NOT NULL,
        supplier TEXT,
        manufacture_date TEXT,
        expiry_date TEXT,
        purchase_price REAL NOT NULL CHECK(purchase_price >= 0),
        selling_price REAL NOT NULL CHECK(selling_price >= 0),
        quantity_received INTEGER NOT NULL CHECK(quantity_received >= 0),
        quantity_remaining INTEGER NOT NULL CHECK(quantity_remaining >= 0),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id, batch_number)
    );
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        mobile TEXT,
        address TEXT,
        email TEXT,
        visit_count INTEGER NOT NULL DEFAULT 0,
        last_purchase TEXT,
        total_purchase REAL NOT NULL DEFAULT 0,
        total_invoices INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, mobile)
    );
    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        invoice_number TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL NOT NULL DEFAULT 0,
        tax REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        purchase_cost REAL NOT NULL,
        profit REAL NOT NULL,
        payment_status TEXT NOT NULL CHECK(payment_status IN ('Paid', 'Pending')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, invoice_number)
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        batch_id INTEGER NOT NULL REFERENCES product_batches(id),
        product_name TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        selling_price REAL NOT NULL,
        purchase_price REAL NOT NULL,
        amount REAL NOT NULL,
        cost REAL NOT NULL,
        profit REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        batch_id INTEGER NOT NULL REFERENCES product_batches(id),
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        revenue REAL NOT NULL,
        cost REAL NOT NULL,
        profit REAL NOT NULL,
        sold_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        related_id INTEGER,
        is_read INTEGER NOT NULL DEFAULT 0,
        fingerprint TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, fingerprint)
    );
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
    );
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        auto_reorder_alerts INTEGER NOT NULL DEFAULT 1,
        ai_suggestions INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
    CREATE INDEX IF NOT EXISTS idx_batches_product_expiry ON product_batches(product_id, expiry_date);
    CREATE INDEX IF NOT EXISTS idx_customers_user_mobile ON customers(user_id, mobile);
    CREATE INDEX IF NOT EXISTS idx_invoices_user_date ON invoices(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_user_date ON sales(user_id, sold_at);
    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
    ''')


def _deduplicate_categories(connection):
    connection.execute('''DELETE FROM categories
        WHERE id NOT IN (
            SELECT MIN(id) FROM categories GROUP BY user_id, lower(trim(name))
        )''')
    connection.execute('UPDATE categories SET name = trim(name)')


def _migrate_users(connection):
    if 'password_hash' in _columns(connection, 'users'):
        return
    connection.execute('ALTER TABLE users RENAME TO users_legacy')
    connection.execute('''CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )''')
    for row in connection.execute('SELECT id, email, password, name FROM users_legacy').fetchall():
        connection.execute('INSERT INTO users(id, email, password_hash, name) VALUES (?, ?, ?, ?)', (row['id'], row['email'], hash_password(row['password']), row['name'] or row['email'].split('@')[0]))
    connection.execute('DROP TABLE users_legacy')


def _migrate_legacy_products(connection, admin_id):
    if 'user_id' in _columns(connection, 'products'):
        return
    connection.execute('''CREATE TABLE IF NOT EXISTS product_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        batch_number TEXT NOT NULL,
        supplier TEXT,
        manufacture_date TEXT,
        expiry_date TEXT,
        purchase_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        quantity_received INTEGER NOT NULL,
        quantity_remaining INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )''')
    connection.execute('ALTER TABLE products RENAME TO products_legacy')
    connection.execute('''CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        sku TEXT,
        barcode TEXT,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, sku)
    )''')
    for row in connection.execute('SELECT id, name, price, stock FROM products_legacy').fetchall():
        sku = f'LEGACY-{row["id"]}'
        connection.execute('INSERT INTO products(id, user_id, name, sku, low_stock_threshold) VALUES (?, ?, ?, ?, ?)', (row['id'], admin_id, row['name'], sku, 5))
        connection.execute('INSERT INTO product_batches(user_id, product_id, batch_number, purchase_price, selling_price, quantity_received, quantity_remaining) VALUES (?, ?, ?, ?, ?, ?, ?)', (admin_id, row['id'], sku, row['price'], row['price'], row['stock'], row['stock']))
    connection.execute('DROP TABLE products_legacy')


def _remove_legacy_tables(connection):
    for table in ('customers', 'sales', 'invoices'):
        if 'user_id' not in _columns(connection, table):
            connection.execute(f'ALTER TABLE {table} RENAME TO {table}_legacy')


def _import_legacy_records(connection, admin_id):
    legacy_customers = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'customers_legacy'").fetchone()
    if legacy_customers:
        for row in connection.execute('SELECT name, email, tier FROM customers_legacy').fetchall():
            connection.execute('INSERT OR IGNORE INTO customers(user_id, name, email) VALUES (?, ?, ?)', (admin_id, row['name'], row['email']))

    if not connection.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'invoices_legacy'").fetchone():
        return

    for row in connection.execute('SELECT invoice_number, total, status FROM invoices_legacy').fetchall():
        existing = connection.execute('SELECT id FROM invoices WHERE user_id = ? AND invoice_number = ?', (admin_id, row['invoice_number'])).fetchone()
        if existing:
            continue
        legacy_sale = connection.execute('SELECT customer_name, item, amount FROM sales_legacy WHERE amount = ? ORDER BY id LIMIT 1', (row['total'],)).fetchone()
        customer_id = None
        product = None
        if legacy_sale:
            customer = connection.execute('SELECT id FROM customers WHERE user_id = ? AND name = ?', (admin_id, legacy_sale['customer_name'])).fetchone()
            customer_id = customer['id'] if customer else None
            product = connection.execute('SELECT p.id, p.name, b.id batch_id, b.batch_number, b.selling_price, b.purchase_price FROM products p JOIN product_batches b ON b.product_id = p.id WHERE p.user_id = ? AND p.name LIKE ? ORDER BY p.id LIMIT 1', (admin_id, f"%{legacy_sale['item']}%")).fetchone()
        total = float(row['total'] or 0)
        status = row['status'] if row['status'] in ('Paid', 'Pending') else 'Paid'
        invoice_cursor = connection.execute('INSERT INTO invoices(user_id, customer_id, invoice_number, subtotal, total, purchase_cost, profit, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (admin_id, customer_id, row['invoice_number'], total, total, total, 0, status))
        if product:
            connection.execute('INSERT INTO invoice_items(invoice_id, product_id, batch_id, product_name, batch_number, quantity, selling_price, purchase_price, amount, cost, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (invoice_cursor.lastrowid, product['id'], product['batch_id'], product['name'], product['batch_number'], 1, product['selling_price'], product['purchase_price'], total, product['purchase_price'], total - product['purchase_price']))
            connection.execute('INSERT INTO sales(user_id, invoice_id, product_id, batch_id, customer_id, quantity, revenue, cost, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', (admin_id, invoice_cursor.lastrowid, product['id'], product['batch_id'], customer_id, 1, total, product['purchase_price'], total - product['purchase_price']))


def init_db():
    connection = get_connection()
    try:
        _migrate_users(connection)
        admin = connection.execute('SELECT id FROM users ORDER BY id LIMIT 1').fetchone()
        if not admin:
            connection.execute('INSERT INTO users(email, password_hash, name) VALUES (?, ?, ?)', ('admin@example.com', hash_password('123456'), 'Ava Singh'))
            admin = connection.execute('SELECT id FROM users WHERE email = ?', ('admin@example.com',)).fetchone()
        _migrate_legacy_products(connection, admin['id'])
        _remove_legacy_tables(connection)
        _create_schema(connection)
        _deduplicate_categories(connection)
        connection.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name_ci ON categories(user_id, lower(name))')
        connection.execute('INSERT OR IGNORE INTO categories(user_id, name) SELECT user_id, category FROM products WHERE category IS NOT NULL AND trim(category) <> ""')
        _import_legacy_records(connection, admin['id'])
        connection.commit()
    finally:
        connection.close()


init_db()

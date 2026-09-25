from datetime import datetime, timedelta
from threading import Lock
import hashlib
import math
import os
import secrets
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.database import get_connection
from backend.security import create_token, decode_token, hash_password, verify_password

app = FastAPI(title='SmartKart AI API', version='2.0.0')
notification_lock = Lock()
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r'https?://(localhost|127\.0\.0\.1)(:\d+)?',
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def now_local():
    return datetime.now().astimezone()


class Credentials(BaseModel):
    email: str
    password: str


class RegisterRequest(Credentials):
    name: str = Field(min_length=1, max_length=120)


class ProductRequest(BaseModel):
    name: str = Field(min_length=1)
    category: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    supplier: Optional[str] = None
    manufacture_date: Optional[str] = None
    expiry_date: Optional[str] = None
    purchase_price: float = Field(ge=0)
    selling_price: float = Field(ge=0)
    quantity: int = Field(gt=0)
    low_stock_threshold: int = Field(default=5, ge=0)
    batch_number: Optional[str] = None


class BatchRequest(BaseModel):
    supplier: Optional[str] = None
    manufacture_date: Optional[str] = None
    expiry_date: Optional[str] = None
    purchase_price: float = Field(ge=0)
    selling_price: float = Field(ge=0)
    quantity: int = Field(gt=0)
    batch_number: Optional[str] = None


class CustomerRequest(BaseModel):
    name: str = Field(min_length=1)
    mobile: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None


class InvoiceItemRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class InvoiceRequest(BaseModel):
    customer_id: Optional[int] = None
    customer: CustomerRequest
    items: list[InvoiceItemRequest] = Field(min_length=1)
    discount: float = Field(default=0, ge=0)
    tax: float = Field(default=0, ge=0)
    payment_status: str = 'Paid'


class PaymentRequest(BaseModel):
    payment_status: str


class CategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20)
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)


class PreferencesRequest(BaseModel):
    auto_reorder_alerts: bool
    ai_suggestions: bool


def current_user(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    user_id = decode_token(authorization.split(' ', 1)[1])
    if not user_id:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    connection = get_connection()
    user = connection.execute('SELECT id, email, name FROM users WHERE id = ?', (user_id,)).fetchone()
    connection.close()
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user


def _date_valid(manufacture_date, expiry_date):
    if manufacture_date and expiry_date and expiry_date <= manufacture_date:
        raise HTTPException(status_code=400, detail='Expiry date must be after manufacture date')


def _product_row(connection, user_id, product_id):
    row = connection.execute('SELECT * FROM products WHERE id = ? AND user_id = ?', (product_id, user_id)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='Product not found')
    return row


def _product_json(connection, user_id, row):
    batches = connection.execute('SELECT * FROM product_batches WHERE product_id = ? AND user_id = ? ORDER BY expiry_date IS NULL, expiry_date, id', (row['id'], user_id)).fetchall()
    today = now_local().date()
    available_batches = [batch for batch in batches if not batch['expiry_date'] or datetime.fromisoformat(batch['expiry_date']).date() > today]
    stock = sum(batch['quantity_remaining'] for batch in available_batches)
    serialized_batches = []
    for batch in batches:
        expired = bool(batch['expiry_date'] and datetime.fromisoformat(batch['expiry_date']).date() <= today)
        serialized_batches.append({**dict(batch), 'status': 'Expired' if expired else ('Out of Stock' if batch['quantity_remaining'] == 0 else 'Healthy')})
    return {
        'id': row['id'], 'name': row['name'], 'category': row['category'], 'sku': row['sku'], 'barcode': row['barcode'],
        'low_stock_threshold': row['low_stock_threshold'], 'stock': stock,
        'status': 'Out of Stock' if stock == 0 else ('Low Stock' if stock <= row['low_stock_threshold'] else 'Healthy'),
        'batches': serialized_batches,
    }


def _auto_reorder_enabled(connection, user_id):
    row = connection.execute('SELECT auto_reorder_alerts FROM user_preferences WHERE user_id = ?', (user_id,)).fetchone()
    return bool(row['auto_reorder_alerts']) if row else True


def _suggest_reorder_quantity(connection, user_id, product_id, current_stock, low_stock_threshold):
    sales = connection.execute('SELECT COALESCE(SUM(quantity), 0) quantity FROM sales WHERE user_id = ? AND product_id = ? AND sold_at >= datetime("now", "-30 days")', (user_id, product_id)).fetchone()['quantity']
    avg_daily_sales = sales / 30
    target_stock = max(low_stock_threshold, math.ceil((avg_daily_sales * 7) + low_stock_threshold))
    suggested = max(target_stock - current_stock, low_stock_threshold)
    return int(suggested if suggested > 0 else max(low_stock_threshold, 1))


def _notify_inventory_unlocked(connection, user_id):
    reorder_enabled = _auto_reorder_enabled(connection, user_id)
    rows = connection.execute('''SELECT p.id product_id, p.name, p.category, p.low_stock_threshold, b.id batch_id, b.batch_number, b.quantity_remaining, b.expiry_date, b.supplier, b.purchase_price
        FROM products p JOIN product_batches b ON b.product_id = p.id WHERE p.user_id = ? AND b.user_id = ? AND b.quantity_remaining > 0''', (user_id, user_id)).fetchall()
    today = now_local().date()
    seen_reorder = set()
    for row in rows:
        product_stock = connection.execute('SELECT COALESCE(SUM(quantity_remaining), 0) stock FROM product_batches WHERE user_id = ? AND product_id = ?', (user_id, row['product_id'])).fetchone()['stock']
        if reorder_enabled and product_stock <= row['low_stock_threshold'] and row['product_id'] not in seen_reorder:
            seen_reorder.add(row['product_id'])
            message = f"{row['name']} is below the reorder threshold. Stock: {product_stock} / Suggested reorder: {_suggest_reorder_quantity(connection, user_id, row['product_id'], product_stock, row['low_stock_threshold'])} units."
            connection.execute('INSERT OR IGNORE INTO notifications(user_id, type, message, related_id, fingerprint) VALUES (?, ?, ?, ?, ?)', (user_id, 'reorder', message, row['product_id'], f"reorder-{row['product_id']}"))
            connection.execute('UPDATE notifications SET message = ?, is_read = 0 WHERE user_id = ? AND fingerprint = ?', (message, user_id, f"reorder-{row['product_id']}"))
        if row['expiry_date']:
            try:
                days = (datetime.fromisoformat(row['expiry_date']).date() - today).days
            except ValueError:
                days = None
            if days is not None and 0 < days <= 30:
                fingerprint = f"expiry-{row['batch_id']}-{row['expiry_date']}"
                message = f"{row['name']} batch {row['batch_number']} will expire in {days} days."
                connection.execute('INSERT OR IGNORE INTO notifications(user_id, type, message, related_id, fingerprint) VALUES (?, ?, ?, ?, ?)', (user_id, 'expiry', message, row['batch_id'], fingerprint))
                connection.execute('UPDATE notifications SET message = ? WHERE user_id = ? AND fingerprint = ?', (message, user_id, fingerprint))
            elif days is not None and days <= 0:
                fingerprint = f"expired-{row['batch_id']}-{row['expiry_date']}"
                message = f"{row['name']} batch {row['batch_number']} has expired."
                connection.execute('INSERT OR IGNORE INTO notifications(user_id, type, message, related_id, fingerprint) VALUES (?, ?, ?, ?, ?)', (user_id, 'expired', message, row['batch_id'], fingerprint))
                connection.execute('UPDATE notifications SET message = ? WHERE user_id = ? AND fingerprint = ?', (message, user_id, fingerprint))
    pending = connection.execute("SELECT id, invoice_number, total FROM invoices WHERE user_id = ? AND payment_status = 'Pending'", (user_id,)).fetchall()
    for invoice in pending:
        connection.execute('INSERT OR IGNORE INTO notifications(user_id, type, message, related_id, fingerprint) VALUES (?, ?, ?, ?, ?)', (user_id, 'pending_payment', f"Invoice {invoice['invoice_number']} is pending payment.", invoice['id'], f"pending-{invoice['id']}"))


def _notify_inventory(connection, user_id):
    with notification_lock:
        _notify_inventory_unlocked(connection, user_id)


@app.get('/products/reorder')
def get_reorder_products(user=Depends(current_user), product_id: Optional[int] = Query(default=None)):
    connection = get_connection()
    try:
        query = '''SELECT p.id, p.name, p.category, p.low_stock_threshold, COALESCE(SUM(b.quantity_remaining), 0) stock,
            MAX(CASE WHEN b.supplier IS NOT NULL AND trim(b.supplier) <> '' THEN b.supplier END) supplier,
            MAX(b.purchase_price) purchase_price
            FROM products p LEFT JOIN product_batches b ON b.product_id = p.id AND b.user_id = p.user_id
            WHERE p.user_id = ?
            GROUP BY p.id, p.name, p.category, p.low_stock_threshold'''
        params = [user['id']]
        if product_id is not None:
            query += ' HAVING p.id = ?'
            params.append(product_id)
        rows = connection.execute(query, params).fetchall()
        result = []
        for row in rows:
            current_stock = int(row['stock'])
            if current_stock > row['low_stock_threshold']:
                continue
            suggested = _suggest_reorder_quantity(connection, user['id'], row['id'], current_stock, row['low_stock_threshold'])
            result.append({
                'id': row['id'],
                'name': row['name'],
                'category': row['category'],
                'current_stock': current_stock,
                'low_stock_threshold': row['low_stock_threshold'],
                'supplier': row['supplier'],
                'purchase_price': row['purchase_price'],
                'suggested_order_quantity': suggested,
                'recommended_order_quantity': suggested,
            })
        if product_id is not None:
            return result[:1]
        return result
    finally:
        connection.close()


@app.get('/')
def read_root():
    return {'message': 'SmartKart AI backend is running'}


@app.post('/register')
def register(payload: RegisterRequest):
    connection = get_connection()
    try:
        cursor = connection.execute('INSERT INTO users(email, password_hash, name) VALUES (?, ?, ?)', (payload.email.strip().lower(), hash_password(payload.password), payload.name.strip()))
        connection.commit()
        user_id = cursor.lastrowid
        return {'message': 'Account created successfully. Please sign in to continue.'}
    except Exception as error:
        connection.rollback()
        if 'UNIQUE' in str(error).upper():
            raise HTTPException(status_code=400, detail='Email already registered')
        raise HTTPException(status_code=500, detail='Registration failed')
    finally:
        connection.close()


@app.post('/login')
def login(payload: Credentials):
    connection = get_connection()
    user = connection.execute('SELECT id, email, name, password_hash FROM users WHERE email = ?', (payload.email.strip().lower(),)).fetchone()
    connection.close()
    if not user or not verify_password(payload.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid email or password.')
    return {'token': create_token(user['id']), 'user': {'id': user['id'], 'email': user['email'], 'name': user['name']}}


@app.get('/categories')
def get_categories(user=Depends(current_user)):
    connection = get_connection()
    rows = connection.execute('SELECT id, name, created_at FROM categories WHERE user_id = ? ORDER BY lower(name)', (user['id'],)).fetchall()
    connection.close()
    return [dict(row) for row in rows]


@app.post('/categories')
def create_category(payload: CategoryRequest, user=Depends(current_user)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail='Category name is required')
    connection = get_connection()
    try:
        cursor = connection.execute('INSERT INTO categories(user_id, name) VALUES (?, ?)', (user['id'], name))
        connection.commit()
        return dict(connection.execute('SELECT id, name, created_at FROM categories WHERE id = ?', (cursor.lastrowid,)).fetchone())
    except Exception as error:
        connection.rollback()
        if 'UNIQUE' in str(error).upper():
            raise HTTPException(status_code=409, detail='Category already exists.')
        raise HTTPException(status_code=500, detail='Unable to create category.')
    finally:
        connection.close()


def _token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


@app.post('/password/forgot')
def forgot_password(payload: ForgotPasswordRequest):
    connection = get_connection()
    user = connection.execute('SELECT id FROM users WHERE email = ?', (payload.email.strip().lower(),)).fetchone()
    if not user:
        connection.close()
        return {'message': 'If an account exists, reset instructions are ready.'}
    connection.execute('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL', (user['id'],))
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now().astimezone() + timedelta(minutes=15)).isoformat()
    connection.execute('INSERT INTO password_reset_tokens(user_id, token_hash, expires_at) VALUES (?, ?, ?)', (user['id'], _token_hash(token), expires_at))
    connection.commit()
    connection.close()
    response = {'message': 'Reset instructions generated for development.'}
    if os.getenv('SMARTKART_DEV_RESET_CODES', 'true').lower() in {'1', 'true', 'yes'}:
        response['development_code'] = token
    else:
        response['message'] = 'If an account exists, reset instructions are ready.'
    return response


@app.post('/password/change-token')
def create_change_password_token(user=Depends(current_user)):
    connection = get_connection()
    connection.execute('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL', (user['id'],))
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now().astimezone() + timedelta(minutes=15)).isoformat()
    connection.execute('INSERT INTO password_reset_tokens(user_id, token_hash, expires_at) VALUES (?, ?, ?)', (user['id'], _token_hash(token), expires_at))
    connection.commit()
    connection.close()
    return {'token': token}


@app.post('/password/reset')
def reset_password(payload: ResetPasswordRequest):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail='Passwords do not match.')
    connection = get_connection()
    token_row = connection.execute('SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?', (_token_hash(payload.token), datetime.now().astimezone().isoformat())).fetchone()
    if not token_row:
        connection.close()
        raise HTTPException(status_code=400, detail='Reset code is invalid or expired.')
    connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', (hash_password(payload.password), token_row['user_id']))
    connection.execute('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?', (token_row['id'],))
    connection.commit()
    connection.close()
    return {'message': 'Password updated successfully. Please sign in.'}


@app.post('/password/change')
def change_password(payload: ChangePasswordRequest, user=Depends(current_user)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail='Passwords do not match.')
    connection = get_connection()
    stored = connection.execute('SELECT password_hash FROM users WHERE id = ?', (user['id'],)).fetchone()
    if not stored or not verify_password(payload.current_password, stored['password_hash']):
        connection.close()
        raise HTTPException(status_code=400, detail='Current password is incorrect.')
    connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', (hash_password(payload.new_password), user['id']))
    connection.commit()
    connection.close()
    return {'message': 'Password updated successfully.'}


@app.get('/preferences')
def get_preferences(user=Depends(current_user)):
    connection = get_connection()
    connection.execute('INSERT OR IGNORE INTO user_preferences(user_id) VALUES (?)', (user['id'],))
    connection.commit()
    row = connection.execute('SELECT auto_reorder_alerts, ai_suggestions FROM user_preferences WHERE user_id = ?', (user['id'],)).fetchone()
    connection.close()
    return {'auto_reorder_alerts': bool(row['auto_reorder_alerts']), 'ai_suggestions': bool(row['ai_suggestions'])}


@app.put('/preferences')
def update_preferences(payload: PreferencesRequest, user=Depends(current_user)):
    connection = get_connection()
    connection.execute('''INSERT INTO user_preferences(user_id, auto_reorder_alerts, ai_suggestions)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET auto_reorder_alerts = excluded.auto_reorder_alerts,
        ai_suggestions = excluded.ai_suggestions, updated_at = CURRENT_TIMESTAMP''', (user['id'], int(payload.auto_reorder_alerts), int(payload.ai_suggestions)))
    connection.commit()
    connection.close()
    return {'auto_reorder_alerts': payload.auto_reorder_alerts, 'ai_suggestions': payload.ai_suggestions}


@app.get('/products')
def get_products(user=Depends(current_user), search: Optional[str] = Query(default=None)):
    connection = get_connection()
    query = 'SELECT * FROM products WHERE user_id = ?'
    params = [user['id']]
    if search:
        query += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)'
        term = f'%{search}%'
        params.extend([term, term, term])
    rows = connection.execute(query + ' ORDER BY name', params).fetchall()
    result = [_product_json(connection, user['id'], row) for row in rows]
    connection.close()
    return result


@app.post('/products')
def create_product(payload: ProductRequest, user=Depends(current_user)):
    _date_valid(payload.manufacture_date, payload.expiry_date)
    connection = get_connection()
    try:
        existing = None
        if payload.sku:
            existing = connection.execute('SELECT * FROM products WHERE user_id = ? AND sku = ?', (user['id'], payload.sku)).fetchone()
        if not existing:
            existing = connection.execute('SELECT * FROM products WHERE user_id = ? AND lower(name) = lower(?)', (user['id'], payload.name.strip())).fetchone()
        if existing:
            product_id = existing['id']
            connection.execute('UPDATE products SET category = ?, barcode = ?, low_stock_threshold = ? WHERE id = ? AND user_id = ?', (payload.category, payload.barcode, payload.low_stock_threshold, product_id, user['id']))
        else:
            cursor = connection.execute('INSERT INTO products(user_id, name, category, sku, barcode, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?)', (user['id'], payload.name.strip(), payload.category, payload.sku, payload.barcode, payload.low_stock_threshold))
            product_id = cursor.lastrowid
        if payload.category and payload.category.strip():
            connection.execute('INSERT OR IGNORE INTO categories(user_id, name) VALUES (?, ?)', (user['id'], payload.category.strip()))
        batch_number = payload.batch_number or f'BATCH-{now_local().strftime("%Y%m%d%H%M%S%f")}'
        connection.execute('INSERT INTO product_batches(user_id, product_id, batch_number, supplier, manufacture_date, expiry_date, purchase_price, selling_price, quantity_received, quantity_remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (user['id'], product_id, batch_number, payload.supplier, payload.manufacture_date, payload.expiry_date, payload.purchase_price, payload.selling_price, payload.quantity, payload.quantity))
        connection.commit()
        row = _product_row(connection, user['id'], product_id)
        return _product_json(connection, user['id'], row)
    except HTTPException:
        connection.rollback()
        raise
    except Exception as error:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f'Unable to add product: {error}')
    finally:
        connection.close()


@app.post('/products/{product_id}/batches')
def add_batch(product_id: int, payload: BatchRequest, user=Depends(current_user)):
    _date_valid(payload.manufacture_date, payload.expiry_date)
    connection = get_connection()
    try:
        _product_row(connection, user['id'], product_id)
        batch_number = payload.batch_number or f'BATCH-{now_local().strftime("%Y%m%d%H%M%S%f")}'
        connection.execute('INSERT INTO product_batches(user_id, product_id, batch_number, supplier, manufacture_date, expiry_date, purchase_price, selling_price, quantity_received, quantity_remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (user['id'], product_id, batch_number, payload.supplier, payload.manufacture_date, payload.expiry_date, payload.purchase_price, payload.selling_price, payload.quantity, payload.quantity))
        connection.commit()
        return _product_json(connection, user['id'], _product_row(connection, user['id'], product_id))
    except HTTPException:
        connection.rollback()
        raise
    except Exception as error:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f'Unable to add stock: {error}')
    finally:
        connection.close()


@app.put('/products/{product_id}')
def update_product(product_id: int, payload: ProductRequest, user=Depends(current_user)):
    connection = get_connection()
    _product_row(connection, user['id'], product_id)
    connection.execute('UPDATE products SET name = ?, category = ?, sku = ?, barcode = ?, low_stock_threshold = ? WHERE id = ? AND user_id = ?', (payload.name, payload.category, payload.sku, payload.barcode, payload.low_stock_threshold, product_id, user['id']))
    connection.commit()
    result = _product_json(connection, user['id'], _product_row(connection, user['id'], product_id))
    connection.close()
    return result


@app.delete('/products/{product_id}')
def delete_product(product_id: int, user=Depends(current_user)):
    connection = get_connection()
    _product_row(connection, user['id'], product_id)
    used = connection.execute('SELECT 1 FROM invoice_items WHERE product_id = ? LIMIT 1', (product_id,)).fetchone()
    if used:
        connection.close()
        raise HTTPException(status_code=400, detail='Products used in invoices cannot be deleted')
    connection.execute('DELETE FROM products WHERE id = ? AND user_id = ?', (product_id, user['id']))
    connection.commit()
    connection.close()
    return {'message': 'Product deleted'}


@app.get('/customers')
def get_customers(user=Depends(current_user), search: Optional[str] = Query(default=None)):
    connection = get_connection()
    query = 'SELECT * FROM customers WHERE user_id = ?'
    params = [user['id']]
    if search:
        query += ' AND (name LIKE ? OR mobile LIKE ? OR email LIKE ?)'
        term = f'%{search}%'
        params.extend([term, term, term])
    rows = connection.execute(query + ' ORDER BY name', params).fetchall()
    connection.close()
    return [dict(row) for row in rows]


@app.post('/customers')
def create_customer(payload: CustomerRequest, user=Depends(current_user)):
    connection = get_connection()
    try:
        cursor = connection.execute('INSERT INTO customers(user_id, name, mobile, address, email) VALUES (?, ?, ?, ?, ?)', (user['id'], payload.name, payload.mobile, payload.address, payload.email))
        connection.commit()
        row = connection.execute('SELECT * FROM customers WHERE id = ?', (cursor.lastrowid,)).fetchone()
        return dict(row)
    except Exception as error:
        connection.rollback()
        raise HTTPException(status_code=400, detail='Customer mobile number already exists' if 'UNIQUE' in str(error).upper() else str(error))
    finally:
        connection.close()


@app.put('/customers/{customer_id}')
def update_customer(customer_id: int, payload: CustomerRequest, user=Depends(current_user)):
    connection = get_connection()
    result = connection.execute('UPDATE customers SET name = ?, mobile = ?, address = ?, email = ? WHERE id = ? AND user_id = ?', (payload.name, payload.mobile, payload.address, payload.email, customer_id, user['id']))
    if not result.rowcount:
        connection.close()
        raise HTTPException(status_code=404, detail='Customer not found')
    connection.commit()
    row = connection.execute('SELECT * FROM customers WHERE id = ?', (customer_id,)).fetchone()
    connection.close()
    return dict(row)


@app.delete('/customers/{customer_id}')
def delete_customer(customer_id: int, user=Depends(current_user)):
    connection = get_connection()
    connection.execute('DELETE FROM customers WHERE id = ? AND user_id = ?', (customer_id, user['id']))
    connection.commit()
    connection.close()
    return {'message': 'Customer deleted'}


@app.get('/dashboard/summary')
def dashboard_summary(user=Depends(current_user)):
    connection = get_connection()
    _notify_inventory(connection, user['id'])
    today = now_local().strftime('%Y-%m-%d')
    stats = connection.execute('''SELECT COALESCE(SUM(total), 0) sales, COALESCE(SUM(profit), 0) profit, COUNT(*) invoices,
        COUNT(DISTINCT customer_id) customers
        FROM invoices WHERE user_id = ? AND date(created_at) = ?''', (user['id'], today)).fetchone()
    pending = connection.execute("SELECT COALESCE(SUM(total), 0) amount FROM invoices WHERE user_id = ? AND payment_status = 'Pending'", (user['id'],)).fetchone()['amount']
    products = connection.execute('SELECT COUNT(*) count FROM products WHERE user_id = ?', (user['id'],)).fetchone()['count']
    today_date = now_local().date().isoformat()
    low_stock = connection.execute("SELECT COUNT(*) count FROM (SELECT p.id FROM products p LEFT JOIN product_batches b ON b.product_id = p.id AND b.user_id = p.user_id AND (b.expiry_date IS NULL OR b.expiry_date > ?) WHERE p.user_id = ? GROUP BY p.id HAVING COALESCE(SUM(b.quantity_remaining), 0) <= p.low_stock_threshold)", (today_date, user['id'])).fetchone()['count']
    alert_date = (now_local().date() + timedelta(days=30)).isoformat()
    expiring = connection.execute('SELECT COUNT(*) count FROM product_batches WHERE user_id = ? AND quantity_remaining > 0 AND expiry_date > ? AND expiry_date <= ?', (user['id'], today_date, alert_date)).fetchone()['count']
    connection.commit()
    connection.close()
    return {'sales': stats['sales'], 'profit': stats['profit'], 'products': products, 'low_stock': low_stock, 'invoices': stats['invoices'], 'customers': stats['customers'], 'pending': pending, 'expiring': expiring}


@app.post('/invoices')
def create_invoice(payload: InvoiceRequest, user=Depends(current_user)):
    if payload.payment_status not in ('Paid', 'Pending'):
        raise HTTPException(status_code=400, detail='Payment status must be Paid or Pending')
    connection = get_connection()
    try:
        requested = {}
        for item in payload.items:
            requested[item.product_id] = requested.get(item.product_id, 0) + item.quantity
        allocations = []
        for product_id, quantity in requested.items():
            _product_row(connection, user['id'], product_id)
            batches = connection.execute('SELECT b.*, p.name product_name FROM product_batches b JOIN products p ON p.id = b.product_id WHERE b.product_id = ? AND b.user_id = ? AND b.quantity_remaining > 0 AND (b.expiry_date IS NULL OR b.expiry_date > ?) ORDER BY b.expiry_date IS NULL, b.expiry_date, b.id', (product_id, user['id'], now_local().date().isoformat())).fetchall()
            remaining = quantity
            for batch in batches:
                take = min(remaining, batch['quantity_remaining'])
                if take:
                    allocations.append((batch, take))
                    remaining -= take
                if remaining == 0:
                    break
            if remaining:
                raise HTTPException(status_code=400, detail=f'Insufficient stock for product {product_id}')

        customer = None
        if payload.customer_id:
            customer = connection.execute('SELECT * FROM customers WHERE id = ? AND user_id = ?', (payload.customer_id, user['id'])).fetchone()
        if not customer and payload.customer.mobile:
            customer = connection.execute('SELECT * FROM customers WHERE user_id = ? AND mobile = ?', (user['id'], payload.customer.mobile)).fetchone()
        if customer:
            connection.execute('UPDATE customers SET name = ?, address = ?, email = ? WHERE id = ? AND user_id = ?', (payload.customer.name, payload.customer.address, payload.customer.email, customer['id'], user['id']))
            customer_id = customer['id']
        else:
            cursor = connection.execute('INSERT INTO customers(user_id, name, mobile, address, email) VALUES (?, ?, ?, ?, ?)', (user['id'], payload.customer.name, payload.customer.mobile, payload.customer.address, payload.customer.email))
            customer_id = cursor.lastrowid

        subtotal = sum(batch['selling_price'] * quantity for batch, quantity in allocations)
        purchase_cost = sum(batch['purchase_price'] * quantity for batch, quantity in allocations)
        total = subtotal - payload.discount + payload.tax
        profit = subtotal - purchase_cost - payload.discount
        last_invoice = connection.execute("SELECT MAX(CAST(SUBSTR(invoice_number, 5) AS INTEGER)) number FROM invoices WHERE user_id = ? AND invoice_number LIKE 'INV-%'", (user['id'],)).fetchone()['number'] or 1000
        invoice_number = f'INV-{last_invoice + 1}'
        cursor = connection.execute('INSERT INTO invoices(user_id, customer_id, invoice_number, subtotal, discount, tax, total, purchase_cost, profit, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (user['id'], customer_id, invoice_number, subtotal, payload.discount, payload.tax, total, purchase_cost, profit, payload.payment_status))
        invoice_id = cursor.lastrowid
        for batch, quantity in allocations:
            amount = batch['selling_price'] * quantity
            cost = batch['purchase_price'] * quantity
            connection.execute('UPDATE product_batches SET quantity_remaining = quantity_remaining - ? WHERE id = ? AND user_id = ?', (quantity, batch['id'], user['id']))
            connection.execute('INSERT INTO invoice_items(invoice_id, product_id, batch_id, product_name, batch_number, quantity, selling_price, purchase_price, amount, cost, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (invoice_id, batch['product_id'], batch['id'], batch['product_name'], batch['batch_number'], quantity, batch['selling_price'], batch['purchase_price'], amount, cost, amount - cost))
            connection.execute('INSERT INTO sales(user_id, invoice_id, product_id, batch_id, customer_id, quantity, revenue, cost, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', (user['id'], invoice_id, batch['product_id'], batch['id'], customer_id, quantity, amount, cost, amount - cost))
        now = now_local().isoformat()
        connection.execute('UPDATE customers SET visit_count = visit_count + 1, last_purchase = ?, total_purchase = total_purchase + ?, total_invoices = total_invoices + 1 WHERE id = ? AND user_id = ?', (now, total, customer_id, user['id']))
        connection.commit()
        return get_invoice(invoice_id, user)
    except HTTPException:
        connection.rollback()
        raise
    except Exception as error:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f'Invoice could not be completed: {error}')
    finally:
        connection.close()


def get_invoice(invoice_id, user):
    connection = get_connection()
    row = connection.execute('''SELECT i.*, c.name customer_name, c.mobile, c.address, c.email customer_email FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE i.id = ? AND i.user_id = ?''', (invoice_id, user['id'])).fetchone()
    if not row:
        connection.close()
        raise HTTPException(status_code=404, detail='Invoice not found')
    items = connection.execute('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id', (invoice_id,)).fetchall()
    connection.close()
    return {**dict(row), 'items': [dict(item) for item in items]}


@app.get('/invoices')
def get_invoices(user=Depends(current_user), status: Optional[str] = None, search: Optional[str] = None):
    connection = get_connection()
    query = '''SELECT i.*, c.name customer_name, c.mobile FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE i.user_id = ?'''
    params = [user['id']]
    if status in ('Paid', 'Pending'):
        query += ' AND i.payment_status = ?'
        params.append(status)
    if search:
        query += ' AND (i.invoice_number LIKE ? OR c.name LIKE ? OR c.mobile LIKE ?)'
        term = f'%{search}%'
        params.extend([term, term, term])
    rows = connection.execute(query + ' ORDER BY i.created_at DESC', params).fetchall()
    connection.close()
    return [dict(row) for row in rows]


@app.get('/invoices/{invoice_id}')
def invoice_detail(invoice_id: int, user=Depends(current_user)):
    return get_invoice(invoice_id, user)


@app.patch('/invoices/{invoice_id}/payment')
def update_payment(invoice_id: int, payload: PaymentRequest, user=Depends(current_user)):
    if payload.payment_status not in ('Paid', 'Pending'):
        raise HTTPException(status_code=400, detail='Payment status must be Paid or Pending')
    connection = get_connection()
    result = connection.execute('UPDATE invoices SET payment_status = ? WHERE id = ? AND user_id = ?', (payload.payment_status, invoice_id, user['id']))
    if not result.rowcount:
        connection.close()
        raise HTTPException(status_code=404, detail='Invoice not found')
    connection.commit()
    connection.close()
    return get_invoice(invoice_id, user)


@app.get('/sales')
def get_sales(user=Depends(current_user), start: Optional[str] = None, end: Optional[str] = None, date: Optional[str] = None):
    connection = get_connection()
    query = '''SELECT date(s.sold_at) date, COUNT(DISTINCT s.invoice_id) invoices, SUM(s.revenue) amount, SUM(s.cost) cost, SUM(s.profit) profit, SUM(s.quantity) quantity FROM sales s WHERE s.user_id = ?'''
    params = [user['id']]
    if date:
        query += ' AND date(s.sold_at) = date(?)'
        params.append(date)
    if start:
        query += ' AND date(s.sold_at) >= date(?)'
        params.append(start)
    if end:
        query += ' AND date(s.sold_at) <= date(?)'
        params.append(end)
    rows = connection.execute(query + ' GROUP BY date(s.sold_at) ORDER BY date DESC', params).fetchall()
    connection.close()
    return [dict(row) for row in rows]


@app.get('/sales/details')
def get_sales_details(user=Depends(current_user), date: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None):
    connection = get_connection()
    query = '''SELECT date(s.sold_at) date, COALESCE(NULLIF(trim(c.name), ''), 'Walk-in Customer') customer_name, b.batch_number batch, s.quantity,
        ii.selling_price, ii.purchase_price, s.revenue, s.cost, s.profit
        FROM sales s JOIN invoices i ON i.id = s.invoice_id AND i.user_id = s.user_id LEFT JOIN customers c ON c.id = i.customer_id AND c.user_id = i.user_id JOIN product_batches b ON b.id = s.batch_id
        LEFT JOIN invoice_items ii ON ii.invoice_id = s.invoice_id AND ii.batch_id = s.batch_id
        WHERE s.user_id = ?'''
    params = [user['id']]
    if date:
        query += ' AND date(s.sold_at) = date(?)'
        params.append(date)
    if start:
        query += ' AND date(s.sold_at) >= date(?)'
        params.append(start)
    if end:
        query += ' AND date(s.sold_at) <= date(?)'
        params.append(end)
    rows = connection.execute(query + ' ORDER BY s.sold_at DESC, s.id DESC', params).fetchall()
    connection.close()
    return [dict(row) for row in rows]


@app.get('/sales/performance')
def get_sales_performance(user=Depends(current_user), date: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None):
    connection = get_connection()
    try:
        query = '''SELECT p.id, p.name, p.category, SUM(s.quantity) quantity_sold, SUM(s.revenue) revenue,
            COUNT(DISTINCT s.invoice_id) transactions
            FROM sales s JOIN products p ON p.id = s.product_id AND p.user_id = s.user_id
            WHERE s.user_id = ?'''
        params = [user['id']]
        if date:
            query += ' AND date(s.sold_at) = date(?)'
            params.append(date)
        if start:
            query += ' AND date(s.sold_at) >= date(?)'
            params.append(start)
        if end:
            query += ' AND date(s.sold_at) <= date(?)'
            params.append(end)
        rows = connection.execute(query + ' GROUP BY p.id, p.name, p.category ORDER BY quantity_sold DESC', params).fetchall()
        items = [dict(row) for row in rows]
        fast = sorted(items, key=lambda item: item['quantity_sold'], reverse=True)[:5]
        slow = sorted(items, key=lambda item: item['quantity_sold'])[:5]
        return {'fast': fast, 'slow': slow}
    finally:
        connection.close()


@app.get('/reports')
def reports(user=Depends(current_user), start: Optional[str] = None, end: Optional[str] = None, month: Optional[str] = None):
    connection = get_connection()
    conditions = ['user_id = ?']
    params = [user['id']]
    if month:
        try:
            month_start = datetime.strptime(month, '%Y-%m').date().replace(day=1)
            next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        except ValueError:
            connection.close()
            raise HTTPException(status_code=400, detail='Invalid month. Use YYYY-MM.')
        conditions.extend(['date(created_at) >= ?', 'date(created_at) < ?'])
        params.extend([month_start.isoformat(), next_month.isoformat()])
    if start:
        conditions.append('date(created_at) >= date(?)')
        params.append(start)
    if end:
        conditions.append('date(created_at) <= date(?)')
        params.append(end)
    where = ' AND '.join(conditions)
    summary = connection.execute(f'''SELECT COALESCE(SUM(total), 0) revenue, COALESCE(SUM(purchase_cost), 0) cost, COALESCE(SUM(profit), 0) profit, COUNT(*) invoices, COUNT(DISTINCT customer_id) customers, COALESCE(SUM(CASE WHEN payment_status = 'Pending' THEN total ELSE 0 END), 0) pending, COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total ELSE 0 END), 0) paid FROM invoices WHERE {where}''', params).fetchone()
    top = connection.execute(f'''SELECT product_name product, SUM(quantity) quantity, SUM(amount) revenue, SUM(cost) cost, SUM(profit) profit FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE {where}) GROUP BY product_id, product_name ORDER BY revenue DESC LIMIT 10''', params).fetchall()
    products_sold = connection.execute(f'''SELECT COALESCE(SUM(quantity), 0) quantity FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE {where})''', params).fetchone()['quantity']
    connection.close()
    return {**dict(summary), 'products_sold': products_sold, 'top_products': [dict(row) for row in top]}


@app.get('/notifications')
def notifications(user=Depends(current_user)):
    connection = get_connection()
    _notify_inventory(connection, user['id'])
    rows = connection.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY is_read, created_at DESC LIMIT 30', (user['id'],)).fetchall()
    today = now_local().date()
    result = []
    for row in rows:
        item = dict(row)
        if item['type'] in ('expiry', 'expired'):
            batch = connection.execute('SELECT expiry_date FROM product_batches WHERE id = ? AND user_id = ?', (item['related_id'], user['id'])).fetchone()
            if batch and batch['expiry_date']:
                item['expiry_date'] = batch['expiry_date']
                item['days_remaining'] = (datetime.fromisoformat(batch['expiry_date']).date() - today).days
        result.append(item)
    connection.commit()
    connection.close()
    return result


@app.patch('/notifications/read-all')
def mark_all_notifications_read(user=Depends(current_user)):
    connection = get_connection()
    connection.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', (user['id'],))
    connection.commit()
    connection.close()
    return {'message': 'Notifications marked as read'}


@app.patch('/notifications/{notification_id}/read')
def mark_notification_read(notification_id: int, user=Depends(current_user)):
    connection = get_connection()
    connection.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', (notification_id, user['id']))
    connection.commit()
    connection.close()
    return {'message': 'Notification marked as read'}


@app.get('/ai/suggestions')
def get_ai_suggestions(user=Depends(current_user)):
    return {'suggestions': ['Review low-stock items and prioritize the products with the nearest expiry date.']}

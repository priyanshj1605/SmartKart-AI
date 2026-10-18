from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import holidays

INDIAN_REGIONS = set(holidays.IN.subdivisions)
UPCOMING_FESTIVAL_WINDOW_DAYS = 90
INDIAN_REGION_NAMES = {
    'AN': 'Andaman and Nicobar Islands',
    'AP': 'Andhra Pradesh',
    'AR': 'Arunachal Pradesh',
    'AS': 'Assam',
    'BR': 'Bihar',
    'CG': 'Chhattisgarh',
    'CH': 'Chandigarh',
    'DH': 'Dadra and Nagar Haveli and Daman and Diu',
    'DL': 'Delhi',
    'GA': 'Goa',
    'GJ': 'Gujarat',
    'HP': 'Himachal Pradesh',
    'HR': 'Haryana',
    'JH': 'Jharkhand',
    'JK': 'Jammu and Kashmir',
    'KA': 'Karnataka',
    'KL': 'Kerala',
    'LA': 'Ladakh',
    'LD': 'Lakshadweep',
    'MH': 'Maharashtra',
    'ML': 'Meghalaya',
    'MN': 'Manipur',
    'MP': 'Madhya Pradesh',
    'MZ': 'Mizoram',
    'NL': 'Nagaland',
    'OD': 'Odisha',
    'PB': 'Punjab',
    'PY': 'Puducherry',
    'RJ': 'Rajasthan',
    'SK': 'Sikkim',
    'TN': 'Tamil Nadu',
    'TR': 'Tripura',
    'TS': 'Telangana',
    'UK': 'Uttarakhand',
    'UP': 'Uttar Pradesh',
    'WB': 'West Bengal',
}

_CATEGORY_ALIASES = {
    'fresh items': 'fresh_items',
    'fresh': 'fresh_items',
    'grocery kitchen': 'grocery_kitchen',
    'grocery and kitchen': 'grocery_kitchen',
    'snacks drinks biscuits': 'snacks_drinks_biscuits',
    'snacks and drinks': 'snacks_drinks_biscuits',
    'snacks beverages biscuits': 'snacks_drinks_biscuits',
    'beauty wellness': 'beauty_wellness',
    'beauty and wellness': 'beauty_wellness',
    'household lifestyle': 'household_lifestyle',
    'household and lifestyle': 'household_lifestyle',
    'dairy bakery': 'dairy_bakery',
    'dairy and bakery': 'dairy_bakery',
    'fruits vegetables': 'fruits_vegetables',
    'fruits and vegetables': 'fruits_vegetables',
    'personal care': 'personal_care',
    'stationery office': 'stationery_office',
    'stationery and office': 'stationery_office',
    'baby care': 'baby_care',
    'pet care': 'pet_care',
    'electronics accessories': 'electronics_accessories',
    'electronics and accessories': 'electronics_accessories',
}

_CATEGORY_LABELS = {
    'fresh_items': 'Fresh Items',
    'grocery_kitchen': 'Grocery & Kitchen',
    'snacks_drinks_biscuits': 'Snacks, Drinks & Biscuits',
    'beauty_wellness': 'Beauty & Wellness',
    'household_lifestyle': 'Household & Lifestyle',
    'dairy_bakery': 'Dairy & Bakery',
    'fruits_vegetables': 'Fruits & Vegetables',
    'personal_care': 'Personal Care',
    'stationery_office': 'Stationery & Office',
    'baby_care': 'Baby Care',
    'pet_care': 'Pet Care',
    'electronics_accessories': 'Electronics & Accessories',
}


def normalize_category(category: str | None) -> str:
    normalized = ' '.join(''.join(
        character if character.isalnum() else ' '
        for character in (category or '').casefold()
    ).split())
    return _CATEGORY_ALIASES.get(normalized, normalized.replace(' ', '_'))


FESTIVAL_CATEGORY_MAP = {
    'diwali': frozenset({
        'sweets', 'mithai', 'dry_fruits', 'snacks', 'namkeen', 'grocery_kitchen',
        'snacks_drinks_biscuits', 'dairy_bakery', 'fresh_items', 'decor', 'decorations',
        'household_lifestyle', 'beauty_wellness', 'personal_care', 'makeup',
    }),
    'new years eve': frozenset({
        'cake', 'cakes', 'chocolate', 'chocolates', 'dairy_bakery',
        'snacks_drinks_biscuits', 'beverages', 'drinks', 'gifts',
        'household_lifestyle',
    }),
    'dussehra': frozenset({
        'sweets', 'mithai', 'snacks', 'namkeen', 'snacks_drinks_biscuits',
        'dairy_bakery', 'puja', 'household_lifestyle', 'traditional_festival',
    }),
    'navratri': frozenset({
        'fasting', 'snacks', 'snacks_drinks_biscuits', 'fruits_vegetables',
        'fruits', 'puja', 'household_lifestyle', 'traditional_festival',
    }),
    'holi': frozenset({
        'colours', 'colors', 'colour', 'color', 'sweets', 'mithai', 'snacks',
        'namkeen', 'snacks_drinks_biscuits', 'beverages', 'drinks',
        'household_lifestyle', 'personal_care', 'fresh_items',
    }),
    'christmas': frozenset({
        'cake', 'cakes', 'chocolate', 'chocolates', 'dairy_bakery',
        'snacks_drinks_biscuits', 'beverages', 'drinks', 'gifts',
        'household_lifestyle',
    }),
    'janmashtami': frozenset({
        'sweets', 'mithai', 'dairy', 'dairy_bakery', 'butter', 'fresh_items',
        'puja', 'household_lifestyle',
    }),
    'karwa chauth': frozenset({
        'sweets', 'mithai', 'dry_fruits', 'gifts', 'beauty_wellness',
        'personal_care', 'household_lifestyle',
    }),
    'dhanteras': frozenset({
        'sweets', 'mithai', 'dry_fruits', 'grocery_kitchen',
        'household_lifestyle', 'decorations',
    }),
    'govardhan puja': frozenset({
        'sweets', 'mithai', 'dairy', 'dairy_bakery', 'grocery_kitchen',
        'household_lifestyle',
    }),
    'bhai dooj': frozenset({
        'sweets', 'mithai', 'chocolates', 'dry_fruits', 'gifts',
        'snacks_drinks_biscuits',
    }),
    'raksha bandhan': frozenset({
        'sweets', 'mithai', 'chocolate', 'chocolates', 'dry_fruits', 'gifts',
        'snacks_drinks_biscuits', 'household_lifestyle',
    }),
    'parsi new year': frozenset({
        'sweets', 'mithai', 'dry_fruits', 'grocery_kitchen', 'gifts',
    }),
    'bali pratipada': frozenset({
        'sweets', 'mithai', 'snacks', 'namkeen', 'snacks_drinks_biscuits',
        'grocery_kitchen', 'gifts',
    }),
    'makar sankranti': frozenset({
        'sesame', 'jaggery', 'sweets', 'snacks', 'namkeen',
        'snacks_drinks_biscuits', 'kite',
    }),
    'pongal': frozenset({'rice', 'grocery_kitchen', 'jaggery', 'sweets', 'puja'}),
    'eid': frozenset({
        'dates', 'vermicelli', 'seviyan', 'dry_fruits', 'sweets', 'mithai',
        'grocery_kitchen',
    }),
    'eid-ul-fitr': frozenset({
        'dates', 'vermicelli', 'seviyan', 'dry_fruits', 'sweets', 'mithai',
        'grocery_kitchen',
    }),
    'eid-ul-adha': frozenset({
        'dates', 'dry_fruits', 'sweets', 'mithai', 'grocery_kitchen',
    }),
    'muharram': frozenset(),
    'milad-un-nabi': frozenset(),
    'mahavir jayanti': frozenset({'sweets', 'mithai', 'fruits', 'fruits_vegetables'}),
    'paryushan': frozenset(),
    'ram navami': frozenset({'sweets', 'mithai', 'puja', 'household_lifestyle'}),
    'maha shivratri': frozenset({'fruits', 'fruits_vegetables', 'puja', 'dairy_bakery'}),
    'buddha purnima': frozenset({'fruits', 'fruits_vegetables', 'sweets', 'mithai'}),
    'good friday': frozenset(),
    'easter': frozenset({'dairy_bakery', 'chocolates', 'beverages'}),
    'baisakhi': frozenset({
        'grain', 'grocery_kitchen', 'sweets', 'snacks', 'snacks_drinks_biscuits',
    }),
    'magh bihu': frozenset({
        'rice', 'grocery_kitchen', 'sweets', 'snacks', 'snacks_drinks_biscuits',
    }),
    'uttarayan': frozenset({
        'kites', 'kite', 'household_lifestyle', 'sesame', 'jaggery', 'peanuts',
        'snacks_drinks_biscuits', 'grocery_kitchen',
    }),
    'mattu pongal': frozenset({'dairy', 'dairy_bakery', 'grocery_kitchen'}),
    'vishu': frozenset({'fruits', 'fruits_vegetables', 'grocery_kitchen', 'sweets'}),
    'ugadi': frozenset({
        'puja', 'sweets', 'mithai', 'grocery_kitchen', 'fruits_vegetables',
    }),
    'gudi padwa': frozenset({
        'puja', 'sweets', 'mithai', 'grocery_kitchen', 'household_lifestyle',
    }),
    'independence day': frozenset(),
    'republic day': frozenset(),
    'gandhi jayanti': frozenset(),
    'new year': frozenset({
        'cake', 'cakes', 'chocolate', 'chocolates', 'dairy_bakery',
        'snacks_drinks_biscuits', 'beverages', 'drinks', 'gifts',
        'household_lifestyle',
    }),
    'ganesh chaturthi': frozenset({
        'puja', 'sweets', 'mithai', 'grocery_kitchen', 'household_lifestyle',
    }),
    'durga puja': frozenset({
        'puja', 'sweets', 'mithai', 'snacks', 'snacks_drinks_biscuits',
        'grocery_kitchen',
    }),
    'onam': frozenset({
        'rice', 'grocery_kitchen', 'sweets', 'fruits', 'fruits_vegetables',
        'puja',
    }),
    'lohri': frozenset({'sesame', 'jaggery', 'peanut', 'sweets', 'mithai'}),
    'chhath puja': frozenset({
        'fruits', 'fruits_vegetables', 'puja', 'grain', 'grocery_kitchen',
        'household_lifestyle',
    }),
}

_FESTIVAL_CATEGORY_PRODUCT_TERMS = {
    'diwali': {
        'grocery_kitchen': ('sugar', 'jaggery', 'rice', 'flour', 'atta', 'oil', 'ghee', 'spice', 'masala', 'dry fruit', 'nut', 'sweet', 'mithai', 'namkeen', 'chikki'),
        'snacks_drinks_biscuits': ('snack', 'namkeen', 'biscuit', 'cookie', 'sweet', 'mithai', 'parle g', 'good day'),
        'dairy_bakery': ('sweet', 'mithai', 'rasgulla', 'laddu', 'ladoo', 'barfi', 'peda', 'cake', 'bakery'),
        'fresh_items': ('sweet', 'mithai', 'rasgulla', 'butter', 'milk', 'peda', 'laddu', 'ladoo'),
        'household_lifestyle': ('decor', 'diya', 'puja', 'toran', 'festive', 'agarbatti', 'incense', 'devotional'),
        'beauty_wellness': ('beauty', 'makeup', 'skin care', 'skincare', 'cosmetic', 'perfume'),
        'personal_care': ('beauty', 'makeup', 'skin care', 'skincare', 'cosmetic', 'perfume'),
    },
    'dussehra': {
        'household_lifestyle': ('puja', 'agarbatti', 'incense', 'devotional', 'festive'),
        'snacks_drinks_biscuits': ('snack', 'namkeen', 'biscuit', 'cookie', 'sweet', 'mithai', 'parle g', 'good day'),
        'dairy_bakery': ('sweet', 'mithai', 'rasgulla', 'laddu', 'ladoo', 'barfi', 'peda'),
    },
    'navratri': {
        'household_lifestyle': ('puja', 'agarbatti', 'incense', 'devotional', 'festive'),
        'snacks_drinks_biscuits': ('fasting', 'fruit', 'snack', 'namkeen', 'biscuit', 'cookie'),
    },
    'christmas': {
        'household_lifestyle': ('gift', 'christmas', 'ornament', 'decoration'),
        'snacks_drinks_biscuits': ('chocolate', 'cake', 'sweet', 'snack', 'biscuit', 'cookie', 'beverage', 'drink', 'parle g', 'good day'),
        'dairy_bakery': ('cake', 'chocolate', 'sweet', 'mithai', 'bakery', 'rasgulla'),
    },
    'janmashtami': {
        'household_lifestyle': ('puja', 'agarbatti', 'incense', 'devotional', 'janmashtami'),
        'dairy_bakery': ('sweet', 'mithai', 'rasgulla', 'butter', 'dairy', 'milk', 'peda', 'laddu', 'ladoo'),
        'fresh_items': ('milk', 'butter', 'dairy', 'sweet', 'mithai', 'peda', 'laddu', 'ladoo'),
    },
    'karwa chauth': {
        'beauty_wellness': ('mehendi', 'henna', 'beauty', 'makeup', 'cosmetic'),
        'personal_care': ('mehendi', 'henna', 'beauty', 'makeup', 'cosmetic'),
        'household_lifestyle': ('gift', 'karwa', 'karva', 'decor', 'sargi'),
    },
    'dhanteras': {
        'grocery_kitchen': ('sugar', 'jaggery', 'rice', 'flour', 'atta', 'oil', 'ghee', 'spice', 'masala', 'sweet', 'mithai', 'dry fruit'),
        'household_lifestyle': ('diya', 'decor', 'puja', 'dhanteras', 'incense', 'agarbatti', 'utensil'),
    },
    'new year': {
        'dairy_bakery': ('cake', 'chocolate', 'sweet', 'bakery'),
        'snacks_drinks_biscuits': ('cake', 'chocolate', 'sweet', 'snack', 'biscuit', 'cookie', 'beverage', 'drink'),
        'household_lifestyle': ('gift', 'hamper', 'decoration'),
    },
    'new years eve': {
        'dairy_bakery': ('cake', 'chocolate', 'sweet', 'bakery'),
        'snacks_drinks_biscuits': ('cake', 'chocolate', 'sweet', 'snack', 'biscuit', 'cookie', 'beverage', 'drink'),
        'household_lifestyle': ('gift', 'hamper', 'decoration'),
    },
    'govardhan puja': {
        'household_lifestyle': ('puja', 'govardhan', 'annakut', 'annakoot', 'agarbatti', 'incense'),
        'dairy_bakery': ('sweet', 'mithai', 'rasgulla', 'milk', 'butter', 'peda', 'laddu', 'ladoo'),
        'grocery_kitchen': ('rice', 'flour', 'atta', 'ghee', 'milk', 'grain', 'sweet', 'mithai'),
    },
    'bhai dooj': {
        'snacks_drinks_biscuits': ('sweet', 'mithai', 'chocolate', 'biscuit', 'cookie', 'snack', 'parle g', 'good day'),
    },
    'holi': {
        'snacks_drinks_biscuits': ('sweet', 'mithai', 'snack', 'namkeen', 'biscuit', 'cookie', 'beverage', 'drink', 'parle g', 'good day'),
        'dairy_bakery': ('sweet', 'mithai', 'rasgulla', 'cake', 'bakery'),
        'fresh_items': ('sweet', 'mithai', 'rasgulla', 'milk', 'butter'),
        'household_lifestyle': ('color', 'colour', 'gulal', 'pichkari', 'holi'),
        'personal_care': ('color', 'colour', 'gulal', 'skin care', 'skin-care', 'holi'),
    },
    'eid-ul-fitr': {
        'grocery_kitchen': ('date', 'vermicelli', 'seviyan', 'dry fruit', 'rice', 'flour', 'atta', 'oil', 'ghee', 'spice', 'sweet', 'mithai'),
        'dairy_bakery': ('sweet', 'mithai', 'rasgulla', 'bakery'),
    },
    'eid-ul-adha': {
        'grocery_kitchen': ('date', 'dry fruit', 'rice', 'flour', 'atta', 'oil', 'ghee', 'spice', 'sweet', 'mithai'),
    },
    'uttarayan': {
        'household_lifestyle': ('kite', 'manja', 'string', 'thread'),
        'grocery_kitchen': ('sesame', 'til', 'jaggery', 'gur', 'peanut', 'groundnut', 'chikki', 'sweet'),
        'snacks_drinks_biscuits': ('sesame', 'til', 'jaggery', 'gur', 'peanut', 'groundnut', 'chikki', 'sweet', 'snack'),
    },
    'makar sankranti': {
        'grocery_kitchen': ('sesame', 'til', 'jaggery', 'gur', 'peanut', 'groundnut', 'chikki', 'sweet'),
        'snacks_drinks_biscuits': ('sesame', 'til', 'jaggery', 'gur', 'peanut', 'groundnut', 'chikki', 'sweet', 'snack'),
    },
    'pongal': {
        'grocery_kitchen': ('rice', 'jaggery', 'lentil', 'dal', 'milk', 'ghee', 'grain', 'sugarcane', 'pongal'),
        'fresh_items': ('milk', 'butter', 'dairy', 'sugarcane'),
    },
    'mattu pongal': {
        'dairy_bakery': ('milk', 'butter', 'dairy', 'sweet', 'pongal'),
        'grocery_kitchen': ('rice', 'jaggery', 'lentil', 'dal', 'ghee', 'pongal'),
    },
    'lohri': {
        'grocery_kitchen': ('sesame', 'til', 'jaggery', 'gur', 'peanut', 'groundnut', 'chikki', 'sweet'),
        'snacks_drinks_biscuits': ('sesame', 'til', 'jaggery', 'gur', 'peanut', 'groundnut', 'chikki', 'sweet', 'snack'),
    },
    'raksha bandhan': {
        'household_lifestyle': ('gift', 'rakhi', 'decoration'),
    },
    'ganesh chaturthi': {
        'household_lifestyle': ('puja', 'agarbatti', 'incense', 'devotional', 'ganesh'),
    },
    'durga puja': {
        'household_lifestyle': ('puja', 'agarbatti', 'incense', 'devotional', 'durga'),
        'grocery_kitchen': ('sweet', 'mithai', 'rice', 'flour', 'ghee', 'spice'),
        'snacks_drinks_biscuits': ('sweet', 'mithai', 'snack', 'namkeen', 'biscuit', 'cookie'),
    },
    'magh bihu': {
        'grocery_kitchen': ('rice', 'jaggery', 'sesame', 'til', 'peanut', 'pitha', 'sweet', 'grain'),
        'snacks_drinks_biscuits': ('rice', 'jaggery', 'sesame', 'til', 'peanut', 'pitha', 'sweet', 'snack'),
    },
    'parsi new year': {
        'grocery_kitchen': ('sweet', 'mithai', 'dry fruit', 'rice', 'spice'),
    },
    'bali pratipada': {
        'grocery_kitchen': ('sweet', 'mithai', 'rice', 'flour', 'ghee', 'grain'),
        'snacks_drinks_biscuits': ('sweet', 'mithai', 'snack', 'namkeen', 'biscuit', 'cookie'),
    },
    'chhath puja': {
        'grocery_kitchen': ('fruit', 'grain', 'rice', 'jaggery', 'wheat', 'sweet', 'ghee'),
        'fruits_vegetables': ('fruit', 'banana', 'apple', 'coconut', 'sugarcane'),
        'grocery_kitchen': ('fruit', 'grain', 'rice', 'jaggery', 'wheat', 'sweet', 'ghee'),
        'fruits_vegetables': ('fruit', 'banana', 'apple', 'coconut', 'sugarcane'),
        'household_lifestyle': ('puja', 'chhath', 'incense', 'agarbatti', 'devotional'),
    },
    'onam': {
        'grocery_kitchen': ('rice', 'grain', 'lentil', 'dal', 'coconut', 'jaggery', 'spice', 'payasam', 'sweet'),
        'fruits_vegetables': ('fruit', 'banana', 'vegetable', 'coconut'),
    },
    'gudi padwa': {
        'household_lifestyle': ('puja', 'gudi', 'toran', 'decor', 'incense', 'agarbatti'),
        'grocery_kitchen': ('sweet', 'mithai', 'rice', 'jaggery', 'ghee'),
    },
    'ugadi': {
        'grocery_kitchen': ('sweet', 'mithai', 'rice', 'jaggery', 'tamarind', 'mango', 'neem'),
        'fruits_vegetables': ('fruit', 'mango', 'neem'),
    },
}

_PRODUCT_NAME_ALIASES = {
    'parle g': ('snack', 'biscuit'),
    'good day': ('snack', 'biscuit', 'cookie'),
    'rasgulla': ('sweet', 'mithai', 'dairy_bakery'),
    'gulab jamun': ('sweet', 'mithai'),
    'laddu': ('sweet', 'mithai'),
    'ladoo': ('sweet', 'mithai'),
    'barfi': ('sweet', 'mithai'),
    'peda': ('sweet', 'mithai'),
    'butter': ('dairy', 'fresh_items'),
    'agarbatti': ('puja', 'incense', 'household_lifestyle'),
    'mehendi': ('henna', 'beauty_wellness'),
    'kite': ('kite', 'uttarayan'),
    'manja': ('kite_string', 'uttarayan'),
    'chikki': ('peanut', 'jaggery', 'sweet'),
}

_GENERIC_CATEGORY_PRODUCT_TERMS = {
    'sweets': ('sweet', 'mithai', 'rasgulla', 'gulab jamun', 'laddu', 'ladoo', 'barfi', 'peda'),
    'mithai': ('sweet', 'mithai', 'rasgulla', 'gulab jamun', 'laddu', 'ladoo', 'barfi', 'peda'),
    'snacks': ('snack', 'namkeen', 'biscuit', 'cookie', 'chips', 'chikki'),
    'namkeen': ('namkeen', 'snack', 'mixture', 'sev'),
    'dry_fruits': ('dry fruit', 'almond', 'cashew', 'pistachio', 'walnut', 'raisin', 'dates'),
    'chocolate': ('chocolate', 'cocoa'),
    'chocolates': ('chocolate', 'cocoa'),
    'beverages': ('beverage', 'drink', 'juice', 'tea', 'coffee', 'milk'),
    'drinks': ('drink', 'juice', 'tea', 'coffee', 'milk', 'beverage'),
    'cake': ('cake', 'bakery'),
    'cakes': ('cake', 'bakery'),
    'dairy': ('dairy', 'milk', 'butter', 'cheese', 'ghee', 'yogurt'),
    'dates': ('date', 'dates'),
    'vermicelli': ('vermicelli', 'seviyan', 'sewai'),
    'seviyan': ('seviyan', 'vermicelli', 'sewai'),
    'decorations': ('decor', 'decoration', 'diya', 'toran', 'festive'),
    'gifts': ('gift', 'hamper', 'present'),
    'kite': ('kite', 'patang'),
    'kites': ('kite', 'patang'),
}


def _normalize_festival_label(value: str) -> str:
    value = value.replace("'", '').replace('’', '')
    return ' '.join(''.join(
        character if character.isalnum() else ' '
        for character in value.casefold()
    ).split())


def _festival_mapping_key(festival_name: str) -> str:
    normalized_name = _normalize_festival_label(festival_name)
    for festival in FESTIVAL_MASTER:
        if normalized_name == _normalize_festival_label(festival['name']) or any(
            normalized_name == _normalize_festival_label(alias)
            for alias in festival['aliases']
        ):
            return _normalize_festival_label(festival['name'])
    return normalized_name


def festival_categories(festival_name: str) -> frozenset[str]:
    return FESTIVAL_CATEGORY_MAP.get(_festival_mapping_key(festival_name), frozenset())


def product_matches_festival_category(festival_name: str, category: str | None, product_name: str) -> bool:
    category_key = normalize_category(category)
    if category_key not in festival_categories(festival_name):
        return False
    normalized_name = product_name.casefold()
    product_terms = {
        term
        for alias, terms in _PRODUCT_NAME_ALIASES.items()
        if alias in normalized_name
        for term in terms
    }
    festival_key = _festival_mapping_key(festival_name)
    terms = _FESTIVAL_CATEGORY_PRODUCT_TERMS.get(festival_key, {}).get(
        category_key,
        _GENERIC_CATEGORY_PRODUCT_TERMS.get(category_key, ()),
    )
    return any(term in normalized_name or term in product_terms for term in terms)


def festival_category_labels(festival_name: str) -> list[str]:
    return sorted(
        {_CATEGORY_LABELS.get(category, category.replace('_', ' ').title())
         for category in festival_categories(festival_name)}
    )


FESTIVAL_MASTER = (
    {
        'name': 'Navratri',
        'aliases': ('Navratri', 'Navaratri', 'Mahasaptami', 'Mahashtami', 'Mahanavami', 'Durgashtami'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Dussehra',
        'aliases': ('Dussehra', 'Vijayadashami'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Karwa Chauth',
        'aliases': ('Karwa Chauth', 'Karva Chauth', 'Karak Chaturthi'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Dhanteras',
        'aliases': ('Dhanteras', 'Dhantrayodashi', 'Dhanvantari Jayanti'),
        'type': 'Hindu',
        'preparation_days': 21,
        'provisional': True,
    },
    {
        'name': 'Diwali',
        'aliases': ('Diwali Deepavali', 'Diwali', 'Deepavali', 'Deepawali', 'Dipawali'),
        'type': 'Hindu',
        'preparation_days': 30,
        'provisional': True,
    },
    {
        'name': 'Govardhan Puja',
        'aliases': ('Govardhan Puja', 'Annakut Puja', 'Annakoot', 'Bali Pratipada', 'Bali Padyami', 'Diwali Bali Pratipada'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Bhai Dooj',
        'aliases': ('Bhai Dooj', 'Bhai Duj', 'Bhai Tika', 'Bhaiya Dooj', 'Bhau Beej', 'Bhai Bij', 'Yamadvitiya'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Chhath Puja',
        'aliases': ('Surya Shashthi Chhath Puja', 'Surya Sashthi Chhath Puja', 'Pratihar Shashthi Chhath Puja', 'Chhath Puja', 'Chhath', 'Surya Shashthi', 'Surya Sashthi', 'Pratihar Shashthi'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Holi',
        'aliases': ('Holi', 'Rangwali Holi', 'Dhulandi', 'Dol Purnima'),
        'type': 'Hindu / regional spring festival',
        'preparation_days': 21,
        'provisional': True,
    },
    {
        'name': 'Guru Nanak Jayanti',
        'aliases': ("Guru Nanak's Jayanti", 'Guru Nanak Jayanti', 'Guru Nanak Gurpurab', 'Gurpurab'),
        'type': 'Sikh',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Christmas',
        'aliases': ('Christmas Day', 'Christmas'),
        'type': 'Christian',
        'preparation_days': 21,
        'provisional': False,
    },
    {
        'name': 'Christmas Eve',
        'aliases': ('Christmas Eve',),
        'type': 'Christian',
        'preparation_days': 14,
        'provisional': False,
    },
    {
        'name': 'New Year',
        'aliases': ("New Year's Day", 'New Year Day'),
        'type': 'Seasonal',
        'preparation_days': 14,
        'provisional': False,
    },
    {
        'name': "New Year's Eve",
        'aliases': ("New Year's Eve",),
        'type': 'Seasonal',
        'preparation_days': 14,
        'provisional': False,
    },
    {
        'name': 'Lohri',
        'aliases': ('Lohri',),
        'type': 'Punjabi regional',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Makar Sankranti',
        'aliases': ('Makar Sankranti', 'Makara Sankranti', 'Sankranti'),
        'type': 'Hindu / solar harvest',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Uttarayan',
        'aliases': ('Uttarayan',),
        'type': 'Gujarati regional',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Pongal',
        'aliases': ('Pongal', 'Thai Pongal', 'Surya Pongal'),
        'type': 'Tamil regional / harvest',
        'preparation_days': 21,
        'provisional': True,
    },
    {
        'name': 'Bhogi',
        'aliases': ('Bhogi Pongal', 'Bhogi'),
        'type': 'South Indian regional / harvest',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Mattu Pongal',
        'aliases': ('Thiruvalluvar Day Mattu Pongal', 'Thiruvalluvar Day', 'Mattu Pongal'),
        'type': 'Tamil regional / harvest',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Magh Bihu',
        'aliases': ('Magh Bihu', 'Bhogali Bihu'),
        'type': 'Assamese regional / harvest',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Eid-ul-Fitr',
        'aliases': ('Eid ul Fitr', 'Id ul Fitr', 'Id-ul-Fitr', 'Ramzan Id', 'Ramadan Eid', 'Eid al-Fitr'),
        'type': 'Muslim',
        'preparation_days': 21,
        'provisional': True,
    },
    {
        'name': 'Eid-ul-Adha',
        'aliases': ('Eid ul Adha', 'Id ul Adha', 'Id-ul-Zuha', 'Bakrid', 'Eid al-Adha'),
        'type': 'Muslim',
        'preparation_days': 21,
        'provisional': True,
    },
    {
        'name': 'Muharram',
        'aliases': ('Muharram', 'Ashura', 'Ashura (estimated)'),
        'type': 'Muslim',
        'preparation_days': 7,
        'provisional': True,
    },
    {
        'name': 'Milad-un-Nabi',
        'aliases': ('Milad un Nabi', 'Milad-un-Nabi', 'Mawlid', 'Id-e-Milad'),
        'type': 'Muslim',
        'preparation_days': 7,
        'provisional': True,
    },
    {
        'name': 'Mahavir Jayanti',
        'aliases': ('Mahavir Jayanti', 'Mahavir Janma Kalyanak'),
        'type': 'Jain',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Paryushan',
        'aliases': ('Paryushan', 'Paryushana'),
        'type': 'Jain',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Ram Navami',
        'aliases': ('Ram Navami', 'Rama Navami'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Maha Shivratri',
        'aliases': ('Maha Shivaratri', 'Maha Shivratri', 'Shivaratri'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Ganesh Chaturthi',
        'aliases': ('Ganesh Chaturthi', 'Ganesh Chathurthi', 'Vinayaka Chaturthi'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Durga Puja',
        'aliases': ('Durga Puja', 'Maha Ashtami', 'Durga Ashtami'),
        'type': 'Hindu / Bengali regional',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Janmashtami',
        'aliases': ('Janmashtami', 'Krishna Janmashtami', 'Gokulashtami'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Raksha Bandhan',
        'aliases': ('Raksha Bandhan', 'Rakhi'),
        'type': 'Hindu',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Baisakhi',
        'aliases': ('Baisakhi', 'Vaisakhi'),
        'type': 'Sikh / Punjabi regional / harvest',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Buddha Purnima',
        'aliases': ('Buddha Purnima', 'Buddha Jayanti', 'Vesak'),
        'type': 'Buddhist',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Good Friday',
        'aliases': ('Good Friday',),
        'type': 'Christian',
        'preparation_days': 14,
        'provisional': False,
    },
    {
        'name': 'Easter',
        'aliases': ('Easter Sunday', 'Easter'),
        'type': 'Christian',
        'preparation_days': 21,
        'provisional': False,
    },
    {
        'name': 'Onam',
        'aliases': ('Onam', 'Thiruvonam'),
        'type': 'Malayali regional / harvest',
        'preparation_days': 21,
        'provisional': True,
    },
    {
        'name': 'Ugadi',
        'aliases': ('Ugadi', 'Yugadi'),
        'type': 'South Indian regional',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Gudi Padwa',
        'aliases': ('Gudi Padwa', 'Gudi Padva'),
        'type': 'Maharashtrian regional',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Vishu',
        'aliases': ('Vishu',),
        'type': 'Malayali regional',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Bihu',
        'aliases': ('Rongali Bihu', 'Bohag Bihu'),
        'type': 'Assamese regional / harvest',
        'preparation_days': 14,
        'provisional': True,
    },
    {
        'name': 'Independence Day',
        'aliases': ('Independence Day',),
        'type': 'National',
        'preparation_days': 14,
        'provisional': False,
    },
    {
        'name': 'Republic Day',
        'aliases': ('Republic Day',),
        'type': 'National',
        'preparation_days': 14,
        'provisional': False,
    },
    {
        'name': 'Gandhi Jayanti',
        'aliases': ('Gandhi Jayanti',),
        'type': 'National',
        'preparation_days': 14,
        'provisional': False,
    },
)

_ALIAS_TO_FESTIVAL = sorted(
    (
        (alias.casefold(), festival)
        for festival in FESTIVAL_MASTER
        for alias in festival['aliases']
    ),
    key=lambda item: len(item[0]),
    reverse=True,
)
_HOLIDAY_CALENDAR_SOURCE = {
    'name': 'Python holidays India national and state calendar',
    'url': 'https://holidays.readthedocs.io/en/latest/',
    'verification': 'Government-designated country and subdivision holidays; lunar observances may be provisional.',
}
_PAN_INDIA = 'IN'
_LOHRI_REGIONS = ('CH', 'DL', 'HP', 'HR', 'JK', 'PB', 'RJ', 'UK', 'UP')
_CURATED_DATE_OVERRIDES = (
    ('Karwa Chauth', '2026-10-30', 'https://www.prokerala.com/festivals/karwa-chauth.html', None),
    ('Karwa Chauth', '2027-10-19', 'https://www.prokerala.com/festivals/karwa-chauth.html', None),
    ('Karwa Chauth', '2028-10-08', 'https://www.prokerala.com/festivals/karwa-chauth.html', None),
    ('Karwa Chauth', '2029-10-26', 'https://www.prokerala.com/festivals/karwa-chauth.html', None),
    ('Karwa Chauth', '2030-10-15', 'https://www.prokerala.com/festivals/karwa-chauth.html', None),
    ('Dhanteras', '2026-11-06', 'https://www.prokerala.com/festivals/dhanteras.html', None),
    ('Dhanteras', '2027-10-27', 'https://www.prokerala.com/festivals/dhanteras.html', None),
    ('Dhanteras', '2028-10-15', 'https://www.prokerala.com/festivals/dhanteras.html', None),
    ('Dhanteras', '2029-11-03', 'https://www.prokerala.com/festivals/dhanteras.html', None),
    ('Bhogi', '2027-01-14', 'https://www.prokerala.com/festivals/pongal.html', ('AP', 'KA', 'TN', 'TS')),
)
_CURATED_FIXED_DATES = (
    ('New Year', 1, 1, _PAN_INDIA),
)


def _festival_for_holiday(label: str):
    normalized = ' '.join(''.join(
        character if character.isalnum() else ' '
        for character in label.casefold()
    ).split())
    normalized = ' '.join(
        word for word in normalized.split()
        if word not in {'estimated', 'observed'}
    )
    for alias, festival in _ALIAS_TO_FESTIVAL:
        alias_normalized = ' '.join(''.join(
            character if character.isalnum() else ' '
            for character in alias
        ).split())
        if alias_normalized == normalized:
            return festival
    return None


def _date_source_is_provisional(festival, holiday_label: str = '') -> bool:
    return festival['provisional'] or 'estimated' in holiday_label.casefold()


def india_today() -> date:
    return datetime.now(ZoneInfo('Asia/Kolkata')).date()


def filter_upcoming_festivals(festivals, today: date):
    end_date = today + timedelta(days=UPCOMING_FESTIVAL_WINDOW_DAYS)
    upcoming = []
    for festival in festivals:
        occurrence_date = date.fromisoformat(festival['date'])
        if not today <= occurrence_date <= end_date:
            continue
        upcoming.append({
            **festival,
            'days_remaining': (occurrence_date - today).days,
        })
    return sorted(upcoming, key=lambda festival: (festival['date'], festival['name']))


def upcoming_festivals(today: date, region: str | None = None):
    if region and region not in INDIAN_REGIONS:
        raise ValueError('Select a valid Indian state or union territory code.')
    end_date = today + timedelta(days=UPCOMING_FESTIVAL_WINDOW_DAYS)
    years = range(today.year, end_date.year + 1)
    regions = (region,) if region else tuple(sorted(INDIAN_REGIONS))
    festivals = {}

    def add_festival(festival_name, festival_date, region_codes, source, date_status):
        if not today <= festival_date <= end_date:
            return
        festival = next(item for item in FESTIVAL_MASTER if item['name'] == festival_name)
        key = (festival_name, festival_date)
        entry = festivals.setdefault(key, {
            'name': festival_name,
            'date': festival_date.isoformat(),
            'days_remaining': (festival_date - today).days,
            'aliases': list(festival['aliases']),
            'festival_type': festival['type'],
            'suggested_categories': festival_category_labels(festival_name),
            'preparation_window_days': festival['preparation_days'],
            'date_status': date_status,
            'date_source': source,
            'applicable_regions': set(),
            'reason': 'Recommendations are advisory and only use matching products and recorded store data.',
        })
        entry['applicable_regions'].update(region_codes)
        if date_status == 'provisional':
            entry['date_status'] = 'provisional'

    for holiday_region in regions:
        calendar = holidays.country_holidays(
            'IN',
            subdiv=holiday_region,
            years=years,
            observed=False,
        )
        for holiday_date, holiday_names in calendar.items():
            if not today <= holiday_date <= end_date:
                continue
            for holiday_label in str(holiday_names).split(';'):
                festival = _festival_for_holiday(holiday_label.strip())
                if not festival:
                    continue
                add_festival(
                    festival['name'],
                    holiday_date,
                    (holiday_region,),
                    _HOLIDAY_CALENDAR_SOURCE,
                    'provisional' if _date_source_is_provisional(festival, holiday_label) else 'calendar',
                )

    if not region or region in _LOHRI_REGIONS:
        makar_calendar = holidays.country_holidays('IN', subdiv='KA', years=years, observed=False)
        for holiday_date, holiday_names in makar_calendar.items():
            if holiday_date.month != 1:
                continue
            if not any(
                (festival := _festival_for_holiday(holiday_label.strip()))
                and festival['name'] == 'Makar Sankranti'
                for holiday_label in str(holiday_names).split(';')
            ):
                continue
            applicable_regions = (region,) if region else _LOHRI_REGIONS
            add_festival(
                'Lohri',
                holiday_date - timedelta(days=1),
                applicable_regions,
                {
                    'name': 'Prokerala Lohri and Makar Sankranti calendars',
                    'url': 'https://www.prokerala.com/festivals/lohri.html',
                    'verification': 'Lohri is observed before Maghi; regional dates may differ. Verify locally.',
                },
                'provisional',
            )

    for festival_name, date_value, source_url, applicable_regions in _CURATED_DATE_OVERRIDES:
        event_date = date.fromisoformat(date_value)
        if applicable_regions and region and region not in applicable_regions:
            continue
        if applicable_regions and not region:
            region_codes = applicable_regions
        else:
            region_codes = (_PAN_INDIA,) if not applicable_regions else (region,)
        add_festival(
            festival_name,
            event_date,
            region_codes,
            {
                'name': 'Prokerala annual festival calendar',
                'url': source_url,
                'verification': 'Panchang-based date; may vary by regional calendar and should be locally verified.',
            },
            'provisional',
        )

    for year in range(today.year, end_date.year + 1):
        for festival_name, month, day, region_code in _CURATED_FIXED_DATES:
            add_festival(
                festival_name,
                date(year, month, day),
                (region_code,),
                {
                    'name': 'Fixed Gregorian seasonal calendar',
                    'url': 'https://www.timeanddate.com/holidays/common/new-year-day',
                    'verification': 'Fixed-date observance; date does not vary by lunar or regional calendar.',
                },
                'calendar',
            )

    result = []
    for entry in festivals.values():
        applicable_regions = entry.pop('applicable_regions')
        if not region and INDIAN_REGIONS.issubset(applicable_regions):
            applicable_regions = {_PAN_INDIA}
        if region and _PAN_INDIA in applicable_regions:
            applicable_regions = {_PAN_INDIA}
        entry['applicable_regions'] = [
            {'code': code, 'name': 'India-wide' if code == _PAN_INDIA else INDIAN_REGION_NAMES.get(code, code)}
            for code in sorted(applicable_regions)
        ]
        result.append(entry)
    return filter_upcoming_festivals(result, today)

import unittest
from datetime import date

from backend.inventory import InsufficientStockError, allocate_fefo_batches


class AllocateFefoBatchesTests(unittest.TestCase):
    def setUp(self):
        self.batches = [
            {'id': 2, 'expiry_date': '2026-10-21', 'quantity_remaining': 50, 'selling_price': 12, 'purchase_price': 8},
            {'id': 3, 'expiry_date': None, 'quantity_remaining': 100, 'selling_price': 14, 'purchase_price': 9},
            {'id': 1, 'expiry_date': '2026-10-07', 'quantity_remaining': 75, 'selling_price': 10, 'purchase_price': 6},
        ]

    def test_uses_earliest_expiry_then_next_batch(self):
        allocations = allocate_fefo_batches(self.batches, 90)
        self.assertEqual([(batch['id'], quantity) for batch, quantity in allocations], [(1, 75), (2, 15)])

    def test_preserves_each_batch_price_for_revenue_and_cost(self):
        allocations = allocate_fefo_batches(self.batches, 90)
        revenue = sum(batch['selling_price'] * quantity for batch, quantity in allocations)
        cost = sum(batch['purchase_price'] * quantity for batch, quantity in allocations)
        self.assertEqual(revenue, 930)
        self.assertEqual(cost, 570)

    def test_uses_batch_id_as_same_expiry_tiebreaker(self):
        batches = [
            {'id': 8, 'expiry_date': '2026-10-07', 'quantity_remaining': 2},
            {'id': 4, 'expiry_date': '2026-10-07', 'quantity_remaining': 2},
        ]
        allocations = allocate_fefo_batches(batches, 1)
        self.assertEqual(allocations[0][0]['id'], 4)

    def test_reports_eligible_quantity_when_stock_is_short(self):
        with self.assertRaises(InsufficientStockError) as error:
            allocate_fefo_batches(self.batches[:1], 51)
        self.assertEqual(error.exception.available, 50)

    def test_never_allocates_expired_batches(self):
        batches = [{'id': 9, 'expiry_date': '2026-10-17', 'quantity_remaining': 100}]
        with self.assertRaises(InsufficientStockError) as error:
            allocate_fefo_batches(batches, 1, date(2026, 10, 18))
        self.assertEqual(error.exception.available, 0)


if __name__ == '__main__':
    unittest.main()

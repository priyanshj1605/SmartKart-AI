from datetime import date


class InsufficientStockError(ValueError):
    def __init__(self, available: int):
        self.available = available
        super().__init__(f'Only {available} eligible units are available.')


def allocate_fefo_batches(batches, requested_quantity: int, today: date | None = None):
    eligible_batches = [
        batch for batch in batches
        if today is None or not batch['expiry_date'] or date.fromisoformat(batch['expiry_date']) > today
    ]
    ordered = sorted(
        eligible_batches,
        key=lambda batch: (
            batch['expiry_date'] is None,
            batch['expiry_date'] or '',
            batch['id'],
        ),
    )
    available = sum(int(batch['quantity_remaining']) for batch in ordered)
    if available < requested_quantity:
        raise InsufficientStockError(available)

    remaining = requested_quantity
    allocations = []
    for batch in ordered:
        quantity = min(remaining, int(batch['quantity_remaining']))
        if quantity:
            allocations.append((batch, quantity))
            remaining -= quantity
        if not remaining:
            break
    return allocations

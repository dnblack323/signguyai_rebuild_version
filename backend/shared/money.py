from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import NewType


MoneyMinor = NewType("MoneyMinor", int)


def to_minor_units(value: int | str | Decimal, scale: int = 2) -> MoneyMinor:
    """Convert a decimal currency value to integer minor units.

    Floats are intentionally unsupported because the data blueprint forbids
    binary float money.
    """

    if isinstance(value, bool) or isinstance(value, float):
        raise TypeError("money values must not be floats")
    try:
        amount = Decimal(value)
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("invalid money value") from exc
    multiplier = Decimal(10) ** scale
    return MoneyMinor(int((amount * multiplier).quantize(Decimal("1"), rounding=ROUND_HALF_UP)))


def assert_minor_units(value: int) -> MoneyMinor:
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError("money minor units must be an integer")
    return MoneyMinor(value)

GOTO https://example.com

WAIT input[type="search"]
TYPE input[type="search"] "laptops"
PRESS Enter
WAITLOAD

SCAN .product-card
EXTRACT .product-title text
EXTRACT .product-price text
EXTRACT .product-link href

PAGINATE .pagination-next

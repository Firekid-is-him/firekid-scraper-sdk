GOTO https://example-shop.com/products

WAIT .product-grid
WAITLOAD

SCAN .product-item
EXTRACT .product-title text
EXTRACT .product-price text
EXTRACT .product-image src

PAGINATE .next-page

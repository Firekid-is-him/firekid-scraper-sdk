# Command Reference

Complete guide to all Firekid Scraper commands.

## Navigation

### GOTO
Navigate to a URL.

```cmd
GOTO https://example.com
```

### BACK
Go back one page.

```cmd
BACK
```

### FORWARD
Go forward one page.

```cmd
FORWARD
```

### REFRESH
Reload the current page.

```cmd
REFRESH
```

## Interaction

### CLICK
Click an element.

```cmd
CLICK button.submit
CLICK #login-button
```

### TYPE
Type text into an input field.

```cmd
TYPE input#search "my query"
TYPE input[name="email"] "test@example.com"
```

### PRESS
Press a keyboard key.

```cmd
PRESS Enter
PRESS Escape
PRESS Tab
```

### SELECT
Select an option from a dropdown.

```cmd
SELECT select#country "United States"
```

### CHECK
Check a checkbox.

```cmd
CHECK input#agree
```

### UPLOAD
Upload a file.

```cmd
UPLOAD input[type="file"] ./path/to/file.pdf
```

## Waiting

### WAIT
Wait for a selector or milliseconds.

```cmd
WAIT .content
WAIT 5000
```

### WAITLOAD
Wait for network to be idle.

```cmd
WAITLOAD
```

## Scrolling

### SCROLL
Scroll to an element.

```cmd
SCROLL .footer
```

### SCROLLDOWN
Scroll down by pixels.

```cmd
SCROLLDOWN 500
```

## Extraction

### SCAN
Scan elements and log details.

```cmd
SCAN .product-item
```

### EXTRACT
Extract data from elements.

```cmd
EXTRACT h1 text
EXTRACT img src
EXTRACT .price data-value
```

### SCREENSHOT
Take a screenshot.

```cmd
SCREENSHOT output.png
```

## Pagination

### PAGINATE
Click next until no more pages.

```cmd
PAGINATE .next-button
```

### INFINITESCROLL
Scroll until no more content loads.

```cmd
INFINITESCROLL
```

## Network

### FETCH
Fetch a URL with auto-referer.

```cmd
FETCH https://api.example.com/data
```

### DOWNLOAD
Download a file.

```cmd
DOWNLOAD https://cdn.example.com/video.mp4 ./downloads/video.mp4
```

### REFERER
Set manual referer for next request.

```cmd
REFERER https://example.com
```

## Cloudflare

### BYPASS_CLOUDFLARE
Handle Cloudflare challenges.

```cmd
BYPASS_CLOUDFLARE auto
BYPASS_CLOUDFLARE manual
```

## Flow Control

### REPEAT
Loop over elements.

```cmd
REPEAT .item
  CLICK .button
  EXTRACT .title text
```

### IF
Conditional execution.

```cmd
IF .login-required
  CLICK .login-button
  TYPE input#username "admin"
```

### LOOP
Fixed number of iterations.

```cmd
LOOP 5
  SCROLLDOWN 500
  WAIT 1000
```

## Best Practices

1. Always use `WAITLOAD` after navigation
2. Use `WAIT` before interacting with elements
3. Prefer specific selectors (IDs, unique classes)
4. Use `REPEAT` for list scraping
5. Handle Cloudflare early with `BYPASS_CLOUDFLARE`

## Example Workflow

```cmd
GOTO https://example-shop.com

WAIT .search-box
TYPE .search-box "laptops"
PRESS Enter
WAITLOAD

REPEAT .product-card
  EXTRACT .title text
  EXTRACT .price text
  EXTRACT .image src

PAGINATE .next-page
```

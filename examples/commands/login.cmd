GOTO https://example.com/login

WAIT input#username
WAIT input#password

TYPE input#username "your-username"
TYPE input#password "your-password"

CLICK button[type="submit"]
WAITLOAD

SCREENSHOT ./screenshots/after-login.png

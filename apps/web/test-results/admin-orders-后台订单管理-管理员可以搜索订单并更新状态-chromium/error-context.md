# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - button "EN" [ref=e6] [cursor=pointer]
      - button "中文" [ref=e7] [cursor=pointer]
    - heading "Admin Sign In" [level=1] [ref=e8]
    - paragraph [ref=e9]:
      - text: Administrator access only. Customer login is available at
      - link "Sign In" [ref=e10] [cursor=pointer]:
        - /url: /login
      - text: .
    - generic [ref=e11]:
      - generic [ref=e12]: "Network error: Unable to connect to server. Please check if the backend server is running."
      - generic [ref=e13]:
        - generic [ref=e14]: Email *
        - textbox "Email *" [ref=e15]: demo@print.local
      - generic [ref=e16]:
        - generic [ref=e17]: Password *
        - textbox "Password *" [ref=e18]: admin123
      - button "Sign In" [ref=e19] [cursor=pointer]
    - generic [ref=e20]:
      - link "Customer Login" [ref=e21] [cursor=pointer]:
        - /url: /login
      - link "Forgot password?" [ref=e22] [cursor=pointer]:
        - /url: /forgot-password
  - alert [ref=e23]
```
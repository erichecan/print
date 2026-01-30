---
description: Guide to preventing common React runtime errors and ensuring type safety
---

# React Safe Coding & Error Prevention

This skill provides a checklist and best practices to avoid common runtime errors in React applications, particularly those related to data fetching, type safety, and state management.

## 🔴 Common Error: "X is not a function"

**Problem**: Attempting to call a method (like `.map()`, `.toFixed()`, `.toUpperCase()`) on a value that is `undefined`, `null`, or the wrong type (e.g., string instead of number).

**Example**:
```javascript
// Crash if price is undefined, null, or a string
<div>${price.toFixed(2)}</div> 
```

**Solution**: Defensive Coding & Casting
```javascript
// Safe: Null check + Number casting
<div>${Number(price ?? 0).toFixed(2)}</div>
```

### Checklist
1.  **Numbers**: Always cast before doing math or formatting if origin is uncertain (API/User Input).
    *   `Number(value ?? 0).toFixed(2)`
2.  **Arrays**: Always default to empty array before mapping.
    *   `(items || []).map(...)`
3.  **Objects**: Use optional chaining.
    *   `user?.profile?.name`

## 🔴 Common Error: Infinite Re-renders

**Problem**: Updating state inside the render phase or a `useEffect` without proper dependencies.

**Example**:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // 💥 Infinite loop
  return <div>{count}</div>;
}
```

**Solution**:
*   Move side effects to `useEffect` or event handlers.
*   Ensure `useEffect` dependency arrays are correct and complete.

## 🔴 Common Error: Hydration Mismatch

**Problem**: Server-rendered HTML differs from Client-rendered HTML (common with Dates, Random numbers, or `window` access).

**Solution**:
*   Use `useEffect` to set state for client-only values.
*   Avoid using `window` or `document` during initial render.

## 🛡️ Best Practices for API Data

1.  **Never trust the backend blindly**: Even with TypeScript interfaces, runtime data might differ.
2.  **Fallback Values**: Always provide UI fallbacks for loading and empty states.
    ```javascript
    {data?.products?.length > 0 ? (
       data.products.map(...)
    ) : (
       <EmptyState />
    )}
    ```

## 🧪 Self-Correction Questions

Before finishing a task, ask:
*   [ ] Did I handle `null` or `undefined` for all dynamic data points?
*   [ ] Am I calling string methods on potential numbers or vice versa?
*   [ ] Is there a default state for this component if data fails to load?

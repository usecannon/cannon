## Generate JWT token

```bash
API_TOKEN_SECRET=someSecret npx tsx src/scripts/generateToken.ts
```

## Validate JWT token
```bash
API_TOKEN_SECRET=someSecret npx tsx src/scripts/validateToken.ts "someToken"
```
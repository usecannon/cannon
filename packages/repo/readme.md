## Generate JWT token

```bash
API_TOKEN_SECRET=someSecret npx tsx src/scripts/generateToken.ts
```

## Validate JWT token
```bash
API_TOKEN_SECRET=someSecret npx tsx src/scripts/validateToken.ts "someToken"
```

## Test folder upload

1. Start the `repo` service
2. Create a test directory with sample files and subdirectories
3. Compress the directory into a ZIP file
4. Execute the following curl command, replacing `JWT_TOKEN` with your valid token and `testZip.zip` with your generated zip file. 

```bash
 curl -X POST \
  "http://localhost:8081/api/v0/add?wrap-with-directory=true" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@./testZip.zip"
```
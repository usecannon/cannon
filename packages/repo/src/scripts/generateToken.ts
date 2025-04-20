import { generateToken } from '../helpers/tokenUtils';

// Generate and display the token
console.log(generateToken(process.env.API_TOKEN_SECRET as string));

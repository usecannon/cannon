import { verifyToken } from '../helpers/tokenUtils';

const validateToken = () => {
  const token = process.argv[2];
  if (!token) {
    console.error('Error: Token is required');
    process.exit(1);
  }

  try {
    const isValid = verifyToken(token, process.env.API_TOKEN_SECRET as string);

    if (isValid) {
      console.log('Token is valid');
    } else {
      console.log('Token is invalid');
    }
  } catch (error) {
    console.error('Error validating token:', error);
    process.exit(1);
  }
};

validateToken();

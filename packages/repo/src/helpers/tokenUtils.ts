import * as jwt from 'jsonwebtoken';

const oneYear = 60 * 60 * 24 * 365;

export function generateToken(secret: string, expiresInSeconds = oneYear): string {
  const tokenPayload = {};

  return jwt.sign(tokenPayload, secret, { expiresIn: expiresInSeconds });
}

export function verifyToken(token: string, secret: string): Record<string, any> | null {
  try {
    const payload = jwt.verify(token, secret) as Record<string, any>;
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

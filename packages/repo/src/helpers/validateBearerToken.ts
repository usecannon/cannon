import { Response, NextFunction } from 'express';
import { RepoContext, RepoRequest } from '../types';
import { verifyToken } from './tokenUtils';

export function validateBearerToken(req: RepoRequest, res: Response, next: NextFunction, ctx: RepoContext) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' }).end();
  }

  const token = authHeader.split(' ')[1];
  const secret = ctx.config.API_TOKEN_SECRET;

  if (!secret) {
    console.error('API_TOKEN_SECRET environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' }).end();
  }

  const payload = verifyToken(token, secret);

  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired token' }).end();
  }

  next();
}

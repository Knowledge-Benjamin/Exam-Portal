import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { registerUser } from '../services/authService';
import { registerSchema } from '../utils/validators';

const router = Router();

// Middleware to verify HMAC signature from ERP
const requireERPSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-erp-signature'] as string;
  if (!signature) {
    res.status(401).json({ error: 'Missing ERP webhook signature' });
    return;
  }

  // Use the same shared secret used for pushing to ERP
  if (!env.ERP_WEBHOOK_SECRET) {
    res.status(500).json({ error: 'ERP_WEBHOOK_SECRET is not configured on Exam Portal' });
    return;
  }

  // req.body needs to be stringified for HMAC. 
  // In a real production setup, rawBody should be used, but since we control both ends
  // we can use stringified body if the keys are ordered predictably, or capture rawBody.
  // For simplicity, we'll capture rawBody in app.ts or just stringify the parsed body for now.
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', env.ERP_WEBHOOK_SECRET).update(rawBody).digest('hex');
  
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) {
      res.status(401).json({ error: 'Invalid ERP webhook signature' });
      return;
    }
  } catch (err) {
    res.status(401).json({ error: 'Signature verification failed' });
    return;
  }
  next();
};

/**
 * POST /api/webhooks/provision-teacher
 * 
 * Called by the ERP when a new teacher is created in the ERP.
 * Provisions an equivalent account in the Exam Portal so the teacher
 * can log in and create exams.
 */
router.post(
  '/provision-teacher',
  requireERPSignature,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate with the existing register schema
      const data = registerSchema.parse(req.body);
      
      // Enforce teacher role just in case
      if (data.role !== 'teacher' && data.role !== 'admin') {
        res.status(400).json({ error: 'Only teacher or admin roles can be provisioned via webhook.' });
        return;
      }

      const user = await registerUser(data);
      res.status(201).json({ success: true, user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

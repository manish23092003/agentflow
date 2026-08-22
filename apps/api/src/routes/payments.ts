import { Router, Request, Response } from 'express';
import { PrismaPaymentRepository } from '../db/PaymentHistory.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const db = new PrismaPaymentRepository();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const payments = await db.getPayments(userId);
    res.json(payments);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { PrismaPaymentRepository } from '../db/PaymentHistory.js';

const router = Router();
const db = new PrismaPaymentRepository();

router.get('/', async (req: Request, res: Response) => {
  try {
    const payments = await db.getPayments();
    // Sort descending by timestamp
    payments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(payments);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;

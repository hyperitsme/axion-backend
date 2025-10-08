import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { prisma } from './db.js';
import { quote } from './quoteService.js';
import { emitMessageUpdate, initWS } from './ws.js';
import { z } from 'zod';

dotenv.config();

const app = express();
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(
  cors({
    origin:
      (process.env.CORS_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean) || '*',
  })
);

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
initWS(io);

// Health
app.get('/health', (_: Request, res: Response) => res.json({ ok: true, ts: Date.now() }));

// Quote
const QuoteSchema = z.object({
  fromChain: z.string(),
  toChain: z.string(),
  token: z.string(),
  amount: z.coerce.number().positive(),
  type: z.enum(['fixed', 'float']),
});

app.post('/v1/quote', async (req: Request, res: Response) => {
  const p = QuoteSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const result = await quote(p.data as any);
  return res.json(result);
});

// Orders
const OrderSchema = QuoteSchema.extend({
  recipient: z.string().min(4),
  sender: z.string().optional(),
});

app.post('/v1/orders', async (req: Request, res: Response) => {
  const p = OrderSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });

  const b = p.data;
  const messageId = 'axn_' + Math.random().toString(36).slice(2);

  await prisma.message.create({
    data: {
      messageId,
      srcChain: b.fromChain,
      dstChain: b.toChain,
      token: b.token,
      amount: b.amount,
      sender: b.sender || 'unknown',
      recipient: b.recipient,
      status: 'INITIATED',
    },
  });

  res.json({
    orderId: messageId,
    deposit: { chain: b.fromChain, address: 'DEPOSIT_' + b.fromChain.toUpperCase() },
  });

  emitMessageUpdate(io, messageId);
});

// Order detail
app.get('/v1/orders/:id', async (req: Request, res: Response) => {
  const m = await prisma.message.findUnique({ where: { messageId: req.params.id } });
  if (!m) return res.status(404).json({ error: 'not found' });
  res.json({ status: m.status, srcTx: m.srcTx, dstTx: m.dstTx, message: m });
});

// Messages
app.get('/v1/messages', async (req: Request, res: Response) => {
  const { status, src, dst, q, limit = '100' } = req.query as any;
  const where: any = {};
  if (status) where.status = String(status).toUpperCase();
  if (src) where.srcChain = String(src);
  if (dst) where.dstChain = String(dst);
  if (q)
    where.OR = [
      { sender: { contains: String(q) } },
      { recipient: { contains: String(q) } },
      { messageId: { contains: String(q) } },
    ];

  const items = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Number(limit) || 100,
  });

  res.json({ items });
});

// Metrics
app.get('/v1/metrics/overview', async (_: Request, res: Response) => {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const total = await prisma.message.count({ where: { createdAt: { gte: since } } });
  const finalized = await prisma.message.count({
    where: { createdAt: { gte: since }, status: 'FINALIZED' },
  });
  res.json({ tx24h: total, successRate: total ? finalized / total : 0, p50: 80, p95: 120, alerts24h: 0 });
});

app.get('/v1/routes', async (_: Request, res: Response) => {
  res.json({ items: await prisma.route.findMany() });
});

app.get('/v1/validators', async (_: Request, res: Response) => {
  res.json({ items: await prisma.validator.findMany() });
});

// Simulator
async function simulator() {
  const pending = await prisma.message.findMany({
    where: { status: { in: ['INITIATED', 'ATTESTED'] } },
  });
  for (const m of pending) {
    const age = Date.now() - m.createdAt.getTime();
    if (age > 15000) {
      await prisma.message.update({
        where: { id: m.id },
        data: { status: 'ATTESTED', srcTx: m.srcTx || 'SRC_' + m.messageId },
      });
      emitMessageUpdate(io, m.messageId);
    }
    if (age > 35000) {
      await prisma.message.update({
        where: { id: m.id },
        data: { status: 'FINALIZED', dstTx: m.dstTx || 'DST_' + m.messageId },
      });
      emitMessageUpdate(io, m.messageId);
    }
  }
  setTimeout(simulator, 5000);
}
simulator();

const PORT = Number(process.env.PORT || 8080);
httpServer.listen(PORT, () => console.log('🚀 Axion API running on :' + PORT));

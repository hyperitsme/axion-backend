import type { Server } from 'socket.io';
import { prisma } from './db.js';
export function initWS(io:Server){ io.on('connection',s=>s.emit('hello',{ok:true})); }
export async function emitMessageUpdate(io:Server, messageId:string){ const msg=await prisma.message.findUnique({where:{messageId}}); if(msg) io.emit('message.update', msg); }

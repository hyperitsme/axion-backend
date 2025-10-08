import { QuoteRequest } from './types.js';
const PRICES: Record<string, number> = { SOL:170, ETH:3500, USDC:1, BNB:600, MATIC:0.8 };
const DEFAULTS: Record<string,{token:string}> = { solana:{token:'SOL'}, ethereum:{token:'ETH'}, base:{token:'ETH'}, bnb:{token:'BNB'}, polygon:{token:'MATIC'} };
export function quote(q: QuoteRequest){ const ft=DEFAULTS[q.fromChain?.toLowerCase()]?.token||q.token; const tt=DEFAULTS[q.toChain?.toLowerCase()]?.token||q.token; const pu=PRICES[ft]??1; const qu=PRICES[tt]??1; const gross=q.amount*(pu/qu); const fee=q.type==='fixed'?0.01:0.005; return { amountOut: gross*(1-fee), feeUsd: q.amount*pu*fee, etaSeconds: q.fromChain?.toLowerCase()==='solana'?40:90 } }

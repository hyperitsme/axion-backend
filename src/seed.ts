import { prisma } from './db.js';
async function main(){
 const routes=[{srcChain:'solana',dstChain:'ethereum',token:'USDC',feeBps:10,paused:false,p95Sec:95},{srcChain:'solana',dstChain:'base',token:'USDC',feeBps:9,paused:false,p95Sec:70},{srcChain:'solana',dstChain:'bnb',token:'USDC',feeBps:12,paused:false,p95Sec:110},{srcChain:'solana',dstChain:'polygon',token:'USDC',feeBps:10,paused:false,p95Sec:80}];
 for(const r of routes){ await prisma.route.upsert({ where:{ id:`${r.srcChain}_${r.dstChain}_${r.token}` }, update:r, create:{ id:`${r.srcChain}_${r.dstChain}_${r.token}`, ...r } }); }
 const vals=[{name:'val-1',region:'US',quorum:98,missed:0.8,epoch:12,health:'ok'},{name:'val-2',region:'EU',quorum:97,missed:1.2,epoch:12,health:'ok'},{name:'val-3',region:'APAC',quorum:95,missed:3.1,epoch:12,health:'warn'}];
 for(const v of vals){ await prisma.validator.upsert({ where:{ id:v.name }, update:v, create:{ id:v.name, ...v } }); }
 console.log('Seeded.'); }
main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });

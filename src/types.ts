export type QuoteRequest = { fromChain:string; toChain:string; token:string; amount:number; type:'fixed'|'float'};
export type OrderRequest = QuoteRequest & { recipient:string; sender?:string };

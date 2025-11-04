
import { EventQueue } from './eventQueue.js';
import { QualityCheck } from './components/QualityCheck.js';
import { Rework } from './components/Rework.js';
import { Conveyor } from './components/Conveyor.js';
import { Maintenance } from './components/Maintenance.js';
import { Statistics } from './Statistics.js';

function mulberry32(seed) { let t = seed >>> 0; return function(){ t += 0x6D2B79F5; let r = Math.imul(t ^ (t>>>15), 1|t); r ^= r + Math.imul(r ^ (r>>>7), 61|r); return ((r ^ (r>>>14))>>>0)/4294967296; }; }
function sampleDist(dist, rng){ if(!dist||!dist.type) return 0; const u=rng(); switch(dist.type){case 'Exponential':{const mean=Number(dist.mean??1); return -mean*Math.log(1-u);} case 'Uniform':{const a=Number(dist.min??0); const b=Number(dist.max??1); return a+(b-a)*u;} case 'Triangular':{const a=Number(dist.min??0); const b=Number(dist.max??1); const c=Number(dist.mode??(a+b)/2); const F=(c-a)/(b-a); if(u<F) return a+Math.sqrt(u*(b-a)*(c-a)); return b-Math.sqrt((1-u)*(b-a)*(b-c));} default:return 0;} }
export class Engine {
  constructor(callbacks={}){
    this.onState=callbacks.onState||(()=>{});
    this.onMetric=callbacks.onMetric||(()=>{});
    this.onLog=callbacks.onLog||(()=>{});
    this.onError=callbacks.onError||(()=>{});
    this.onEntityMove=callbacks.onEntityMove||(()=>{});
    this.eq=new EventQueue(); this.simTime=0; this.running=false; this._tickHandle=null;
    this.model=null; this.stopAt=3600; this.rng=Math.random; this.metrics={throughput:0}; this.series=[];
    this.defs=new Map(); this.links=[]; this.adj=new Map(); this.rev=new Map(); this.sinks=new Set(); this.generators=[];
    this.buffers=new Map(); this.workstations=new Map(); this.quality=new Map(); this.reworks=new Map(); this.conveyors=new Map(); this.maint=new Map();
    this.stats=new Statistics(); this._moveId=0;
  }
  loadModel(model){ this.reset(); this.model=model||{}; const g=this.model?.globals||{}; const seed=Number(g?.rng?.seed??1); this.rng=mulberry32(seed); const stopT=Number(g?.stopCondition?.time??3600); this.stopAt=Number.isFinite(stopT)&&stopT>0?stopT:3600;
    const define=this.model?.define||{}; const rawLinks=Array.isArray(this.model?.links)?this.model.links:[]; this.links=rawLinks.map(l=>({from:String(l.from), to:String(l.to), via:l.via?String(l.via):null, condition:l.condition&&typeof l.condition==='object'?l.condition:null}));
    this.adj.clear(); this.rev.clear(); this.defs.clear(); for(const [id,def] of Object.entries(define)) this.defs.set(id,def);
    for(const {from,to} of this.links){ if(!this.adj.has(from)) this.adj.set(from,[]); this.adj.get(from).push(to); if(!this.rev.has(to)) this.rev.set(to,[]); this.rev.get(to).push(from); }
    this.sinks.clear(); this.buffers.clear(); this.workstations.clear(); this.quality.clear(); this.reworks.clear(); this.conveyors.clear(); this.maint.clear();
    for(const [id,def] of Object.entries(define)){ const type=String(def.type); const inputs=def.inputs||{};
      if(type==='EntitySink') this.sinks.add(id);
      if(type==='Buffer'){ const cap=Number(inputs.Capacity??Infinity); this.buffers.set(id,{cap,q:0}); }
      if(type==='Workstation'){ const svcDist=inputs.ServiceTime?.dist||inputs.ServiceTime||null; const m=Number(inputs.m??1); this.workstations.set(id,{busy:0,m,svcDist,inQ:0,down:false,downTime:0}); }
      if(type==='QualityCheck') this.quality.set(id,new QualityCheck(inputs));
      if(type==='Rework') this.reworks.set(id,new Rework(inputs));
      if(type==='Conveyor') this.conveyors.set(id,new Conveyor(inputs));
      if(type==='Maintenance') this.maint.set(id,new Maintenance(inputs));
    }
    for(const [mid,m] of this.maint.entries()){ m.scheduleNextFailure(this.simTime,this.rng,(t,k)=>{ this.eq.push(t,()=>this._onMaintenance(mid,k)); }); }
    this.generators=[]; for(const [id,def] of Object.entries(define)){ if(String(def.type)!=='EntityGenerator') continue; const inputs=def.inputs||{}; const it=inputs.InterarrivalTime; const inter=it&&it.dist?it.dist:{type:'Exponential',mean:1}; if(!this._hasPathToSink(id)){ this.onLog({level:'warn',msg:`Generator ${id} nie ma ścieżki do SNK`,at:Date.now()}); continue; } this.generators.push({id,interarrivalDist:inter}); }
    this.eq=new EventQueue(); for(const g2 of this.generators){ const t=sampleDist(g2.interarrivalDist,this.rng); this.eq.push(t,()=>this._onArrival(g2)); }
    this.onLog({level:'info',msg:`Model loaded. Generators: ${this.generators.length}, stopAt=${this.stopAt}s`,at:Date.now()}); this._emitState();
  }
  _hasPathToSink(start){ const st=[start], seen=new Set(); while(st.length){ const cur=st.pop(); if(!cur||seen.has(cur)) continue; seen.add(cur); if(this.sinks.has(cur)) return true; for(const n of (this.adj.get(cur)||[])) st.push(n);} return false; }
  _firstLink(from){ for(const l of this.links) if(l.from===from) return l; return null; }
  _condLink(from,out){ for(const l of this.links) if(l.from===from&&l.condition&&String(l.condition.expr)===String(out)) return l; return null; }
  _onMaintenance(mid, kind){ const m=this.maint.get(mid); if(!m) return; const target=m.target; if(!target) return; const ws=this.workstations.get(target); if(!ws) return;
    const schedule=(t,k)=>this.eq.push(t,()=>this._onMaintenance(mid,k));
    if(kind==='fail'){ m.handle(this.simTime,'fail',this.rng,schedule); ws.down=true; this.onLog({level:'warn',msg:`Maintenance: ${target} down`,at:Date.now()}); }
    else if(kind==='repair'){ m.handle(this.simTime,'repair',this.rng,schedule); ws.down=false; this.onLog({level:'info',msg:`Maintenance: ${target} repaired`,at:Date.now()}); this._tryStartService(target); }
    this._emitState();
  }
  _onArrival(g){ const link=this._firstLink(g.id); if(link) this._moveThrough(link); const dt=sampleDist(g.interarrivalDist,this.rng); this.eq.push(this.simTime+dt,()=>this._onArrival(g)); }
  _moveThrough(link){ const {to,via}=link; const conv=via?this.conveyors.get(via):null; const dt=conv?conv.transitTime():0; const id=++this._moveId; if(dt>0) this.onEntityMove({id,from:link.from,to,tStart:this.simTime,tEnd:this.simTime+dt}); if(dt>0) this.eq.push(this.simTime+dt,()=>this._pushTo(to)); else this._pushTo(to); }
  _pushTo(id){ const def=this.defs.get(id); if(!def) return; const type=String(def.type);
    if(type==='EntitySink'){ this.metrics.throughput+=1; return; }
    if(type==='Buffer'){ const b=this.buffers.get(id), cap=b?.cap??Infinity; if(b){ if(b.q<cap){ b.q++; this._drainBuffer(id);} else this.onLog({level:'warn',msg:`Buffer ${id} full (q=${b.q}/${cap})`,at:Date.now()}); } else { const l=this._firstLink(id); if(l) this._moveThrough(l);} return; }
    if(type==='Workstation'){ const ws=this.workstations.get(id); if(!ws) return; ws.inQ++; this._tryStartService(id); return; }
    if(type==='QualityCheck'){ const qc=this.quality.get(id); const outcome=qc?qc.decide(this.rng):'ok'; const link=this._condLink(id,outcome)||this._firstLink(id); if(link) this._moveThrough(link); return; }
    if(type==='Rework'){ const rw=this.reworks.get(id); const dt=sampleDist(rw?.serviceDist,this.rng)||0; this.eq.push(this.simTime+dt,()=>{ if(rw) rw.completed++; const l=this._firstLink(id); if(l) this._moveThrough(l); }); return; }
    const link=this._firstLink(id); if(link) this._moveThrough(link);
  }
  _drainBuffer(bufId){ const b=this.buffers.get(bufId); if(!b||b.q<=0) return; const link=this._firstLink(bufId); if(!link) return; const next=this.defs.get(link.to); if(!next) return;
    if(String(next.type)==='Workstation'){ const ws=this.workstations.get(link.to); const free=Math.max(ws.m-ws.busy,0); if(!ws.down && free>0 && b.q>0){ b.q--; ws.inQ++; this._tryStartService(link.to);} return; }
    if(b.q>0){ b.q--; this._moveThrough(link); }
  }
  _tryStartService(wsId){ const ws=this.workstations.get(wsId); if(!ws) return; if(ws.down) return;
    while(!ws.down && ws.inQ>0 && ws.busy<ws.m){ ws.inQ--; ws.busy++; const dt=sampleDist(ws.svcDist,this.rng)||0; this.eq.push(this.simTime+dt,()=>this._onServiceDone(wsId)); }
  }
  _onServiceDone(wsId){ const ws=this.workstations.get(wsId); if(ws && ws.busy>0) ws.busy--; this._tryStartService(wsId); const link=this._firstLink(wsId); if(link) this._moveThrough(link); for(const from of (this.rev.get(wsId)||[])) if(this.buffers.has(from)) this._drainBuffer(from); }
  start(){ if(this.running) return; this.running=true; const realTickMs=50, simStepSec=1;
    this._tickHandle=setInterval(()=>{ if(!this.running) return; this.simTime+=simStepSec;
      while(true){ const next=this.eq.peekTime(); if(next==null||next>this.simTime) break; const ev=this.eq.pop(); try{ ev.callback(); }catch(e){ this.onError(e);} }
      this._emitState(); this._emitMetrics();
      if(this.simTime>=this.stopAt){ this.pause(); for(const m of this.maint.values()) m.end(this.simTime); this.onLog({level:'info',msg:`Stop condition reached (t=${this.simTime}s)`,at:Date.now()}); }
    }, realTickMs);
    this.onLog({level:'info',msg:'Simulation started',at:Date.now()}); this._emitState();
  }
  runToEnd(){ while(this.simTime<this.stopAt){ const next=this.eq.peekTime(); if(next==null) break; this.simTime=next; const ev=this.eq.pop(); try{ ev.callback(); }catch(e){} this._emitState(); this._emitMetrics(); } for(const m of this.maint.values()) m.end(this.simTime); return this._currentKPIs(); }
  reset(){ if(this._tickHandle) clearInterval(this._tickHandle); this._tickHandle=null; this.eq=new EventQueue(); this.simTime=0; this.running=false; this.metrics={throughput:0}; this.series=[]; this.stats=new Statistics(); for(const qc of this.quality.values()) qc.reset?.(); }
  applyParam(id,key,value){ const def=this.defs.get(id); if(!def) throw new Error(`Unknown component: ${id}`); def.inputs=def.inputs||{}; def.inputs[key]=value;
    if(def.type==='Buffer' && key==='Capacity'){ const b=this.buffers.get(id); if(b) b.cap=Number(value); }
    if(def.type==='Workstation' && key==='ServiceTime'){ const ws=this.workstations.get(id); if(ws) ws.svcDist=value?.dist||value||ws.svcDist; }
    if(def.type==='QualityCheck' && key==='RejectProb'){ const qc=this.quality.get(id); if(qc) qc.rejectProb=Number(value); }
    if(def.type==='Conveyor'){ const c=this.conveyors.get(id); if(c && (key==='length'||key==='Length')) c.length=Number(value); if(c && (key==='speed'||key==='Speed')) c.speed=Number(value); }
  }
  _emitState(){ const components={};
    for(const [id,b] of this.buffers.entries()) components[id]={type:'Buffer', q:b.q, cap:b.cap};
    for(const [id,w] of this.workstations.entries()) components[id]={type:'Workstation', busy:w.busy, m:w.m, inQ:w.inQ, down:w.down||false};
    for(const [id,q] of this.quality.entries()) components[id]={...(components[id]||{}), type:'QualityCheck', ok:q.stats.ok, nok:q.stats.nok};
    for(const [id,r] of this.reworks.entries()) components[id]={...(components[id]||{}), type:'Rework', completed:r.completed};
    for(const [id,c] of this.conveyors.entries()) components[id]={...(components[id]||{}), type:'Conveyor', length:c.length, speed:c.speed};
    for(const [id,m] of this.maint.entries()) components[id]={...(components[id]||{}), type:'Maintenance', target:m.target, down:m.down, downtime:m.downtime};
    this.onState({ simTime:this.simTime, running:this.running, components });
    this.stats.step(this.simTime, components);
  }
  _currentKPIs(){ const k=this.stats.snapshotAverages(this.simTime); let downtime=0; for(const m of this.maint.values()) downtime+=m.downtime; const A=this.simTime>0?Math.max(0,1-(downtime/this.simTime)):1; const P=Math.min(1,k.Util_avg); const Q=Math.max(0,1 - k.Scrap_rate); const OEE=A*P*Q; return {A,P,Q,OEE, ...k, throughput:this.metrics.throughput, t:this.simTime}; }
  _emitMetrics(){ const k=this._currentKPIs(); const payload=[
    {name:'throughput_cum', t:this.simTime, v:this.metrics.throughput},
    {name:'WIP_avg', t:this.simTime, v:k.WIP_avg},
    {name:'Util_avg', t:this.simTime, v:k.Util_avg},
    {name:'Scrap_rate', t:this.simTime, v:1-k.Q},
    {name:'OEE_A', t:this.simTime, v:k.A},
    {name:'OEE_P', t:this.simTime, v:k.P},
    {name:'OEE_Q', t:this.simTime, v:k.Q},
    {name:'OEE', t:this.simTime, v:k.OEE},
  ]; this.series.push(...payload); this.onMetric(payload); }
}

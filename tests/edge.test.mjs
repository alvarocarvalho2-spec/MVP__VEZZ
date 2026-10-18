import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../supabase/functions/accept-clinic-invite/handler.ts';

function fixture(options={}) {
  const state={used:false,users:[],deleted:[],completed:0,manager:null};
  const invite={id_convite:'invite',token:'test-token',criado_em:new Date().toISOString(),solicitacao_clinica:{status:'Aprovada',nome_clinica:'Clínica QA',email_responsavel:'owner@example.test',cnpj:'private'}};
  const client={auth:{getUser:async token=>({data:{user:token==='principal'?{email:'manager@example.test'}:null}}),admin:{
    createUser:async data=>{if(options.authFail)return {error:{message:'SECRET_AUTH'}};await new Promise(resolve=>setTimeout(resolve,10));state.users.push(data);return {data:{user:{id:'user'}}};},
    deleteUser:async id=>{state.deleted.push(id);return {error:options.cleanupFail?{message:'failed'}:null};},
  }},rpc:async()=>{if(options.networkFail)throw Error('Lost response');if(options.rpcFail)return {error:{message:'SECRET_SQL'}};state.completed++;return {data:'clinic'};},from(table){
    let action='select',patch,filters={};
    const chain={select(){return chain;},eq(key,value){filters[key]=value;return chain;},gt(){return chain;},
      update(value){action='update';patch=value;return chain;},insert(value){action='insert';patch=value;return chain;},
      async maybeSingle(){return run();},then(resolve,reject){return Promise.resolve(run()).then(resolve,reject);}};
    function run(){
      if(table==='gestor'){
        if(action==='insert'){state.manager=patch;return options.rpcFail?{error:{message:'SECRET_SQL'}}:{data:null};}
        return {data:options.secondary?null:{id_clinica:'clinic'}};
      }
      if(action==='update'){
        if(filters.usado===false&&state.used)return {data:null};
        state.used=patch.usado;return {data:{id_convite:'invite'}};
      }
      return {data:options.invalid||state.used?null:invite};
    }
    return chain;
  }};
  return {state,handler:createHandler(()=>client)};
}
const body={nome:'Gestor Teste',email:'owner@example.test',senha:'ValidPassword123'};
const request=(data=body,query='token=test-token',method='POST',headers={})=>new Request('https://edge.example.test/?'+query,{method,headers:{'Content-Type':'application/json',...headers},body:['GET','OPTIONS'].includes(method)?undefined:JSON.stringify(data)});

test('invite GET returns only necessary fields and no-store',async()=>{const {handler}=fixture();const r=await handler(request(null,'token=test-token','GET'));assert.equal(r.status,200);assert.deepEqual(Object.keys((await r.json()).request).sort(),['email_responsavel','nome_clinica']);assert.equal(r.headers.get('cache-control'),'no-store');});
for(const method of ['PUT','DELETE','PATCH'])test(`rejects ${method}`,async()=>assert.equal((await fixture().handler(request(body,'token=test-token',method))).status,405));
test('rejects invalid token and wrong recipient before creating Auth user',async()=>{
  assert.equal((await fixture({invalid:true}).handler(request())).status,404);
  const {handler,state}=fixture();assert.equal((await handler(request({...body,email:'attacker@example.test'}))).status,403);assert.equal(state.users.length,0);
});
test('validation rejects short password, invalid email and oversized body',async()=>{
  for(const data of [{...body,senha:'123'},{...body,email:'x'},{...body,nome:'X'},{...body,nome:'x'.repeat(17000)}])assert.ok((await fixture().handler(request(data))).status>=400);
});
test('concurrent invite redemption creates only one user and clinic',async()=>{
  const {handler,state}=fixture();const responses=await Promise.all([handler(request()),handler(request())]);assert.deepEqual(responses.map(x=>x.status).sort(),[200,409]);assert.equal(state.users.length,1);assert.equal(state.completed,1);assert.equal(state.used,true);
});
test('database failure deletes new Auth user and releases invite, without leaking errors',async()=>{
  const {handler,state}=fixture({rpcFail:true});const r=await handler(request());assert.equal(r.status,400);assert.deepEqual(state.deleted,['user']);assert.equal(state.used,false);assert.ok(!(await r.text()).includes('SECRET'));
});
test('failed compensation keeps invite locked for manual recovery',async()=>{const {handler,state}=fixture({rpcFail:true,cleanupFail:true});await handler(request());assert.equal(state.used,true);});
test('ambiguous transaction response never deletes potentially committed Auth user',async()=>{const {handler,state}=fixture({networkFail:true});await handler(request());assert.equal(state.used,true);assert.deepEqual(state.deleted,[]);});
test('Auth failure releases invite without deleting pre-existing users',async()=>{const {handler,state}=fixture({authFail:true});await handler(request());assert.equal(state.used,false);assert.equal(state.deleted.length,0);});
test('additional manager requires authenticated principal and same clinic',async()=>{
  assert.equal((await fixture().handler(request(body,'action=create-manager'))).status,401);
  assert.equal((await fixture({secondary:true}).handler(request(body,'action=create-manager','POST',{Authorization:'Bearer principal'}))).status,403);
  assert.equal((await fixture().handler(request({...body,id_clinica:'other'},'action=create-manager','POST',{Authorization:'Bearer principal'}))).status,403);
});
test('additional manager is non-principal and keeps current user session',async()=>{
  const {handler,state}=fixture();assert.equal((await handler(request({...body,id_clinica:'clinic'},'action=create-manager','POST',{Authorization:'Bearer principal'}))).status,200);assert.equal(state.manager.principal,false);assert.equal(state.manager.id_clinica,'clinic');
});

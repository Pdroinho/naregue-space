import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { professionalReadDatabase, readScopeId } from './professionalReadScope.js'
import type { Request } from 'express'

test('professional projections scope joins and union branches without changing the shared connection',()=>{
  const db=new Database(':memory:')
  try {
    db.exec(`CREATE TABLE appointments(id TEXT,tenant_id TEXT,professional_id TEXT,client_user_id TEXT);
      CREATE TABLE cash_transactions(id TEXT,professional_id TEXT,amount_cents INTEGER);
      CREATE TABLE clients(id TEXT,tenant_id TEXT,user_id TEXT);
      INSERT INTO appointments VALUES('a','tenant','one','c1'),('b','tenant','two','c2');
      INSERT INTO cash_transactions VALUES('x','one',100),('y','two',200);
      INSERT INTO clients VALUES('c1','tenant','c1'),('c2','tenant','c2');`)
    const one=professionalReadDatabase(db,'one'),two=professionalReadDatabase(db,'two')
    assert.deepEqual(one.prepare('SELECT id FROM appointments WHERE tenant_id=?').all('tenant'),[{id:'a'}])
    assert.deepEqual(two.prepare('SELECT id FROM appointments WHERE tenant_id=?').all('tenant'),[{id:'b'}])
    assert.deepEqual(one.prepare('SELECT c.id FROM clients c JOIN appointments a ON a.client_user_id=c.user_id').all(),[{id:'c1'}])
    assert.equal(one.prepare('SELECT id FROM appointments UNION ALL SELECT id FROM cash_transactions').all().length,2)
    assert.equal(db.prepare('SELECT id FROM appointments').all().length,2)
    assert.deepEqual(one.prepare('SELECT 7 value').get(),{value:7})
  } finally{db.close()}
})
test('a professional from another tenant and SQL-like scope input are rejected before querying reports',()=>{
  const db=new Database(':memory:')
  try{
    db.exec('CREATE TABLE professionals(id TEXT,tenant_id TEXT)')
    const id='11111111-1111-4111-8111-111111111111'
    db.prepare('INSERT INTO professionals VALUES(?,?)').run(id,'other')
    const req={method:'GET',query:{professionalId:id},sessionUser:{tenantId:'mine'}} as unknown as Request
    assert.throws(()=>readScopeId(db,req),/neste espaço/)
    req.query.professionalId="' OR 1=1 --";assert.throws(()=>readScopeId(db,req))
  }finally{db.close()}
})

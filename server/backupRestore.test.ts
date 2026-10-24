import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import Database from 'better-sqlite3'

test('online backup includes WAL commits; authenticated encryption round-trips and rejects tampering',async()=>{
  const directory=mkdtempSync(path.join(tmpdir(),'naregua-backup-'))
  const db=new Database(path.join(directory,'live.db'));db.pragma('journal_mode=WAL')
  try{
    db.exec("CREATE TABLE records(value TEXT);INSERT INTO records VALUES('committed in WAL')")
    const backup=path.join(directory,'backup.db'),encrypted=path.join(directory,'backup.enc'),restored=path.join(directory,'restored.db')
    await db.backup(backup)
    const options={env:{...process.env,BACKUP_ENCRYPTION_KEY:randomBytes(32).toString('base64url')},encoding:'utf8' as const}
    assert.equal(spawnSync(process.execPath,['deploy/backup-crypto.mjs','encrypt',backup,encrypted],options).status,0)
    assert.equal(spawnSync(process.execPath,['deploy/backup-crypto.mjs','decrypt',encrypted,restored],options).status,0)
    const copy=new Database(restored,{readonly:true});assert.deepEqual(copy.prepare('SELECT value FROM records').get(),{value:'committed in WAL'});copy.close()
    const bytes=readFileSync(encrypted);bytes[20]^=1;writeFileSync(encrypted,bytes)
    assert.notEqual(spawnSync(process.execPath,['deploy/backup-crypto.mjs','decrypt',encrypted,path.join(directory,'tampered.db')],options).status,0)
  }finally{db.close();rmSync(directory,{recursive:true,force:true})}
})

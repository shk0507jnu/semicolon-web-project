import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync, createHash } from 'node:crypto';
import { hashPassword, pbkdf2Sha256Js, sha256, verifyPassword } from './password.mjs';
import { createLocalDb, DB_STORAGE_KEY } from './localDb.mjs';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const enc = s => new TextEncoder().encode(s);
const hex = b => Buffer.from(b).toString('hex');

test('pure JS SHA-256 / PBKDF2 match Node crypto (used when Web Crypto is missing)', () => {
  for (const s of ['', 'abc', '한글 비밀번호', 'x'.repeat(200)]) assert.equal(hex(sha256(enc(s))), createHash('sha256').update(s).digest('hex'));
  const salt = enc('salt-123');
  assert.equal(hex(pbkdf2Sha256Js(enc('pw'), salt, 1000)), pbkdf2Sync('pw', salt, 1000, 32, 'sha256').toString('hex'));
});

test('password hash never stores the original and verifies correctly', async () => {
  const stored = await hashPassword('secret123', { iterations: 1000 });
  assert.match(stored, /^pbkdf2_sha256\$1000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.ok(!stored.includes('secret123'));
  assert.equal(await verifyPassword('secret123', stored), true);
  assert.equal(await verifyPassword('secret124', stored), false);
  assert.notEqual(stored, await hashPassword('secret123', { iterations: 1000 })); // 소금이 달라서 매번 다름
});

test('seed follows the received DB (2 users, no login accounts)', () => {
  const s = memory(); const db = createLocalDb(s).snapshot();
  assert.deepEqual(db.users.map(u => u.name), ['홍길동', '관리자']);
  assert.equal(db.auth_accounts.length, 0);
  assert.ok(s.getItem(DB_STORAGE_KEY));
});

test('sign up → log in; unknown email and wrong password are rejected', async () => {
  let clock = new Date('2026-11-19T00:00:00Z');
  const s = memory(); const db = createLocalDb(s, { now: () => clock });
  assert.equal((await db.logIn({ email: 'ro@jnu.ac.kr', password: 'password1' })).code, 'not_found');
  const su = await db.signUp({ name: ' 이로운 ', email: ' Ro@JNU.ac.kr ', password: 'password1', termsAccepted: true });
  assert.equal(su.ok, true); assert.equal(su.user.id, 3); assert.equal(su.user.email, 'ro@jnu.ac.kr'); assert.equal(su.user.name, '이로운');
  assert.equal((await db.signUp({ name: 'x', email: 'ro@jnu.ac.kr', password: 'password1', termsAccepted: true })).code, 'duplicate');
  assert.equal((await db.signUp({ name: 'x', email: 'a@b.co', password: 'short', termsAccepted: true })).code, 'password');
  assert.equal((await db.signUp({ name: 'x', email: 'a@b.co', password: 'password1', termsAccepted: false })).code, 'terms');
  assert.equal((await db.logIn({ email: 'ro@jnu.ac.kr', password: 'wrong-pass' })).code, 'wrong_password');
  const li = await db.logIn({ email: 'RO@jnu.ac.kr', password: 'password1', remember: false });
  assert.equal(li.ok, true); assert.equal(li.user.name, '이로운');
  assert.equal(db.userForToken(li.token).id, 3);
  const raw = s.getItem(DB_STORAGE_KEY);
  assert.ok(!raw.includes('password1') && !raw.includes(li.token), 'no plain password or token in storage');
  clock = new Date(clock.getTime() + 13 * 3600 * 1000); // 로그인 유지 안 함 = 12시간 뒤 만료
  assert.equal(db.userForToken(li.token), null);
  const keep = await db.logIn({ email: 'ro@jnu.ac.kr', password: 'password1', remember: true });
  clock = new Date(clock.getTime() + 29 * 24 * 3600 * 1000);
  assert.equal(db.userForToken(keep.token).id, 3);
  db.logOut(keep.token);
  assert.equal(db.userForToken(keep.token), null);
});

test('my page: profile, notification settings and password change persist', async () => {
  const s = memory(); const db = createLocalDb(s);
  const { user } = await db.signUp({ name: '이로운', email: 'ro@a.kr', password: 'password1', termsAccepted: true });
  const a = await db.logIn({ email: 'ro@a.kr', password: 'password1' });
  const b = await db.logIn({ email: 'ro@a.kr', password: 'password1' });
  assert.equal(db.updateProfile(user.id, { name: '로운', phone: '010-1234-5678' }).user.phone, '010-1234-5678');
  assert.equal(db.updateProfile(user.id, { name: '  ', phone: '' }).code, 'name');
  db.updateNotificationSettings(user.id, { announcement: false });
  const again = createLocalDb(s); // 새로고침한 것처럼 다시 열기
  assert.equal(again.userForToken(a.token).name, '로운');
  assert.deepEqual(again.getNotificationSettings(user.id), { shiftChange: true, substituteRequest: true, announcement: false });
  assert.equal((await again.changePassword(user.id, { current: 'nope', next: 'newpass99' })).code, 'wrong_password');
  assert.equal((await again.changePassword(user.id, { current: 'password1', next: 'newpass99', keepToken: a.token })).ok, true);
  assert.equal(again.userForToken(a.token).id, user.id); // 지금 기기는 유지
  assert.equal(again.userForToken(b.token), null);       // 다른 기기는 로그아웃
  assert.equal((await again.logIn({ email: 'ro@a.kr', password: 'password1' })).code, 'wrong_password');
  assert.equal((await again.logIn({ email: 'ro@a.kr', password: 'newpass99' })).ok, true);
});

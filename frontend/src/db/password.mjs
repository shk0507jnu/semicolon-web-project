// 비밀번호 해시 (오프라인 로컬 DB용)
// 비밀번호는 원문으로 저장하지 않고, 되돌릴 수 없는 '해시'로 바꿔서 저장해.
// 로그인할 때는 입력한 비밀번호를 같은 방법으로 해시해서 저장된 값과 같은지만 비교해.
//
// 방식: PBKDF2-HMAC-SHA256 (소금(salt) 16바이트, 10만 번 반복)
//  - 브라우저 내장 암호화(Web Crypto)가 있으면 그걸 쓰고,
//  - 없으면(휴대폰에서 http://192.168.x.x 처럼 '보안 연결이 아닌' 주소로 열 때) 아래 순수 JS 구현으로 같은 값을 계산해.
// 저장 형식: 'pbkdf2_sha256$100000$<salt hex>$<hash hex>'
//
// 참고: 백엔드에서 받은 DB 설계는 'scrypt$...' 형식이야. scrypt 는 브라우저 기본 기능에 없어서
// 오프라인 단계에서는 PBKDF2 를 쓰고, 서버로 옮길 때 서버가 다음 로그인에서 scrypt 로 다시 저장하면 돼.

export const PASSWORD_ITERATIONS = 100_000;
const PREFIX = 'pbkdf2_sha256';

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));
const utf8 = (text) => new TextEncoder().encode(text.normalize('NFC'));

// ---------- 순수 JS SHA-256 / HMAC / PBKDF2 (Web Crypto 가 없을 때만 사용) ----------
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const W = new Uint32Array(64);

function compress(state, block, offset) {
  for (let i = 0; i < 16; i++) {
    const j = offset + i * 4;
    W[i] = (block[j] << 24) | (block[j + 1] << 16) | (block[j + 2] << 8) | block[j + 3];
  }
  for (let i = 16; i < 64; i++) {
    const a = W[i - 15], b = W[i - 2];
    const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
    const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
    W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
  }
  let [a, b, c, d, e, f, g, h] = state;
  for (let i = 0; i < 64; i++) {
    const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
    const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
    h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
  }
  state[0] = (state[0] + a) | 0; state[1] = (state[1] + b) | 0; state[2] = (state[2] + c) | 0; state[3] = (state[3] + d) | 0;
  state[4] = (state[4] + e) | 0; state[5] = (state[5] + f) | 0; state[6] = (state[6] + g) | 0; state[7] = (state[7] + h) | 0;
}

export function sha256(bytes) {
  const len = bytes.length;
  const total = Math.ceil((len + 9) / 64) * 64;
  const padded = new Uint8Array(total);
  padded.set(bytes);
  padded[len] = 0x80;
  const bits = len * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(total - 8, Math.floor(bits / 2 ** 32));
  view.setUint32(total - 4, bits >>> 0);
  const state = IV.slice();
  for (let i = 0; i < total; i += 64) compress(state, padded, i);
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  state.forEach((v, i) => outView.setUint32(i * 4, v >>> 0));
  return out;
}

function hmacFactory(key) {
  const block = new Uint8Array(64);
  block.set(key.length > 64 ? sha256(key) : key);
  const ipad = block.map((b) => b ^ 0x36);
  const opad = block.map((b) => b ^ 0x5c);
  return (message) => {
    const inner = new Uint8Array(64 + message.length);
    inner.set(ipad); inner.set(message, 64);
    const outer = new Uint8Array(96);
    outer.set(opad); outer.set(sha256(inner), 64);
    return sha256(outer);
  };
}

export function pbkdf2Sha256Js(password, salt, iterations, length = 32) {
  const hmac = hmacFactory(password);
  const out = new Uint8Array(length);
  for (let blockIndex = 1, pos = 0; pos < length; blockIndex++) {
    const first = new Uint8Array(salt.length + 4);
    first.set(salt);
    new DataView(first.buffer).setUint32(salt.length, blockIndex);
    let u = hmac(first);
    const t = u.slice();
    for (let i = 1; i < iterations; i++) {
      u = hmac(u);
      for (let j = 0; j < 32; j++) t[j] ^= u[j];
    }
    out.set(t.subarray(0, Math.min(32, length - pos)), pos);
    pos += 32;
  }
  return out;
}

// ---------- 공개 함수 ----------
async function derive(passwordBytes, salt, iterations) {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      const key = await subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits']);
      const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
      return new Uint8Array(bits);
    } catch {
      // 일부 환경에서 막혀 있으면 아래 JS 구현으로
    }
  }
  return pbkdf2Sha256Js(passwordBytes, salt, iterations);
}

export function randomBytes(length) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(bytes);
  // crypto 가 없는 아주 예외적인 환경 (오프라인 시연 전용)
  for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

export async function hashPassword(password, { iterations = PASSWORD_ITERATIONS, salt = randomBytes(16) } = {}) {
  const hash = await derive(utf8(password), salt, iterations);
  return `${PREFIX}$${iterations}$${toHex(salt)}$${toHex(hash)}`;
}

// 시간이 일정한 비교 (어디서 달라지는지로 비밀번호를 추측하지 못하게)
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password, stored) {
  const [prefix, iter, saltHex, hashHex] = String(stored || '').split('$');
  if (prefix !== PREFIX || !iter || !saltHex || !hashHex) return false;
  const actual = await derive(utf8(password), fromHex(saltHex), Number(iter));
  return sameBytes(actual, fromHex(hashHex));
}

// 로그인 유지 토큰은 원문 대신 SHA-256 값만 DB(auth_sessions.token_hash)에 저장해
export const tokenHash = (token) => toHex(sha256(utf8(token)));
export const newToken = () => toHex(randomBytes(32));

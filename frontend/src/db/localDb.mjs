// 오프라인 로컬 DB (회원가입 · 로그인 · 내 정보)
//
// 서버 없이 브라우저 저장공간(localStorage)에 JSON 하나로 저장해.
// 표(테이블) 모양은 백엔드에서 받은 회원 DB(2026-11-18, SQLite)와 똑같이 맞췄어:
//   users                       사람 정보 (이름 · 이메일 · 연락처 · 상태 · 약관 동의)
//   auth_accounts               로그인 수단 (provider='email' + 비밀번호 해시)
//   auth_sessions               로그인 유지 출입증 (토큰 원문 대신 해시만)
//   user_notification_settings  17 알림 설정 3개
//   workspaces / workspace_members  받은 DB의 기본 데이터 (지금은 참고용으로만 보관)
// 그래서 나중에 진짜 서버가 생기면 이 파일의 함수 안쪽만 API 호출로 바꾸면 돼. (화면 코드는 그대로)
//
// 저장 위치 확인: 브라우저 개발자도구(F12) → Application → Local Storage → 'shiftlink.localDb'
// 주의: 시연용이라 이 브라우저 안에서만 유지되고, 개발자도구로 내용을 볼 수 있어. 실제 배포 전에 서버 DB로 바꿔야 해.

import { hashPassword, newToken, tokenHash, verifyPassword } from './password.mjs';

export const DB_STORAGE_KEY = 'shiftlink.localDb';
export const DB_VERSION = 1;
export const TERMS_VERSION = '2026-11-offline';
export const PASSWORD_MIN_LENGTH = 8;
const DAY = 24 * 60 * 60;
export const SESSION_SECONDS = { remember: 30 * DAY, session: 12 * 60 * 60 };

// 받은 DB 파일에 들어 있던 기본 데이터 그대로 (로그인 계정 auth_accounts 는 0개였어)
const SEED_TIME = '2026-11-18T10:54:49.662Z';
function seed() {
  return {
    version: DB_VERSION,
    users: [
      { id: 1, name: '홍길동', email: null, phone: null, status: 'ACTIVE', created_at: SEED_TIME, updated_at: SEED_TIME, terms_accepted_at: null, terms_version: null, email_verified_at: null },
      { id: 2, name: '관리자', email: null, phone: null, status: 'ACTIVE', created_at: SEED_TIME, updated_at: SEED_TIME, terms_accepted_at: null, terms_version: null, email_verified_at: null },
    ],
    auth_accounts: [],
    auth_sessions: [],
    user_notification_settings: [1, 2].map((user_id) => ({
      user_id, shift_change_enabled: 1, substitute_request_enabled: 1, announcement_enabled: 1,
      created_at: '2026-11-18T12:43:10.193Z', updated_at: '2026-11-18T12:43:10.193Z',
    })),
    workspaces: [{ id: 'cafe', name: '카페 알바', description: '', type: '' }],
    workspace_members: [
      { workspace_id: 'cafe', user_id: 1, role: 'viewer', hourly_wage: null, status: 'ACTIVE', joined_at: SEED_TIME, updated_at: SEED_TIME },
      { workspace_id: 'cafe', user_id: 2, role: 'editor', hourly_wage: null, status: 'ACTIVE', joined_at: SEED_TIME, updated_at: SEED_TIME },
    ],
  };
}

// 받은 DB의 CHECK 규칙과 같은 검사
export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
export function validateEmail(email) {
  const e = normalizeEmail(email);
  return e.length >= 3 && e.length <= 255 && e.indexOf('@') > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
const validName = (name) => { const n = String(name ?? '').trim(); return n.length >= 1 && n.length <= 50; };
const validPhone = (phone) => !phone || String(phone).length <= 20;

const fail = (code, message) => ({ ok: false, code, message });
const publicUser = (u) => (u ? { id: u.id, name: u.name, email: u.email ?? '', phone: u.phone ?? '', createdAt: u.created_at } : null);

// storage: localStorage 처럼 getItem/setItem 이 있는 객체 (테스트에서는 가짜 저장소를 넣어)
export function createLocalDb(storage, { now = () => new Date() } = {}) {
  const iso = () => now().toISOString();
  const epoch = () => Math.floor(now().getTime() / 1000);

  function read() {
    try {
      const raw = storage?.getItem(DB_STORAGE_KEY);
      const db = raw ? JSON.parse(raw) : null;
      if (db?.version === DB_VERSION && Array.isArray(db.users)) return db;
    } catch {
      // 깨진 값이면 처음 상태로
    }
    const fresh = seed();
    write(fresh);
    return fresh;
  }
  function write(db) {
    try {
      storage?.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch {
      // 저장공간이 꽉 찼거나 막힌 환경 → 이번 방문 동안만 유지
    }
  }
  const nextId = (rows) => rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  const findAccount = (db, email) =>
    db.auth_accounts.find((a) => a.provider === 'email' && a.provider_subject === normalizeEmail(email));

  return {
    // 회원가입: users + auth_accounts + user_notification_settings 를 한 번에 저장
    async signUp({ name, email, password, termsAccepted }) {
      if (!validName(name)) return fail('name', '이름을 1~50자로 입력해 주세요.');
      if (!validateEmail(email)) return fail('email', '이메일 형식을 확인해 주세요.');
      if (String(password ?? '').length < PASSWORD_MIN_LENGTH) return fail('password', `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상으로 입력해 주세요.`);
      if (!termsAccepted) return fail('terms', '이용약관에 동의해 주세요.');
      const password_hash = await hashPassword(password);
      const db = read(); // 해시 계산이 끝난 뒤 최신 상태를 다시 읽어 (그 사이 다른 탭에서 가입했을 수도 있어)
      const e = normalizeEmail(email);
      if (findAccount(db, e) || db.users.some((u) => u.email === e)) return fail('duplicate', '이미 가입된 이메일이에요. 로그인해 주세요.');
      const t = iso();
      const user = {
        id: nextId(db.users), name: String(name).trim(), email: e, phone: null, status: 'ACTIVE',
        created_at: t, updated_at: t, terms_accepted_at: t, terms_version: TERMS_VERSION, email_verified_at: null,
      };
      db.users.push(user);
      db.auth_accounts.push({
        id: nextId(db.auth_accounts), user_id: user.id, provider: 'email', provider_subject: e, password_hash,
        status: 'ACTIVE', created_at: t, updated_at: t, last_login_at: null, password_changed_at: null,
      });
      db.user_notification_settings.push({
        user_id: user.id, shift_change_enabled: 1, substitute_request_enabled: 1, announcement_enabled: 1, created_at: t, updated_at: t,
      });
      write(db);
      return { ok: true, user: publicUser(user) };
    },

    // 로그인: 가입 안 된 이메일 / 비밀번호 틀림 / 정지된 계정을 구분해서 알려줘
    async logIn({ email, password, remember = false }) {
      if (!validateEmail(email)) return fail('email', '이메일 형식을 확인해 주세요.');
      let db = read();
      const account = findAccount(db, email);
      if (!account) return fail('not_found', '가입되지 않은 이메일이에요. 회원가입을 먼저 해 주세요.');
      if (!(await verifyPassword(password ?? '', account.password_hash))) return fail('wrong_password', '비밀번호가 맞지 않아요.');
      db = read();
      const fresh = db.auth_accounts.find((a) => a.id === account.id);
      const user = db.users.find((u) => u.id === fresh?.user_id);
      if (!fresh || fresh.status !== 'ACTIVE' || user?.status !== 'ACTIVE') return fail('disabled', '사용할 수 없는 계정이에요.');
      const token = newToken();
      const nowEpoch = epoch();
      // 만료된 출입증은 이때 같이 정리
      db.auth_sessions = db.auth_sessions.filter((s) => s.expires_at > nowEpoch);
      db.auth_sessions.push({
        token_hash: tokenHash(token), auth_account_id: fresh.id,
        expires_at: nowEpoch + (remember ? SESSION_SECONDS.remember : SESSION_SECONDS.session), created_at: iso(),
      });
      fresh.last_login_at = iso();
      write(db);
      return { ok: true, user: publicUser(user), token };
    },

    // 저장해둔 출입증(토큰)으로 지금 로그인한 사람 찾기. 만료·정지면 null
    userForToken(token) {
      if (!token) return null;
      const db = read();
      const session = db.auth_sessions.find((s) => s.token_hash === tokenHash(token));
      if (!session || session.expires_at <= epoch()) return null;
      const account = db.auth_accounts.find((a) => a.id === session.auth_account_id);
      const user = db.users.find((u) => u.id === account?.user_id);
      if (account?.status !== 'ACTIVE' || user?.status !== 'ACTIVE') return null;
      return publicUser(user);
    },

    logOut(token) {
      if (!token) return;
      const db = read();
      const hash = tokenHash(token);
      db.auth_sessions = db.auth_sessions.filter((s) => s.token_hash !== hash);
      write(db);
    },

    // 17 기본 정보 저장 (이름 · 연락처)
    updateProfile(userId, { name, phone }) {
      if (!validName(name)) return fail('name', '이름을 1~50자로 입력해 주세요.');
      if (!validPhone(phone)) return fail('phone', '연락처는 20자 이내로 입력해 주세요.');
      const db = read();
      const user = db.users.find((u) => u.id === userId);
      if (!user) return fail('not_found', '사용자를 찾을 수 없어요. 다시 로그인해 주세요.');
      user.name = String(name).trim();
      user.phone = String(phone ?? '').trim() || null;
      user.updated_at = iso();
      write(db);
      return { ok: true, user: publicUser(user) };
    },

    // 17 비밀번호 변경: 바꾸면 다른 기기(다른 출입증)는 로그아웃시켜
    async changePassword(userId, { current, next, keepToken }) {
      if (String(next ?? '').length < PASSWORD_MIN_LENGTH) return fail('password', `새 비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상으로 입력해 주세요.`);
      const account = read().auth_accounts.find((a) => a.user_id === userId && a.provider === 'email');
      if (!account) return fail('not_found', '이메일 로그인 계정을 찾을 수 없어요.');
      if (!(await verifyPassword(current ?? '', account.password_hash))) return fail('wrong_password', '현재 비밀번호가 맞지 않아요.');
      if (current === next) return fail('same', '지금과 다른 비밀번호로 입력해 주세요.');
      const password_hash = await hashPassword(next);
      const db = read();
      const fresh = db.auth_accounts.find((a) => a.id === account.id);
      const t = iso();
      Object.assign(fresh, { password_hash, password_changed_at: t, updated_at: t });
      const keep = keepToken ? tokenHash(keepToken) : null;
      db.auth_sessions = db.auth_sessions.filter((s) => s.auth_account_id !== fresh.id || s.token_hash === keep);
      write(db);
      return { ok: true };
    },

    getNotificationSettings(userId) {
      const row = read().user_notification_settings.find((s) => s.user_id === userId);
      return {
        shiftChange: row ? row.shift_change_enabled === 1 : true,
        substituteRequest: row ? row.substitute_request_enabled === 1 : true,
        announcement: row ? row.announcement_enabled === 1 : true,
      };
    },

    updateNotificationSettings(userId, settings) {
      const db = read();
      const t = iso();
      let row = db.user_notification_settings.find((s) => s.user_id === userId);
      if (!row) {
        row = { user_id: userId, shift_change_enabled: 1, substitute_request_enabled: 1, announcement_enabled: 1, created_at: t, updated_at: t };
        db.user_notification_settings.push(row);
      }
      if ('shiftChange' in settings) row.shift_change_enabled = settings.shiftChange ? 1 : 0;
      if ('substituteRequest' in settings) row.substitute_request_enabled = settings.substituteRequest ? 1 : 0;
      if ('announcement' in settings) row.announcement_enabled = settings.announcement ? 1 : 0;
      row.updated_at = t;
      write(db);
      return { ok: true };
    },

    // 확인·발표용: 지금 저장된 전체 JSON (비밀번호는 해시만 들어 있어)
    snapshot: () => read(),
    reset() { write(seed()); },
  };
}

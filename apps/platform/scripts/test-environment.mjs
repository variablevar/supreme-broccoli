import { createHmac } from 'node:crypto';
export const testDatabaseUrl='postgres://postgres:imo_test_only@127.0.0.1:55432/imo_test';
export const testSecret='imo-local-integration-only-secret-at-least-32-bytes';
const encode=(v)=>Buffer.from(JSON.stringify(v)).toString('base64url');
const body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role:'service_role',exp:4102444800});
export const testServiceKey=body+'.'+createHmac('sha256',testSecret).update(body).digest('base64url');
export const testEnv={DATABASE_REST_URL:'http://127.0.0.1:55433',SUPABASE_SERVICE_ROLE_KEY:testServiceKey,TOTP_ENCRYPTION_KEY:'ab'.repeat(32),APP_ORIGIN:'http://127.0.0.1:3100'};

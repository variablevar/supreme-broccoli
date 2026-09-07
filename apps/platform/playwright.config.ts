import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',fullyParallel:false,workers:1,timeout:60000,
 use:{baseURL:'http://127.0.0.1:3100',trace:'retain-on-failure'},
 webServer:{command:'node scripts/test-server.mjs',url:'http://127.0.0.1:3100/login',reuseExistingServer:false,timeout:120000},
 reporter:[['list']],
});

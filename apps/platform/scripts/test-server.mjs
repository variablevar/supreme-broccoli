import {spawn} from 'node:child_process';
import {testEnv} from './test-environment.mjs';
const child=spawn('pnpm',['exec','next','dev','--webpack','--port','3100','--hostname','127.0.0.1'],{stdio:'inherit',env:{...process.env,...testEnv}});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));

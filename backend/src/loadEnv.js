import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backend/src/loadEnv.js -> backend/src -> backend -> root
const rootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env'); // Just in case it's in backend too

let loaded = false;

// Try loading
if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
    console.log(`✅ Loaded environment from ${rootEnvPath}`);
    loaded = true;
}

if (!loaded && fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
    console.log(`✅ Loaded environment from ${backendEnvPath}`);
    loaded = true;
}

if (!loaded) {
    console.warn(`⚠️  No .env file found at ${rootEnvPath} or ${backendEnvPath}! Check configuration.`);
}

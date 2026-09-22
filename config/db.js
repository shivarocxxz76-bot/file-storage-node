/**
 * Permanent MongoDB Database Connection Engine
 * Supports:
 * 1. Cloud MongoDB (MongoDB Atlas via MONGO_URI)
 * 2. Pre-running Local MongoDB Service (port 27017)
 * 3. Self-Hosting Persistent MongoDB Engine (WiredTiger with permanent on-disk storage in data/db)
 *
 * All user accounts, files, folders, payments, and logs are saved permanently on disk
 * and will never be lost when stopping or restarting the server.
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

let mongodChildProcess = null;

// Helper to check if a TCP port is open and accepting connections
function isPortOpen(port, host = '127.0.0.1', timeout = 1500) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });

        socket.connect(port, host);
    });
}

// Locate mongod binary on the system or in the project cache
function findMongodBinary() {
    // 1. Check local project cache
    const cacheDir = path.join(__dirname, '..', 'node_modules', '.cache', 'mongodb-memory-server');
    if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        const mongodFile = files.find(f => f.startsWith('mongod') && (f.endsWith('.exe') || !f.includes('.')));
        if (mongodFile) {
            return path.join(cacheDir, mongodFile);
        }
    }

    // 2. Fallback to system mongod
    return 'mongod';
}

// Start persistent local MongoDB process with permanent data directory
async function startPersistentLocalMongo(port = 27017) {
    const dbDir = path.join(__dirname, '..', 'data', 'db');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    // Check if mongod lock file is stale and needs cleanup
    const lockFile = path.join(dbDir, 'mongod.lock');
    if (fs.existsSync(lockFile)) {
        const portActive = await isPortOpen(port);
        if (!portActive) {
            try {
                // If port is not active, clean up any stale lock file
                const lockContent = fs.readFileSync(lockFile, 'utf8').trim();
                if (lockContent) {
                    fs.writeFileSync(lockFile, '');
                }
            } catch (e) {
                // Ignore lock cleanup error
            }
        }
    }

    const mongodExe = findMongodBinary();
    console.log(`[Database] Initializing permanent on-disk database engine...`);
    console.log(`[Database Storage Path] ${dbDir}`);

    return new Promise((resolve, reject) => {
        try {
            const child = spawn(mongodExe, [
                '--dbpath', dbDir,
                '--port', String(port),
                '--bind_ip', '127.0.0.1',
                '--syncdelay', '2'
            ], {
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            });

            mongodChildProcess = child;

            let started = false;
            const startupTimeout = setTimeout(() => {
                if (!started) {
                    reject(new Error(`Timed out waiting for MongoDB to start on port ${port}`));
                }
            }, 20000);

            child.stdout.on('data', (data) => {
                const text = data.toString();
                if (text.includes('Waiting for connections') || text.includes('"msg":"Waiting for connections"')) {
                    if (!started) {
                        started = true;
                        clearTimeout(startupTimeout);
                        console.log(`[Database] Permanent MongoDB Engine is ready on port ${port}`);
                        resolve(child);
                    }
                }
            });

            child.stderr.on('data', (data) => {
                // Suppress normal non-fatal logs
                const msg = data.toString();
                if (msg.toLowerCase().includes('error') && !msg.includes('non-fatal')) {
                    console.error('[MongoDB Error]', msg.trim());
                }
            });

            child.on('error', (err) => {
                clearTimeout(startupTimeout);
                reject(err);
            });

            child.on('exit', (code, signal) => {
                if (!started) {
                    clearTimeout(startupTimeout);
                    reject(new Error(`mongod exited before becoming ready with code ${code} (${signal})`));
                } else {
                    console.log(`[Database] MongoDB Engine stopped gracefully.`);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

// Graceful process shutdown handler to guarantee all records are flushed to disk
let isShuttingDown = false;
async function cleanDatabaseExit() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    try {
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            console.log('[Database] Flushing data to disk and executing clean database shutdown...');
            try {
                await mongoose.connection.db.admin().command({ shutdown: 1, force: true });
            } catch (e) {
                // Expected when database server shuts down its connection
            }
            try {
                await mongoose.connection.close();
            } catch (e) {}
        }
    } catch (err) {}

    if (mongodChildProcess) {
        try {
            mongodChildProcess.kill('SIGINT');
        } catch (e) {}
        mongodChildProcess = null;
    }
}

function setupGracefulShutdown() {
    process.once('SIGINT', async () => {
        await cleanDatabaseExit();
        process.exit(0);
    });

    process.once('SIGTERM', async () => {
        await cleanDatabaseExit();
        process.exit(0);
    });

    process.once('exit', () => {
        if (mongodChildProcess) {
            try {
                mongodChildProcess.kill('SIGINT');
            } catch (e) {}
            mongodChildProcess = null;
        }
    });
}

setupGracefulShutdown();

const connectDB = async () => {
    const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/file_storage_db';

    // A. Check if user configured a remote Cloud database (MongoDB Atlas)
    const isCloudDB = rawUri.includes('mongodb+srv://') || 
                      (!rawUri.includes('127.0.0.1') && !rawUri.includes('localhost'));

    if (isCloudDB) {
        try {
            console.log('[Database] Connecting to Cloud MongoDB (Atlas)...');
            const conn = await mongoose.connect(rawUri);
            console.log(`[Database] Cloud MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
            return conn;
        } catch (cloudErr) {
            console.error('[Database Error] Failed to connect to Cloud MongoDB:', cloudErr.message);
            throw cloudErr;
        }
    }

    // B. Local Database Connection
    const portMatch = rawUri.match(/:(\d+)/);
    const targetPort = portMatch ? parseInt(portMatch[1], 10) : 27017;

    // 1. Check if MongoDB is already running on target port
    const alreadyRunning = await isPortOpen(targetPort);

    if (!alreadyRunning) {
        console.log(`[Database Notice] MongoDB is not running on port ${targetPort}. Launching embedded persistent server...`);
        try {
            await startPersistentLocalMongo(targetPort);
        } catch (spawnErr) {
            console.warn(`[Database Warning] Could not launch persistent mongod binary directly: ${spawnErr.message}`);
            // Fallback: Use MongoMemoryServer with permanent dbPath and cleanup=false
            try {
                const { MongoMemoryServer } = require('mongodb-memory-server');
                const dbDir = path.join(__dirname, '..', 'data', 'db');
                if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

                const memServer = await MongoMemoryServer.create({
                    instance: {
                        dbPath: dbDir,
                        port: targetPort,
                        storageEngine: 'wiredTiger',
                        dbName: 'file_storage_db'
                    },
                    cleanup: false
                });
                console.log(`[Database] Persistent Engine Active via Managed Runner: ${memServer.getUri()}`);
            } catch (fallbackErr) {
                console.error('[Database Fatal Error] Failed to start local database:', fallbackErr.message);
                throw fallbackErr;
            }
        }
    } else {
        console.log(`[Database] Detected running MongoDB instance on port ${targetPort}.`);
    }

    // 2. Connect via Mongoose with retry
    let retries = 5;
    while (retries > 0) {
        try {
            const conn = await mongoose.connect(rawUri, {
                serverSelectionTimeoutMS: 5000,
                writeConcern: {
                    w: 1,
                    j: true
                }
            });
            console.log(`[Database] Permanent MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
            console.log(`[Database] Data Persistence: ACTIVE (All users, files, and records are permanently saved on disk)`);
            return conn;
        } catch (err) {
            retries--;
            if (retries === 0) {
                console.error('[Database Error] Connection failed:', err.message);
                throw err;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }
};

module.exports = connectDB;

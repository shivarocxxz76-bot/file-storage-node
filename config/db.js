/**
 * MongoDB Database Connection Engine
 * Supports Local MongoDB instance with automated fallback to Built-in Zero-Config Database
 */

const mongoose = require('mongoose');

let memServer = null;

const connectDB = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/file_storage_db';

    // 1. Try connecting to local / external MongoDB instance
    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 2000
        });
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
    } catch (localError) {
        console.warn(`[Database Notice] Local MongoDB is not running (${localError.message}).`);
        console.log('[Database] Starting built-in zero-config database engine...');

        // 2. Fallback to built-in MongoDB Memory Server
        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            memServer = await MongoMemoryServer.create({
                instance: {
                    dbName: 'file_storage_db'
                }
            });
            const memUri = memServer.getUri();
            const conn = await mongoose.connect(memUri);
            console.log(`[Database] Built-in Zero-Config Database Connected: ${memUri}`);
            return conn;
        } catch (memError) {
            console.error('[Database Fatal Error] Failed to start database:', memError.message);
            return null;
        }
    }
};

module.exports = connectDB;

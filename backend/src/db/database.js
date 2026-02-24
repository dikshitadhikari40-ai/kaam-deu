/**
 * SQLite Database for Backend OAuth Operations
 *
 * IMPORTANT: This SQLite database is ONLY used by the Express backend server
 * for handling OAuth flows (LinkedIn, Google) and local development.
 *
 * The frontend (mobile/web) uses SUPABASE as the primary database for:
 * - User profiles
 * - Matches and messages
 * - Payments and subscriptions
 *
 * This separation exists because:
 * 1. OAuth requires server-side token exchange with secrets
 * 2. Backend can operate independently for development
 *
 * See ARCHITECTURE.md for full details.
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/kaamdeu.db');

let db = null;

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

async function initDb() {
    if (db) return db;

    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    return db;
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDb() first.');
    }
    return db;
}

function saveDb() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Wrapper class to provide better-sqlite3-like API
class PreparedStatement {
    constructor(db, sql) {
        this.db = db;
        this.sql = sql;
    }

    run(...params) {
        this.db.run(this.sql, params);
        saveDb();
        return { changes: this.db.getRowsModified() };
    }

    get(...params) {
        const stmt = this.db.prepare(this.sql);
        if (params.length > 0) {
            stmt.bind(params);
        }
        const result = stmt.step() ? stmt.getAsObject() : undefined;
        stmt.free();
        return result;
    }

    all(...params) {
        const results = [];
        const stmt = this.db.prepare(this.sql);
        if (params.length > 0) {
            stmt.bind(params);
        }
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }
}

// Add prepare method to db for better-sqlite3 compatibility
function prepare(sql) {
    return new PreparedStatement(db, sql);
}

module.exports = { initDb, getDb, saveDb, prepare };

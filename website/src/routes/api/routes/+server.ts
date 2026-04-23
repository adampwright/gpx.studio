import { json } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import type { RequestHandler } from './$types';

// Absolute path to SQLite db — adjust if moved
const DB_PATH = 'C:\\Users\\adam\\Desktop\\AC100\\gpx\\routes.db';

let db: ReturnType<typeof Database> | null = null;

function getDb() {
    if (!db) {
        if (!fs.existsSync(DB_PATH)) {
            return null;
        }
        db = new Database(DB_PATH, { readonly: true });
    }
    return db;
}

export const GET: RequestHandler = ({ url }) => {
    const filename = url.searchParams.get('filename');
    const database = getDb();
    if (!database) {
        return new Response('routes.db not found — run pnpm run to-sqlite first', { status: 503 });
    }

    if (!filename) {
        const rows = database.prepare('SELECT * FROM routes').all();
        return json(rows);
    }

    // Extract base filename (after last /) since DB stores just the filename without path
    const baseFilename = filename.split('/').pop() || filename;
    const row = database.prepare('SELECT * FROM routes WHERE "filename" = ?').get(baseFilename);
    if (!row) {
        return new Response('Not Found', { status: 404 });
    }

    return json(row);
};

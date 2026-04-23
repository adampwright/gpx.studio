import * as fs from 'fs';
import * as path from 'path';
import type { RequestHandler } from './$types';

// Absolute path to GPX files directory — adjust if moved
const GPX_DIR = 'C:\\Users\\adam\\Desktop\\AC100\\gpx\\gpx';

export const GET: RequestHandler = ({ params }) => {
    // params.path is the wildcard segment after /api/gpx/
    const relativePath = params.path ?? '';

    // Prevent path traversal: resolve and verify it stays within GPX_DIR
    const resolved = path.resolve(GPX_DIR, relativePath);
    if (!resolved.startsWith(path.resolve(GPX_DIR))) {
        return new Response('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
        return new Response('Not Found', { status: 404 });
    }

    const data = fs.readFileSync(resolved);
    return new Response(data, {
        headers: {
            'Content-Type': 'application/gpx+xml',
            'Cache-Control': 'public, max-age=3600',
        },
    });
};

import { json } from '@sveltejs/kit';
import * as fs from 'fs';
import * as path from 'path';

// Absolute path to GPX files directory — adjust if moved
const GPX_DIR = 'C:\\Users\\adam\\Desktop\\AC100\\gpx\\gpx';

function collectGpxFiles(dir: string, base: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            results.push(...collectGpxFiles(path.join(dir, entry.name), rel));
        } else if (entry.name.toLowerCase().endsWith('.gpx')) {
            results.push(rel);
        }
    }
    return results;
}

export function GET() {
    const files = collectGpxFiles(GPX_DIR, '');
    return json(files);
}

// Extracts sections of gtm_template.tpl.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../gtm_template.tpl');

export function readSection(name, file = defaultFile) {
    const content = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
    const match = content.match(new RegExp(`___${name}___\\s*\\n([\\s\\S]*?)(?=\\n___[A-Z_]+___|$)`));

    if (!match) {
        throw new Error(`Section ${name} not found in ${file}.`);
    }

    return match[1].trim();
}

export const sandboxedCode = (file) => readSection('SANDBOXED_JS_FOR_WEB_TEMPLATE', file);
export const templateParameters = (file) => JSON.parse(readSection('TEMPLATE_PARAMETERS', file));

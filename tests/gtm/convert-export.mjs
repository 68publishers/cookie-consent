// Converts the "Cookie Consent" tag of a GTM container export into a template `data` fixture.
// Usage: node tests/gtm/convert-export.mjs <export.json> <tagId> <out.json> [vars.json]
import fs from 'node:fs';

const [exportFile, tagId, outFile, varsFile] = process.argv.slice(2);
const container = JSON.parse(fs.readFileSync(exportFile, 'utf8')).containerVersion;
const tag = container.tag.find(t => t.tagId === tagId);
const vars = varsFile ? JSON.parse(fs.readFileSync(varsFile, 'utf8')) : {};

if (!tag) {
    throw new Error(`Tag ${tagId} not found.`);
}

const substitute = (value) => typeof value === 'string'
    ? value.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
        if (!(name in vars)) {
            throw new Error(`Missing value for variable ${match}.`);
        }
        return vars[name];
    })
    : value;

const convert = (param) => {
    switch (param.type) {
        case 'BOOLEAN':
            return param.value === 'true';
        case 'INTEGER':
            return Number(param.value);
        case 'LIST':
            return (param.list || []).map(convert);
        case 'MAP':
            return Object.fromEntries(param.map.map(p => [p.key, convert(p)]));
        default:
            // GTM passes an empty text field as an empty string; the export leaves the value out
            return substitute(param.value ?? '');
    }
};

const data = {};

for (const param of tag.parameter) {
    data[param.key] = convert(param);
}

fs.writeFileSync(outFile, JSON.stringify({ source: `${exportFile}#${tagId}`, data }, null, 2) + '\n');
console.log(`written ${outFile} (${Object.keys(data).length} parameters)`);

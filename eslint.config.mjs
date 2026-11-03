import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    // copies of client GTM tags
    ignores: ["tests/fixtures/clients/**"],
}, ...compat.extends("eslint:recommended"), {
    languageOptions: {
        globals: {
            ...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, "off"])),
            ...globals.browser,
        },

        ecmaVersion: "latest",
        sourceType: "module",
    },

    rules: {
        indent: ["error", 4, {
            SwitchCase: 1,
        }],

        "comma-dangle": ["error", "always-multiline"],

        "comma-spacing": ["error", {
            before: false,
            after: true,
        }],

        "no-trailing-spaces": "error",
        "eol-last": ["error", "always"],
    },
}, {
    // tests and perf run in Node (Playwright, Vitest) and in the browser (page.evaluate)
    files: ["perf/**", "tests/**"],
    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.browser,
        },
    },
}];

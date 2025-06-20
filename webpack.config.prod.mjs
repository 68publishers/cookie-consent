import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TerserWebpackPlugin from 'terser-webpack-plugin';
import JsonMinimizerPlugin from 'json-minimizer-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    mode: 'production',
    entry: './index.mjs',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cookie-consent.min.js',
        library: {
            type: 'var',
            name: 'CookieConsentWrapper',
            export: 'default',
        },
    },
    module: {
        rules: [
            {
                test: /\.(mjs|js)$/i,
                loader:  'babel-loader',
                include: [
                    path.resolve(__dirname, 'src')
                ],
                options: {
                    presets: [
                        ['@babel/preset-env', {
                            useBuiltIns: 'usage',
                            corejs: {
                                version: '3.39',
                            },
                            targets: "defaults",
                        }]
                    ],
                },
            },
            {
                test: /\.css$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1
                        }
                    },
                    'postcss-loader',
                ]
            },
            {
                test: /cookieconsent\.js$/,
                loader: 'string-replace-loader',
                options: {
                    multiple: [
                        {
                            search: '^\\s*_array\\[0\\] = focusable_elems\\[0\\];\\s+_array\\[1\\] = focusable_elems\\[focusable_elems\\.length - 1\\];$',
                            replace: `
                            const focusable_elems_arr = Array.from(focusable_elems);
                            _array[0] = focusable_elems_arr.find(el => CookieConsentWrapper.utils.checkVisibility(el));
                            _array[1] = focusable_elems_arr.reverse().find(el => CookieConsentWrapper.utils.checkVisibility(el));
                            `,
                            flags: 'gm',
                            strict: true
                        },
                        {
                            search: '_addClass\\(html_dom, "show--consent"\\);',
                            replace: `
                            _getModalFocusableData();
                            focusable_edges = consent_modal_focusable;
                            focused_modal.addEventListener('transitionend', () => setFocus(focusable_edges[0]), {once: true});
                            _addClass(html_dom, "show--consent");
                            `,
                            flags: 'g',
                            strict: true,
                        },
                        {
                            search: '_addClass\\(html_dom, "show--settings"\\);',
                            replace: `
                            _getModalFocusableData();
                            focusable_edges = settings_modal_focusable;
                            focused_modal.addEventListener('transitionend', () => setFocus(focusable_edges[0]), {once: true});
                            _addClass(html_dom, "show--settings");
                            `,
                            flags: 'g',
                            strict: true,
                        },
                        {
                            search: 'return _cookieconsent;',
                            replace: `
                            _cookieconsent.__updateModalFocusableData = _getModalFocusableData;
                            _cookieconsent.__getFocusableEdges = () => focusable_edges;
                            _cookieconsent.__generateFocusSpan = generateFocusSpan;
                            _cookieconsent.__isConsentModalExists = () => consent_modal_exists;
                            _cookieconsent.__getFocusedModal = () => focused_modal;
        
                            return _cookieconsent;
                            `,
                            flags: 'g',
                            strict: true,
                        }
                    ],
                },
            }
        ],
    },
    resolve: {
        modules: [
            'node_modules',
            path.resolve(__dirname, 'src')
        ],
        extensions: ['.mjs', '.js', '.css'],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: './src/resources/translations/*.json',
                    to: path.resolve(__dirname, 'dist', 'translations', '[name][ext]'),
                },
                {
                    from: './src/resources/translations/*.json',
                    to: path.resolve(__dirname, 'dist', 'translations', '[name][ext].js'),
                    transform: {
                        transformer(content) {
                            let json = JSON.parse(content.toString());
                            json = JSON.stringify(json)
                                .replace(/\u2028/g, '\\u2028')
                                .replace(/\u2029/g, '\\u2029');

                            let code = 'window.cookieConsentWrapperTranslations = window.cookieConsentWrapperTranslations || {};';
                            code += `window.cookieConsentWrapperTranslations[document.currentScript.src] = ${json};`;

                            return Promise.resolve(Buffer.from(code, 'utf-8'));
                        },
                    },
                },
            ],
        }),
        new MiniCssExtractPlugin({
            filename: 'cookie-consent.css',
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserWebpackPlugin({
                terserOptions: {
                    format: {
                        comments: false,
                    },
                },
                extractComments: false,
            }),
            new JsonMinimizerPlugin(),
        ],
    },
};

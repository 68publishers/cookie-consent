import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TerserWebpackPlugin from 'terser-webpack-plugin';
import JsonMinimizerPlugin from 'json-minimizer-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack from 'webpack';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
const outDir = process.env.CC_OUT_DIR ? path.resolve(process.env.CC_OUT_DIR) : path.resolve(__dirname, 'dist');

export default {
    mode: 'production',
    entry: './index.mjs',
    output: {
        path: outDir,
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
                            // ES2020 browsers (Chrome 80+, Firefox 74+, Safari 13.1+): syntax only, no polyfills
                            targets: 'chrome >= 80, firefox >= 74, safari >= 13.1, edge >= 80',
                            bugfixes: true,
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
        new webpack.DefinePlugin({ __CC_VERSION__: JSON.stringify(version) }),
        new CopyPlugin({
            patterns: [
                {
                    from: './node_modules/vanilla-cookieconsent/dist/css-components/dark-scheme.css',
                    to: path.resolve(outDir, 'cookie-consent-dark.css'),
                },
                {
                    from: './src/resources/translations/*.json',
                    to: path.resolve(outDir, 'translations', '[name][ext]'),
                },
                {
                    from: './src/resources/translations/*.json',
                    to: path.resolve(outDir, 'translations', '[name][ext].js'),
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
                    ecma: 2020,
                    compress: { passes: 2 },
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

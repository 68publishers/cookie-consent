import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack from 'webpack';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

export default {
    mode: 'development',
    entry: './index.mjs',
    output: {
        path: path.resolve(__dirname, 'demo'),
        filename: 'cookie-consent.js',
        library: {
            type: 'var',
            name: 'CookieConsentWrapper',
            export: 'default',
        }
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
                    ]
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
                    from: './src/resources/translations/*.json',
                    to: path.resolve(__dirname, 'demo', 'translations', '[name][ext]'),
                },
                {
                    from: './src/resources/translations/*.json',
                    to: path.resolve(__dirname, 'demo', 'translations', '[name][ext].js'),
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
    devServer: {
        static: {
            directory: path.join(__dirname, 'demo'),
        },
        compress: true,
        port: 3000
    },
};

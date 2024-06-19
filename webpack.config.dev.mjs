import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CopyPlugin from 'copy-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
                loader:  'babel-loader',
                test: /\.(mjs|js)$/i,
                include: [
                    path.resolve(__dirname, 'src')
                ],
                options: {
                    presets: [
                        '@babel/preset-env'
                    ]
                },
            },
        ],
    },
    resolve: {
        modules: [
            'node_modules',
            path.resolve(__dirname, 'src')
        ],
        extensions: ['.mjs', '.js'],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: './src/resources/translations/*.json',
                    to: path.resolve(__dirname, 'demo', 'translations', '[name][ext]'),
                },
            ],
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'demo'),
        },
        compress: true,
        port: 3000
    }
};

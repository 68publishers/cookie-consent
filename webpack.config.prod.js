const path = require('path');
const TerserWebpackPlugin = require('terser-webpack-plugin');
const JsonMinimizerPlugin = require('json-minimizer-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: "production",
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cookie-consent.min.js',
        library: 'CookieConsentWrapper'
    },
    entry: './index.js',
    module: {
        rules: [
            {
                loader:  'babel-loader',
                test: /\.js$/i,
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
        extensions: [".js"],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: './src/resources/translations/*.json',
                    to: path.resolve(__dirname, 'dist', 'translations', '[name][ext]'),
                },
            ],
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserWebpackPlugin(),
            new JsonMinimizerPlugin(),
        ],
    },
};

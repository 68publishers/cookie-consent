const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: "development",
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'cookie-consent.js',
        library: 'CookieConsentWrapper'
    },
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
                    to: path.resolve(__dirname, 'build', 'translations', '[name][ext]'),
                },
            ],
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'build'),
        },
        compress: true,
        port: 3000
    }
};

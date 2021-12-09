const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

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
                test: /\.js$/,
                include: [
                    path.resolve(__dirname, 'src')
                ],
                options: {
                    presets: [
                        '@babel/preset-env'
                    ]
                },
            }
        ],
    },
    resolve: {
        modules: [
            'node_modules',
            path.resolve(__dirname, 'src')
        ],
        extensions: [".js", ".json", ".jsx", ".css"],
    },
    optimization: {
        minimizer: [
            new UglifyJsPlugin()
        ],
    },
};

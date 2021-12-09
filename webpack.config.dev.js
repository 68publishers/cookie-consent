const path = require('path');

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
    devServer: {
        static: {
            directory: path.join(__dirname, 'build'),
        },
        compress: true,
        port: 3000
    }
};

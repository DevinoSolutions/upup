module.exports = {
    resolve: {
        fallback: {
            'highlight.js/lib/core': require.resolve('highlight.js/lib/core'),
        },
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: /node_modules\/lowlight/,
                type: 'javascript/auto',
            },
        ],
    },
}

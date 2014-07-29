(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return factory();
        });
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.ReqConfig = factory();
    }
}(this, function () {

    return function () {
        return {
            debug: true,
            appDir: './test/origin/app',
            dir: './test/target/app',
            baseUrl: "./",
            paths: {
                'css': './vendor/css',
                'text': './vendor/text',
                'normalize': './vendor/normalize',
                'css-builder': './vendor/css-builder'
            }
        };
    }

}));

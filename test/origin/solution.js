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

    return {
        modules: [{
            name: 'modA',
            source: './modules'
        }],
        publish: {
            buildPaths: {}
        }
    };
}));

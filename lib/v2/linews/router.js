module.exports = (router) => {
    router.get('/gasgoo', require('./gasgoo'));
    router.get('/d1ev', require('./d1ev'));
    // router.get('/cnev', require('./cnev'));
    router.get('/dongchedi', require('./dongchedi'));
};

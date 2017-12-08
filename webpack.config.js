module.exports = {
  context: __dirname + '/dist',
  entry: {
    gameview: './system/test/browser-gameview.js',
  },
  output: {
    filename: "[name].bundle.js",
    publicPath: '/dist/',
    path: __dirname + '/dist',
  }
}

const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const webpack = require('webpack');

const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    }),
  ],

  optimization: {
    minimizer: [
      new TerserPlugin({
        test: /\.js$/i,
        parallel: true,
        terserOptions: {
          compress: {
            arguments: true,
            drop_console: true,
            keep_fargs: false,
            ecma: 2015,
            passes: 3,
            toplevel: true,
            module: true,
            unsafe: true,
          },
        },
        extractComments: {
          condition: 'some',
          filename: () => `LICENSE.txt`,
          banner: licenseFile => `License information can be found in ${licenseFile}.`,
        },
      }),
      new OptimizeCSSAssetsPlugin({
        test: /\.css$/i,
      }),
    ],
    minimize: true,
    concatenateModules: true,
    usedExports: true,
    sideEffects: true,
    mangleExports: 'size',
    runtimeChunk: {
      name: 'runtime',
    },
    splitChunks: {
      name: 'chunk',
    },
  },
});

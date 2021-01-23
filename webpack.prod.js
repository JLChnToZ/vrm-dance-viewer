const merge = require('webpack-merge')
const common = require('./webpack.common.js')
const webpack = require('webpack')

const TerserPlugin = require('terser-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    })
  ],

  optimization: {
    minimizer: [
      new TerserPlugin({
        test: /\.js(\?.*)?$/i,
        terserOptions: {
          compress: {
            drop_console: true,
            keep_fargs: false,
            ecma: 6,
            toplevel: true,
            module: true,
          },
        },
        extractComments: {
          condition: 'some',
          filename: () => `LICENSE.txt`,
          banner: licenseFile => `License information can be found in ${licenseFile}.`,
        },
      }),
      new OptimizeCSSAssetsPlugin({}),
    ],
    minimize: true,
    runtimeChunk: {
      name: 'runtime',
    },
    splitChunks: {
      name: 'chunk',
    }
  }
})

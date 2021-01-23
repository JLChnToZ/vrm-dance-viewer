const merge = require('webpack-merge');
const path = require('path');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const MiniCssExtractPluginConfig = new MiniCssExtractPlugin({
  filename: '[name].[contenthash].css',
  chunkFilename: '[id].[contenthash].css',
});

//https://webpack.js.org/plugins/html-webpack-plugin/
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
  template: path.resolve(__dirname, 'src', 'index.html'),
  filename: 'index.html',
  inject: 'body',
  minify: {
    collapseWhitespace: true,
    minifyCSS: true
  }
})

const WebpackCleanupPlugin = require('webpack-cleanup-plugin')
const WebpackCleanupPluginConfig = new WebpackCleanupPlugin({});

const CopyPlugin = require('copy-webpack-plugin');
const CopyPluginConfig = new CopyPlugin({
  patterns: [{
    from: path.join(__dirname, 'assets/i18n'),
    to: path.join(__dirname, 'public/assets/i18n'),
  }],
});

//merge() isn't required, but it enables autocomplete
module.exports = merge({
  entry: path.join(__dirname, 'src', 'main.ts'),
  output: {
    path: path.join(__dirname, 'public'),
    filename: '[name].[contenthash].js',
  },
  resolve: {
    extensions: ['.ts', '.js']
  },

  plugins: [
    WebpackCleanupPluginConfig,
    HTMLWebpackPluginConfig,
    MiniCssExtractPluginConfig,
    CopyPluginConfig,
  ],

  module: {
    rules: [
      //https://www.typescriptlang.org/docs/handbook/react-&-webpack.html (ignore the react part)
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader'
      },

      //https://webpack.js.org/loaders/css-loader/
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },

      //https://webpack.js.org/loaders/file-loader/
      {
        test: /\.(gltf|mp3|svg|glb|png|jpe?g|eot|ttf|woff|woff2)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: 'assets',
              name: '[sha256:hash:base64:16].[ext]'
            }
          }
        ]
      }
    ]
  }
})

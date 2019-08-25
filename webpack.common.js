const merge = require('webpack-merge')
const path = require('path')

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
const WebpackCleanupPluginConfig = new WebpackCleanupPlugin({})

//merge() isn't required, but it enables autocomplete
module.exports = merge({
  entry: path.join(__dirname, 'src', 'main.ts'),
  output: {
    path: path.join(__dirname, 'public')
  },
  resolve: {
    extensions: ['.ts', '.js']
  },

  plugins: [WebpackCleanupPluginConfig, HTMLWebpackPluginConfig],

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
        use: ['style-loader', 'css-loader']
      },

      //https://webpack.js.org/loaders/file-loader/
      {
        test: /\.(gltf|mp3|svg|glb|png|jpe?g)$/,
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

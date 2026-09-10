// ============================================================
// webpack.config.js
// 렌더러(React) 번들링 설정.
// ts-loader로 TypeScript를 컴파일하고, HtmlWebpackPlugin으로
// index.html을 생성합니다.
// ============================================================

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (_env, argv) => ({
  mode: argv.mode || 'development',
  entry: './src/renderer/index.tsx',

  // electron-renderer 타겟: Node.js 내장 모듈 사용 가능, 브라우저 API도 사용 가능
  target: 'electron-renderer',

  devtool: argv.mode === 'production' ? false : 'source-map',

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.renderer.json',
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    // @shared 별칭으로 src/shared 경로 단축
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },

  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'dist/renderer'),
    clean: true,
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
    }),
  ],
});

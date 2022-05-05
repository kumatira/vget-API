import * as Webpack from 'webpack';
import { resolve } from 'path';
import { sync } from 'glob';

/** ビルド対象ルートディレクトリ */
const SRC_PATH = resolve(__dirname, './func/');
/** entryとなるファイル名 */
const ENTRY_NAME = 'index.ts';
/** ビルド結果出力先 */
const BUILT_PATH = resolve(__dirname, './dist');

const resolveEntry = (): Webpack.Entry => {
    const entries: { [key: string]: string } = {};
    const targets: string[] = sync(`${SRC_PATH}/**/${ENTRY_NAME}`);
    const pathRegex = new RegExp(`${SRC_PATH}/(.+?)/${ENTRY_NAME}`);
    targets.forEach((value: string) => {
        const key = value.replace(pathRegex, '$1/index')
        entries[key] = value;
    });
    return entries;
};

console.log(resolveEntry());

const config: Webpack.Configuration = {
    target: 'node',
    mode: 'development',
    entry: resolveEntry(),
    output: {
        filename: '[name].js',
        path: BUILT_PATH,
        libraryTarget: 'commonjs2',
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    }
};

export default config;

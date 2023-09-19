const nodeResolve = require('@rollup/plugin-node-resolve');
const typescript = require('@rollup/plugin-typescript');
const dts = require('rollup-plugin-dts');
const path = require('path');
const pkg = require(path.resolve('package.json'));

const external = Object.keys(Object.assign({}, pkg.dependencies, pkg.peerDependencies));

module.exports = [
  {
    input: 'src/main/index.ts',
    output: [
      { file: 'lib/index.js', format: 'cjs' },
      { file: 'lib/index.mjs', format: 'es' },
    ],
    plugins: [
      nodeResolve(),

      typescript({
        tsconfig: path.resolve(__dirname, 'tsconfig.json'),
        include: 'src/main/**/*',
        compilerOptions: {
          paths: {},
        },
      }),
    ],
    external,
  },
  {
    input: 'src/main/index.ts',
    output: { file: 'lib/index.d.ts', format: 'es' },
    plugins: [dts.default()],
    external,
  },
];

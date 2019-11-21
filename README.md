# transfer.js

[![Version](https://img.shields.io/github/v/tag/ObserverOfTime/transfer.js?label=Version&logo=npm)](https://github.com/ObserverOfTime/transfer.js/packages)
[![Build](https://github.com/ObserverOfTime/transfer.js/workflows/Build/badge.svg)](https://github.com/ObserverOfTime/transfer.js/actions)
[![Coverage](https://img.shields.io/codecov/c/gh/ObserverOfTime/transfer.js?label=Coverage&logo=codecov)](https://codecov.io/gh/ObserverOfTime/transfer.js)

Node.js CLI tool for easy file sharing with [transfer.sh](https://transfer.sh)

## Install

The easiest way to get **transfer.js** is with npm or yarn:

```sh
$ npm install -g transfer.js
$ yarn global add transfer.js
```

## CLI Usage

### Example

```sh
$ transfer-js hello.txt --copy
```

Will return a link to the resource and copy it to your clipboard.

### Options

|        Option         |                        Description                        |
| :-------------------: | :-------------------------------------------------------: |
|   `-m, --max-days`    | Maximum number of days the file will stay on transfer.sh. |
| `-M, --max-downloads` |           Maximum number of downloads allowed.            |
|   `-D, --download`    |           Download the file from the given URL.           |
|   `-n, --file-name`   |                Name to use for the upload.                |
|     `-c, --copy`      |        Copy the file URL or path to the clipboard.        |
|  `-N, --no-progress`  |               Don't show the progress bar.                |
|    `-o, --output`     |            Output path of the downloaded file.            |

## Module usage

### Example

```javascript
const Transfer = require('transfer.js');

// Upload
new Transfer('./Hello.txt')
  .upload().progress((prog) => {
    console.log((prog.current / prog.total * 100).toFixed(1) + '%');
  }).then(console.log).catch(console.error);

// Download
new Transfer('https://transfer.sh/4bcD3/Hello.txt')
  .download().progress((prog) => {
    console.log((prog.current / prog.total * 100).toFixed(1) + '%');
  }).then(console.log).catch(console.error);
```

## Documentation

The documentation is available [here](https://observeroftime.github.io/transfer.js).

## Dependencies [![Dependencies](https://img.shields.io/david/ObserverOfTime/transfer.js.svg)](https://david-dm.org/ObserverOfTime/transfer.js)

- [cli-progress](https://ghub.io/cli-progress): Easy to use Progress-Bar for Command-Line/Terminal Applications
- [clipboardy](https://ghub.io/clipboardy): Access the system clipboard (copy/paste)
- [got](https://ghub.io/got): Simplified HTTP requests
- [mime-types](https://ghub.io/mime-types): The ultimate javascript content-type utility.
- [minimist](https://ghub.io/minimist): parse argument options
- [progress-promise](https://ghub.io/progress-promise): Promise subclass with mechanism to report progress before resolving

## Dev Dependencies [![Dev Dependencies](https://img.shields.io/david/dev/ObserverOfTime/transfer.js.svg)](https://david-dm.org/ObserverOfTime/transfer.js?type=dev)

- [@reconbot/jsdoc-theme](https://ghub.io/@reconbot/jsdoc-theme): A JSDoc Theme / Template
- [chai](https://ghub.io/chai): BDD/TDD assertion library for node.js and the browser. Test framework agnostic.
- [chai-as-promised](https://ghub.io/chai-as-promised): Extends Chai with assertions about promises.
- [codecov](https://ghub.io/codecov): Uploading report to Codecov: https://codecov.io
- [eslint](https://ghub.io/eslint): An AST-based pattern checker for JavaScript.
- [jsdoc](https://ghub.io/jsdoc): An API documentation generator for JavaScript.
- [mocha](https://ghub.io/mocha): simple, flexible, fun test framework
- [nyc](https://ghub.io/nyc): the Istanbul command line interface

## TODO

- [ ] Add more options to the executable
- [ ] Use a better argument parser
- [ ] Allow custom transfer domains
- [ ] Add executable tests

## Credits

Based on [transfer-sh](https://ghub.io/transfer-sh) by roccomuso.

## License

Licensed under the [ISC](./LICENSE) license.

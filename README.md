# transfer.js

[![Version](https://img.shields.io/npm/v/transfer.js.svg)](https://www.npmjs.com/package/transfer.js)
[![Build Status](https://img.shields.io/travis/ObserverOfTime/transfer.js.svg)](https://travis-ci.org/ObserverOfTime/transfer.js)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](./LICENSE)

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
$ transfer-js hello.txt --copy-url
```

Will return a link to the resource and copy it to your clipboard.

### Options

|        Option         |                        Description                        |
| :-------------------: | :-------------------------------------------------------: |
|   `-m, --max-days`    | Maximum number of days the file will stay on transfer.sh. |
| `-M, --max-downloads` |           Maximum number of downloads allowed.            |
|   `-n, --file-name`   |                Name to use for the upload.                |
|   `-c, --copy-url`    |            Copy the file URL to the clipboard.            |
|  `-N, --no-progress`  |               Don't show the progress bar.                |
|   `-p, --password`    |            Password used to encrypt the file.             |
|    `-d, --decrypt`    |         Decrypt the file (requires `--password`).         |
|    `-o, --output`     |                Decrypted file output path.                |

## Module usage

### Example

```javascript
const Transfer = require('transfer.js');

// Encrypt and upload
new Transfer('./Hello.md', {password: 's3cr3t', filename: 'Hello.enc'})
  .upload().progress(function(prog) {
    console.log(prog.current / prog.total * 100).toFixed(1) + '%');
  }).then(function(link) { console.log(link); })
  .catch(function(err) { console.error(err); });

// Decrypt
new Transfer('./Hello.enc', {password: 's3cr3t'})
  .decrypt('Output.md')
  .then(function(wStream) { console.log('Decrypted!'); })
  .catch(function(err) { console.error(err); });

```

### Options

|   Option   |                         Description                          |
| :--------: | :----------------------------------------------------------: |
| `filename` | If provided, the URL will use the provided name.<br>Otherwise, it will use the original name. |
| `password` | If provided, the file will be encrypted with `aes-256-cbc`<br>and encoded as base64 before the upload. |

## Dependencies [![Dependencies](https://img.shields.io/david/ObserverOfTime/transfer.js.svg)](https://david-dm.org/ObserverOfTime/transfer.js)

- [b64](https://ghub.io/b64): Base64 streaming encoder and decoder
- [block-stream2](https://ghub.io/block-stream2): transform input into equally-sized blocks of output
- [cli-progress](https://ghub.io/cli-progress): Easy to use Progress-Bar for Command-Line/Terminal Applications
- [clipboardy](https://ghub.io/clipboardy): Access the system clipboard (copy/paste)
- [concat-stream](https://ghub.io/concat-stream): writable stream that concatenates strings or binary data and calls a callback with the result
- [end-of-stream](https://ghub.io/end-of-stream): Call a callback when a readable/writable/duplex stream has completed or failed.
- [got](https://ghub.io/got): Simplified HTTP requests
- [minimist](https://ghub.io/minimist): parse argument options
- [progress-promise](https://ghub.io/progress-promise): Promise subclass with mechanism to report progress before resolving
- [pump](https://ghub.io/pump): pipe streams together and close all of them if one of them closes
- [through2](https://ghub.io/through2): A tiny wrapper around Node streams2 Transform to avoid explicit subclassing noise


## Dev Dependencies [![Dev Dependencies](https://img.shields.io/david/dev/ObserverOfTime/transfer.js.svg)](https://david-dm.org/ObserverOfTime/transfer.js?type=dev)

- [chai](https://ghub.io/chai): BDD/TDD assertion library for node.js and the browser. Test framework agnostic.
- [chai-as-promised](https://ghub.io/chai-as-promised): Extends Chai with assertions about promises.
- [doxdox](https://ghub.io/doxdox): JSDoc to Markdown, Bootstrap, and custom Handlebars template documentation generator.
- [eslint](https://ghub.io/eslint): An AST-based pattern checker for JavaScript.
- [mocha](https://ghub.io/mocha): simple, flexible, fun test framework

## TODO

- Support downloading

## Credits

Based on [transfer-sh](https://ghub.io/transfer-sh) by roccomuso


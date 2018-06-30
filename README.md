# transfer.js

[![NPM Version](https://img.shields.io/npm/v/transfer.js.svg)](https://www.npmjs.com/package/transfer.js)
[![Dependencies](https://david-dm.org/ObserverOfTime/transfer.js.png)](https://david-dm.org/ObserverOfTime/transfer.js)
[![Build Status](https://travis-ci.org/ObserverOfTime/transfer.js.svg?branch=)](https://travis-ci.org/ObserverOfTime/transfer.js)

Node.js CLI tool for easy file sharing with [Transfer.sh](https://transfer.sh)

## Install

The easiest way to get **transfer.js** is with npm or yarn:

```sh
$ npm install -g transfer.js
$ yarn global add transfer.js
```

## CLI Usage

```sh
$ transfer hello.txt --copy-url
```

Will return a link to the resource and copy the link to your clipboard.

### Options

|        Option         |                        Description                        |
| :-------------------: | :-------------------------------------------------------: |
|   `-m, --max-days`    | Maximum number of days the file will stay on transfer.sh. |
| `-M, --max-downloads` |           Maximum number of downloads allowed.            |
|   `-n, --file-name`   |                Name to use for the upload.                |
|   `-c, --copy-url`    |            Copy the file URL to the clipboard.            |
|   `-p, --password`    |            Password used to encrypt the file.             |
|    `-d, --decrypt`    |         Decrypt the file (requires `--password`).         |
|    `-o, --output`     |                Decrypted file output path.                |

## Module usage

```javascript
const Transfer = require('transfer.js');

// Encrypt and upload
new Transfer('./Hello.md', {password: 's3cr3t', filename: 'Hello.enc'})
  .upload()
  .then(function(link) { console.log(link) }) // it returns the link as a string
  .catch(function(err) { console.error(err) });

// Decrypt
new Transfer('./Hello.enc', {password: 's3cr3t'})
  .decrypt('Output.md')
  .then(function(wStream) { console.log('Decrypted!') }) // it returns a writableStream
  .catch(function(err) { console.error(err) });

```

### Options

|   Option   |                         Description                          |
| :--------: | :----------------------------------------------------------: |
| `filename` | If provided, the URL will use the provided name.<br>Otherwise, it will use the original name. |
| `password` | If provided, the file will be encrypted with `aes-256-cbc`<br>and encoded as base64 before the upload. |

## TODO

- Support downloading

## Credits

Based on [transfer-sh](https://github.com/roccomuso/transfer-sh) by roccomuso

## LICENSE

ISC


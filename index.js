const fs = require('fs');
const os = require('os');
const path = require('path');
const got = require('got');
const concat = require('concat-stream');
const pump = require('pump');
const crypto = require('crypto'); // eslint-disable-line no-shadow
const through2 = require('through2');
const b64 = require('b64');
const block = require('block-stream2');
const eos = require('end-of-stream');
const ProgressPromise = require('progress-promise');
const PassThroughStream = require('stream').PassThrough;
const TransferError = require('./lib/TransferError');
const domain = 'https://transfer.sh';

/**
 * Error handler
 *
 * @function
 * @private
 * @param {Error} error - The caught error
 * @param {string} file - The input file
 * @param {function} reject - Promise rejection
 */
function __catchError(error, file, reject) {
  let msg;
  const filePath = path.resolve(file);
  /* eslint-disable indent */
  switch(error.code) {
    case 'EACCESS':
      msg = 'Cannot read file: ' + filePath;
      reject(new TransferError(msg));
      break;
    case 'ENOENT':
      msg = 'File not found: ' + filePath;
      reject(new TransferError(msg));
      break;
    default:
      reject(error);
  }
  /* eslint-enable indent */
}

/**
 * Class representing a Transfer
 *
 * @class
 * @param {string} fileInput - File path
 * @param {Object} [options={}] - Transfer options
 * @param {Object} [httpOptions={}] - HTTP options
 */
function Transfer(fileInput, options={}, httpOptions={}) {
  const algorithm = 'aes-256-cbc';
  this.fileInput = fileInput;
  this.options = options;
  this.httpOptions = httpOptions;
  this.sEncrypt = this.options.password ?
    crypto.createCipher(algorithm, this.options.password) :
    new PassThroughStream();
  this.sDecrypt = this.options.password ?
    crypto.createDecipher(algorithm, this.options.password) :
    new PassThroughStream();
}

/**
 * Upload file
 *
 * @function
 * @returns {ProgressPromise.<string|TransferError>} -
 * The link if resolved, a TransferError if rejected
 */
Transfer.prototype.upload = function() {
  const self = this;
  const fileName = self.options.filename ||
    path.basename(self.fileInput);
  const fileURL = domain + '/' + fileName;
  return new ProgressPromise((resolve, reject, progress) => {
    if(!self.fileInput) reject(new TransferError('Missing file input'));
    fs.stat(self.fileInput, (error, stats) => {
      if(error) return __catchError(error, self.fileInput, reject);
      const inputStream = fs.createReadStream(self.fileInput);
      let encryptedStream;
      if(self.options.password)
        encryptedStream = self._encrypt(inputStream);
      pump(encryptedStream || inputStream,
        got.stream.put(fileURL, self.httpOptions)
          .on('uploadProgress', (p) => {
          // The uploaded size is roughly 1.016 times larger
          // than the actual size, likely due to the metadata
            const curr = parseInt(p.transferred / 1.016 + 0.5);
            progress({
              current: (curr < stats.size) ? curr : stats.size,
              total: stats.size,
              task: 'Upload'
            });
          }),
        concat((link) => resolve(link.toString())),
        reject);
    });
  });
};

/**
 * Encrypt file using aes-256-cbc and base64
 *
 * @function
 * @protected
 * @param {ReadStream} inputStream - The file stream to encrypt
 * @return {ReadStream} - The encrypted file stream
 */
Transfer.prototype._encrypt = function(inputStream) {
  return inputStream.pipe(this.sEncrypt)
    .pipe(new b64.Encoder())
    .pipe(block({size: 76, zeroPadding: false}))
    .pipe(through2(function(chunk, enc, next) {
      this.push(chunk + os.EOL); // New line every 76 chars
      next();
    }));
};

/**
 * Decrypt file
 *
 * @function
 * @param {string} destination - Destination path
 * @returns {Promise.<WritableStream|TransferError>} -
 * A WritableStream of the decrypted file if resolved,
 * a TransferError if rejected
 */
Transfer.prototype.decrypt = function(destination) {
  const self = this;
  return new Promise((resolve, reject) => {
    if(!destination)
      reject(new TransferError('Missing decrypted file destination'));
    const wStream = fs.createWriteStream(destination);
    eos(wStream, (err) => {
      if(err) return reject(err);
      resolve(this);
    });
    try {
      // Start decryption
      fs.createReadStream(self.fileInput)
        .pipe(new b64.Decoder())
        .pipe(self.sDecrypt)
        .pipe(wStream);
    } catch(error) {
      return __catchError(error, self.fileInput, reject);
    }
  });
};

/**
 * Download file
 *
 * @function
 * @param {string} destination - Destination path
 * @returns {ProgressPromise.<string|TransferError>} -
 * The path if resolved, a TransferError if rejected
 */
Transfer.prototype.download = function(destination) {
  const self = this;
  const url = self.fileInput;
  const filePath = destination || path.basename(url);
  return new ProgressPromise((resolve, reject, progress) => {
    if(!url) reject(new TransferError('Missing file URL'));
    pump(got.stream.get(url, self.httpOptions)
      .on('downloadProgress', (p) => {
        progress({
          current: p.transferred,
          total: p.total,
          task: 'Download'
        });
      }),
    concat((file) => {
      fs.writeFileSync(filePath, file);
      resolve(path.resolve(filePath));
    }),
    reject);
  });
};

module.exports = Transfer;


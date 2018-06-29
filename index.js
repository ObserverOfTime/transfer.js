const fs = require('fs');
const os = require('os');
const path = require('path');
const got = require('got');
const concat = require('concat-stream');
const pump = require('pump');
const crypto = require('crypto'); // eslint-disable-line no-shadow
const through2 = require('through2');
const base64 = require('base64-stream');
const block = require('block-stream2');
const eos = require('end-of-stream');
const PassThroughStream = require('stream').PassThrough;
const domain = 'https://transfer.sh';

/**
 * Creates a new transfer
 *
 * @class
 * @param {string} fileInput - File path
 * @param {Object} [options={}] - Transfer options
 * @param {Object} httpOptions - HTTP options
 */
function Transfer(fileInput, options={}, httpOptions) {
  if (!fileInput) throw Error('File input required');
  const algorithm = 'aes-256-cbc';
  this.fileInput = fileInput;
  this.options = options;
  this.httpOptions = httpOptions;
  this.inputStream = fs.createReadStream(fileInput);
  this.encryptedStream = null;
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
 * @returns {Promise.<string|Error>} -
 * The link as a string if resolved, an Error if rejected
 */
Transfer.prototype.upload = function() {
  const self = this;
  console.log(self.options.filename + ' | ' + path.basename(self.fileInput));
  const fileName = self.options.filename ||
    path.basename(self.fileInput);
  const fileURL = domain + '/' + fileName;
  if (this.options.password) this._crypt();
  return new Promise(function(resolve, reject) {
    pump(self.encryptedStream || self.inputStream,
      got.stream.put(fileURL, self.httpOptions),
      concat(function(link) { resolve(link.toString()); }),
      reject);
  });
};

/**
 * Encrypt file
 *
 * @function
 * @protected
 */
Transfer.prototype._crypt = function() {
  this.encryptedStream = this.inputStream.pipe(this.sEncrypt)
    .pipe(base64.encode())
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
 * @returns {Promise.<WritableStream|Error>} -
 * A WritableStream of the decrypted file if resolved, an Error if rejected
 */
Transfer.prototype.decrypt = function(destination) {
  if (!destination) throw Error('Destination missing.');
  const self = this;
  return new Promise(function(resolve, reject) {
    const wStream = fs.createWriteStream(destination);
    eos(wStream, function (err) {
      if (err)
        return reject(new Error('Stream had an error or closed early.'));
      resolve(this);
    });
    // Start decryption
    self.inputStream.pipe(base64.decode())
      .pipe(self.sDecrypt)
      .pipe(wStream);
  });
};

module.exports = Transfer;


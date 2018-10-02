const fs = require('fs');
const path = require('path');
const got = require('got');
const crypt = require('crypto');
const through2 = require('through2');
const b64 = require('b64');
const block = require('block-stream2');
const eos = require('end-of-stream');

const {EOL, tmpdir} = require('os');
const {lookup: mime} = require('mime-types');
const {PassThrough: PassThroughStream} = require('stream');

/** @external {ProgressPromise} https://www.npmjs.com/package/progress-promise */
const ProgressPromise = require('progress-promise');

/**
 * The root domain (https://transfer.sh)
 *
 * @constant
 * @protected
 * @type {string}
 * @todo Make this configurable
 */
const DOMAIN = 'https://transfer.sh';

/**
 * The algorithm used for encryption (aes-256-cbc)
 *
 * @constant
 * @protected
 * @type {string}
 */
const ALGORITHM = 'aes-256-cbc';

/**
 * Class representing a Transfer Error
 *
 * @extends {Error}
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error">Error</a>
 */
class TransferError extends Error {
  /**
   * Error name (TransferError)
   *
   * @override
   * @type {string}
   */
  get name() { return 'TransferError' }
}

/**
 * Error handler
 *
 * @private
 * @param {Error} error - The caught error
 * @param {string} file - The input file
 * @param {function} reject - Promise rejection
 */
function __catchError(error, file, reject) {
  let msg;
  const filePath = path.resolve(file);
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
}

/**
 * Class representing a Transfer
 *
 * @version 0.4.0
 */
class Transfer {
  /**
   * @typedef {Object} TransferOptions
   * @property {string} [password] - The password used for encryption/decryption
   * @property {string} [filename] - A custom filename for the upload
   */

  /**
   * @param {string} fileInput - File path
   * @param {TransferOptions} [options={}] - Transfer options
   * @param {Object} [httpOptions={}] - HTTP options
   */
  constructor(fileInput, options={}, httpOptions={}) {
    /**
     * The input file path/URL
     *
     * @type {string}
     */
    this.fileInput = fileInput;
    /** The transfer options object
     *
     * @type {TransferOptions}
     */
    this.options = options;
    /** An HTTP options object
     *
     * @type {Object}
     * @see <a href="https://nodejs.org/api/http.html#http_http_request_options_callback">Node HTTP Options</a>
     */
    this.httpOptions = httpOptions;
  }

  get sEncrypt() {
    return this.options.password ?
      crypt.createCipher(ALGORITHM, this.options.password) :
      new PassThroughStream();
  }

  get sDecrypt() {
    return this.options.password ?
      crypt.createDecipher(ALGORITHM, this.options.password) :
      new PassThroughStream();
  }

  /**
   * Adds <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type">Content-Type</a>
   * header to the request
   *
   * @protected
   * @since 0.4.0
   * @param {Object} options - An HTTP options object
   * @param {string} [file=null] - The input file
   */
  _contentType(options, file=null) {
    if(!options.headers['Content-Type']) {
      if(file !== null) {
        options.headers['Content-Type'] =
          mime(path.extname(file)) || 'text/plain';
      } else {
        options.headers['Content-Type'] =
          'application/octet-stream';
      }
    }
  }

  /**
   * Upload a file to {@link DOMAIN}
   *
   * @returns {ProgressPromise.<string|TransferError>} -
   * The link if resolved, a TransferError if rejected
   */
  upload() {
    const self = this;
    const fileName = self.options.filename ||
      path.basename(self.fileInput);
    const fileURL = DOMAIN + '/' + fileName;
    return new ProgressPromise((resolve, reject, progress) => {
      if(!self.fileInput) reject(new TransferError('Missing file input'));
      fs.stat(self.fileInput, (error, stats) => {
        if(error) return __catchError(error, self.fileInput, reject);
        const fileStream = fs.createReadStream(self.fileInput);
        if(self.options.password) {
          self.httpOptions.body = self._encrypt(fileStream);
          self._contentType(self.httpOptions);
        } else {
          self.httpOptions.body = fileStream;
          self._contentType(self.httpOptions, self.fileInput);
        }
        got.put(fileURL, self.httpOptions)
          .on('uploadProgress', (p) => {
            // The uploaded size is roughly 1.016 times larger
            // than the actual size, likely due to the metadata
            const curr = parseInt(p.transferred / 1.016 + 0.5);
            progress({
              current: (curr < stats.size) ? curr : stats.size,
              total: stats.size,
              task: 'Upload'
            });
          }).then((res) => resolve(res.body)).catch(reject);
      });
    });
  }

  /**
   * Download a file from {@link DOMAIN}
   *
   * @function
   * @param {string} destination - Destination path
   * @returns {ProgressPromise.<string|TransferError>} -
   * The path if resolved, a {@link TransferError} if rejected
   * @todo Support decrypting
   */
  download(destination) {
    const self = this;
    const url = self.fileInput;
    const filePath = destination || path.basename(url);
    return new ProgressPromise((resolve, reject, progress) => {
      if(!url) reject(new TransferError('Missing file URL'));
      got.get(url, self.httpOptions)
        .on('downloadProgress', p => {
          progress({
            current: p.transferred,
            total: p.total,
            task: 'Download'
          });
        }).then((res) => {
          fs.writeFileSync(filePath, res.body);
          resolve(path.resolve(filePath));
        }).catch(reject);
    });
  }

  /**
   * Encrypt a file using {@link ALGORITHM} and base64
   *
   * @function
   * @protected
   * @param {ReadStream} inputStream - The file stream to encrypt
   * @return {ReadStream} - The encrypted file stream
   * @see <a href="https://nodejs.org/api/stream.html#stream_class_stream_readable">ReadStream</a>
   */
  _encrypt(inputStream) {
    const tmpfile = path.join(tmpdir(),
      Math.random().toString(16).substr(2));
    inputStream.pipe(this.sEncrypt)
      .pipe(new b64.Encoder())
      .pipe(block({size: 76, zeroPadding: false}))
      .pipe(fs.createWriteStream(tmpfile));
    return fs.createReadStream(tmpfile);
  }

  /**
   * Decrypt a file encrypted with {@link Transfer#_encrypt}
   *
   * @function
   * @param {string} destination - Destination path
   * @returns {Promise.<WriteStream|TransferError>} -
   * A WriteStream of the decrypted file if resolved,
   * a TransferError if rejected
   * @see <a href="https://nodejs.org/api/stream.html#stream_class_stream_writable">WriteStream</a>
   */
  decrypt(destination) {
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
  }
}

module.exports = {Transfer, TransferError};


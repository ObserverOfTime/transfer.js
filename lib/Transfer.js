const fs = require('fs');
const path = require('path');

const {EOL, tmpdir} = require('os');
const {lookup: mime} = require('mime-types');

/**
 * @external got
 * @desc A human-friendly and powerful HTTP request library
 * @see {@link https://www.npmjs.com/package/got|got}
 */
const got = require('got');

/**
 * @external ProgressPromise
 * @desc Promise subclass with mechanism to report progress before resolving
 * @see {@link https://www.npmjs.com/package/progress-promise|progress-promise}
 */
const ProgressPromise = require('progress-promise');

/**
 * The root domain
 *
 * @constant
 * @type {string}
 * @default <a href="https://transfer.sh">https://transfer.sh</a>
 * @todo Make this configurable
 */
const DOMAIN = 'https://transfer.sh';

/**
 * Class representing a Transfer Error
 *
 * @extends {Error}
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error">Error</a>
 */
class TransferError extends Error {
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
   * @param {Object} [options={}] - {@link external:got|got} options
   */
  constructor(fileInput, options={}) {
    /**
     * The input file path/URL
     *
     * @type {string}
     */
    this.fileInput = fileInput;
    /** A {@link external:got|got} options object
     *
     * @type {Object}
     * @see <a href="https://github.com/sindresorhus/got#options">got options</a>
     */
    this.options = options;
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
   * @param {string} [filename] - The name of the uploaded file
   * @returns {external:ProgressPromise.<string|TransferError>} -
   * The link if resolved, a TransferError if rejected
   */
  upload(filename) {
    const self = this;
    if(!filename) filename = path.basename(self.fileInput);
    const fileURL = DOMAIN + '/' + filename;
    return new ProgressPromise((resolve, reject, progress) => {
      if(!self.fileInput) reject(new TransferError('Missing file input'));
      fs.stat(self.fileInput, (error, stats) => {
        if(error) return __catchError(error, self.fileInput, reject);
        const fileStream = fs.createReadStream(self.fileInput);
        if(self.options.password) {
          self.options.body = self._encrypt(fileStream);
          self._contentType(self.options);
        } else {
          self.options.body = fileStream;
          self._contentType(self.options, self.fileInput);
        }
        got.put(fileURL, self.options)
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
   * @param {string} destination - Destination path
   * @returns {external:ProgressPromise.<string|TransferError>} -
   * The path if resolved, a {@link TransferError} if rejected
   * @todo Support decrypting
   */
  download(destination) {
    const self = this;
    const url = self.fileInput;
    const filePath = destination || path.basename(url);
    return new ProgressPromise((resolve, reject, progress) => {
      if(!url) reject(new TransferError('Missing file URL'));
      got.get(url, self.options)
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
}

module.exports = {Transfer, TransferError};


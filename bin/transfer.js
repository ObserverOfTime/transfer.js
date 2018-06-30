#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2), {
  boolean: 'copy-url',
  string: [
    'max-days',
    'max-downloads',
    'output',
    'decrypt',
    'password',
    'file-name'
  ],
  alias: {
    'help': 'h',
    'version': 'v',
    'max-days': 'm',
    'max-downloads': 'M',
    'output': 'o',
    'decrypt': 'd',
    'password': 'p',
    'copy-url': 'c',
    'file-name': 'n'
  }
});
const clipboardy = require('clipboardy');
const Transfer = require('../index');
const pkg = require('../package');
const help = `\
  CLI tool for easy file sharing with https://transfer.sh

  \x1b[4mUsage\x1b[0m
    $ transfer <file> [OPTIONS]

  \x1b[4mOptions\x1b[0m
    -m, --max-days       Maximum number of days.
    -M, --max-downloads  Maximum number of downloads.
    -n, --file-name      Name to use for the upload.
    -c, --copy-url       Copy the file URL to the clipboard.
    -p, --password       Password used to encrypt the file.
    -d, --decrypt        Decrypt the file (requires --password).
    -o, --output         Decrypted file output path.
    -v, --version        Print the version and exit.
    -h, --help           Print this help text and exit.

    \x1b[4mExamples\x1b[0m
      $ transfer README.md -n README.tmp.md -m 1
      $ transfer README.md -p password
      $ transfer -d README.md -p password
`;

/**
 * Error handler
 *
 * @function
 * @param {Error} err - Caught error
 */
function catchError(err) {
  if (err) {
    console.error(err.stack);
    process.exit(1);
  }
}

/**
 * URL handler
 *
 * @function
 * @param {string} url - File URL on transfer.sh
 */
function gotUrl(url) {
  console.log(' ' + url);
  if(argv.c) {
    clipboardy.write(url).then(function () {
      console.log(' \u2713 Link copied to clipboard\n');
    }).catch(catchError);
  }
}

/**
 * Checks whether arguments were passed
 *
 * @returns {boolean} - True if no arguments were passed
 */
function noArgs() {
  return (argv._.length === 0 &&
    Object.keys(argv).length === 1);
}

if(noArgs()) {
  console.error(help);
  process.exit(2);
}

if(argv.h) {
  console.log(help);
  process.exit(0);
}

if (argv.v) {
  console.log('v' + pkg.version);
  process.exit(0);
}

const opts = {
  password: argv.p,
  filename: argv.n
};
const httpOpts = {
  headers: {
    'User-Agent': `${pkg.name}/${pkg.version}`
  }
};
if(argv.m) httpOpts.headers['Max-Days'] = argv.m;
if(argv.M) httpOpts.headers['Max-Downloads'] = argv.M;

if(argv.d) { // Decrypt
  if(!argv.p)
    catchError(new Error('No password provided'));
  const ext = require('path').extname(argv.d);
  let output = (!ext) ? `${argv.d}-decrypted` :
    `${argv.d.replace(ext, '')}-decrypted${ext}`;
  if(argv.o) output = argv.o;
  new Transfer(argv.d, opts, httpOpts)
    .decrypt(output)
    .then(() => console.log('Successfully decrypted in', output))
    .catch(catchError);
} else { // Encrypt (if requested) and upload each file
  if(argv._.length === 0) argv._.push('');
  for(const i in argv._) {
    new Transfer(argv._[i], opts, httpOpts)
      .upload()
      .then(gotUrl)
      .catch(catchError);
  }
}


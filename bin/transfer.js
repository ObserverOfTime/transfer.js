#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2), {
  boolean: [
    'copy-url',
    'no-progress'
  ],
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
    'file-name': 'n',
    'no-progress': 'N'
  }
});
const cliProgress = require('cli-progress');
const bar = new cliProgress.Bar({
  format: '{task}ing [{bar}] {percentage}%' +
    ' | ETA: {eta_formatted} | {value}/{total}',
  barsize: 30, fps: 2, etaBuffer: 4
}, cliProgress.Presets.legacy);
const clipboardy = require('clipboardy');
const Transfer = require('../index');
const pkg = require('../package');
const help = `\
  CLI tool for easy file sharing with https://transfer.sh

  \x1b[4mUsage\x1b[0m
    $ transfer <file> [OPTIONS]

  \x1b[4mOptions\x1b[0m
    -m, --max-days [NUMBER]       Maximum number of days.
    -M, --max-downloads [NUMBER]  Maximum number of downloads.
    -n, --file-name [NAME]        Name to use for the upload.
    -p, --password [PASS]         Password used to encrypt the file.
    -d, --decrypt [FILE]          Decrypt the file (requires --password).
    -o, --output [PATH]           Decrypted file output path.
    -c, --copy-url                Copy the file URL to the clipboard.
    -N, --no-progress             Don't show the progress bar.
    -v, --version                 Print the version and exit.
    -h, --help                    Print this help text and exit.

    \x1b[4mExamples\x1b[0m
      $ transfer README.md -n README.tmp.md -m 1
      $ transfer README.md -p p4ssw0rd
      $ transfer -d README.md -p p4ssw0rd
`;

/**
 * Error handler
 *
 * @function
 * @param {Error} err - The caught error
 */
function catchError(err) {
  if (err) {
    if(!argv.N) bar.stop();
    console.error(err.stack);
    process.exit(1);
  }
}

/**
 * URL handler
 *
 * @function
 * @param {string} url - The URL of the file
 */
function gotUrl(url) {
  if(!argv.N) {
    bar.update(bar.total);
    bar.stop();
  }
  console.log(url);
  if(argv.c) {
    clipboardy.write(url).then(() => {
      console.log(' \uD83D\uDCCB Link copied to clipboard');
    }).catch(catchError);
  }
}

/**
 * Progress handler
 *
 * @function
 * @param {Object} prog - Progress details
 */
function progressBar(prog) {
  if(!argv.N) {
    if(!bar.startTime) {
      bar.start(prog.total, 0, {task: prog.task});
    } else {
      bar.update(prog.current);
    }
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
  console.log(pkg.name + ' v' + pkg.version);
  process.exit(0);
}

const opts = {
  password: argv.p,
  filename: argv.n
};
const httpOpts = {
  headers: {
    'User-Agent': `${pkg.name}/${pkg.version}`
  },
  throwHttpErrors: true
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
      .progress(progressBar)
      .then(gotUrl)
      .catch(catchError);
  }
}


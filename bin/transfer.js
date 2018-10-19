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
    'file-name',
    'download'
  ],
  alias: {
    'help': 'h',
    'version': 'v',
    'max-days': 'm',
    'max-downloads': 'M',
    'output': 'o',
    'copy': 'c',
    'file-name': 'n',
    'no-progress': 'N',
    'download': 'D'
  }
});

const cliProgress = require('cli-progress');
const clipboardy = require('clipboardy');

const Transfer = require('..');
const {name: pkg, version} = require('../package');

const bar = new cliProgress.Bar({
  format: '{task}ing [{bar}] {percentage}%' +
  ' | ETA: {eta_formatted} | {value}/{total}',
  barsize: 30, fps: 2, etaBuffer: 4
}, cliProgress.Presets.legacy);

const help = `\
  CLI tool for easy file sharing with https://transfer.sh

  \x1b[4mUsage\x1b[0m\n
    $ transfer-js [FILE] [OPTIONS]

  \x1b[4mOptions\x1b[0m\n
    -m, --max-days [NUMBER]       Maximum number of days.
    -M, --max-downloads [NUMBER]  Maximum number of downloads.
    -D, --download [URL]          Download file from URL.
    -n, --file-name [NAME]        Name to use for the upload.
    -o, --output [PATH]           Decrypted/downloaded file output path.
    -c, --copy                    Copy the file URL/path to the clipboard.
    -N, --no-progress             Don't show the progress bar.
    -v, --version                 Print the version and exit.
    -h, --help                    Print this help text and exit.

  \x1b[4mExamples\x1b[0m\n
    Upload file for 1 day with a custom name:
      $ transfer-js file.txt -n file.tmp -m 1
    Download file:
      $ transfer-js -D https://transfer.sh/I2ea5/file.txt
`;

/**
 * Error handler
 *
 * @protected
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
 * File handler
 *
 * @protected
 * @param {string} file - The URL or path of the file
 */
function gotFile(file) {
  if(!argv.N) {
    bar.update(bar.total);
    bar.stop();
  }
  console.log(file);
  if(argv.c) {
    clipboardy.write(file).then(() => {
      console.log(' \uD83D\uDCCB Copied to the clipboard');
    }).catch(catchError);
  }
}

/**
 * Progress handler
 *
 * @protected
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

if (argv.v) {
  console.log(`${pkg} v${version}`);
  process.exit(0);
}

/**
 * Identifies whether arguments were passed
 *
 * @constant
 * @protected
 * @type {boolean}
 */
const HAS_ARGS = (argv._.length > 0 && Object.keys(argv).length > 3);

if(!HAS_ARGS) {
  console.error(help);
  process.exit(2);
}

if(argv.h) {
  console.log(help);
  process.exit(0);
}

const options = {
  headers: {
    'User-Agent': `${pkg}/${version}`
  },
  throwHttpErrors: true
};
if(argv.m) options.headers['Max-Days'] = argv.m;
if(argv.M) options.headers['Max-Downloads'] = argv.M;

if(argv.D) { // Download
  new Transfer(argv.D, options)
    .download(argv.o)
    .progress(progressBar)
    .then(gotFile)
    .catch(catchError);
} else { // Upload
  for(const i in argv._) {
    new Transfer(argv._[i], options)
      .upload(argv.n)
      .progress(progressBar)
      .then(gotFile)
      .catch(catchError);
  }
}


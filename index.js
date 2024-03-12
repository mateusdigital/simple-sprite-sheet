//~---------------------------------------------------------------------------//
//                               *       +                                    //
//                         '                  |                               //
//                     ()    .-.,="``"=.    - o -                             //
//                           '=/_       \     |                               //
//                        *   |  '=._    |                                    //
//                             \     `=./`,        '                          //
//                          .   '=.__.=' `='      *                           //
//                 +                         +                                //
//                      O      *        '       .                             //
//                                                                            //
//  File      : index.js                                                      //
//  Project   : simple-sprite-sheet                                           //
//  Date      : 2024-03-12                                                    //
//  License   : See project's COPYING.TXT for full info.                      //
//  Author    : mateus.digital <hello@mateus.digital>                         //
//  Copyright : mateus.digital - 2024                                         //
//                                                                            //
//  Description :                                                             //
//                                                                            //
//---------------------------------------------------------------------------~//


//
// Imports
//

// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const sharp = require('sharp');
const inspector = require('inspector');
const yargs = require('yargs');

const packageJson = require('./package.json'); // Change the path if necessary

//
// Constants
//

// -----------------------------------------------------------------------------
const PROGRAM_NAME            = "simple-sprite-sheet";
const PROGRAM_VERSION         = packageJson.version;
const PROGRAM_AUTHOR_FULL     = "mateus.digital <hello@mateus.digital>";
const PROGRAM_AUTHOR_SHORT    = "mateus.digital";
const PROGRAM_COPYRIGHT_YEARS = "2024";
const PROGRAM_WEBSITE         = "https://mateus.digital";


//
// Globals
//

// -----------------------------------------------------------------------------
let Options = {};



//
// Check if we have a debugger.
//

//------------------------------------------------------------------------------
function isInDebugMode() {
  return inspector.url() !== undefined;
}


if (isInDebugMode()) {
  console.log('Debugger is attached.');
  Options = {
    inputPath: path.join(process.cwd(), "images"),
    outputPath: path.join(process.cwd(), "spriteSheet.png")
  }

} else {
  Options = handleCommandLineOptions();
}


//
// Command line args
//

//------------------------------------------------------------------------------
function handleCommandLineOptions() {
  const options = yargs(process.argv.slice(2))
    .usage(`Usage: ${PROGRAM_NAME} --input-path [inputPath] --output-path [outputPath]`)
    .option('help', {
      describe: 'Show this screen',
      type: 'boolean'
    }).alias('h', 'help')

    .version(false)
    .option('version', {
      describe: 'Show version information',
      type: 'boolean'
    }).alias('v', 'version')

    .option('input-path', {
      describe: 'Path to the images directory',
      type: 'string',
    })

    .option('output-path', {
      describe: 'Path to the sprite sheet destination',
      type: 'string',
    })

    .example(`${PROGRAM_NAME} --input-path images --output-path spriteSheet.png`, '')


  //------------------------------------------------------------------------------
  if (options.argv.help) {
    yargs.showHelp();
    process.exit();
  }

  if (options.argv.version) {
    console.log(`${PROGRAM_NAME} - ${PROGRAM_VERSION} - ${PROGRAM_AUTHOR_FULL}`);
    console.log(`Copyright (c) ${PROGRAM_COPYRIGHT_YEARS} - ${PROGRAM_AUTHOR_SHORT}`);
    console.log(`This is a free software (GPLv3) - Share/Hack it`);
    console.log(`Check ${PROGRAM_WEBSITE} for more :)`);
    console.log("");
    process.exit();
  }

  const inputPath  = options.argv["input-path"];
  let   outputPath = options.argv["output-path"];

  if(!inputPath) {
    console.error("Missing input-path\n");
    yargs.showHelp();
    process.exit(1);
  }

  if(!outputPath) {
    outputPath = inputPath + ".png";
  }

  return {
    inputPath:  inputPath,
    outputPath: outputPath
  }
}


//
//
//

// -----------------------------------------------------------------------------
fs.readdir(Options.inputPath, (err, files) => {
  if (err) {
    console.error("Could not list the directory.", err);
    process.exit(1);
  }

  const fullpaths = files
    .filter((filepath) => {
      return filepath.endsWith("png");
    }).map((filepath) => {
      return path.join(Options.inputPath, filepath);
    });

  if (fullpaths.length == 0) {
    console.error("No images were found in the directory");
    process.exit(1);
  }

  _createSpriteSheet(fullpaths);
});


//
//
//

// -----------------------------------------------------------------------------
async function _createSpriteSheet(filenames) {

  // Check if all images has the same size.
  const baseMetadata = await sharp(filenames[0]).metadata();
  for (let filename of filenames) {
    const currMetadata = await sharp(filename).metadata();
    if (currMetadata.width != baseMetadata.width ||
      currMetadata.height != baseMetadata.height) {
      console.error("Not all images are the same size - which is required now");
      console.error("Offending image:", filename);
      process.exit(1);
    }
  }

  // calculate the size of the sprite sheet.
  const rowsCols = Math.trunc(Math.sqrt(filenames.length + 1));
  const spriteSheetWidth  = (baseMetadata.width  * rowsCols);
  const spriteSheetHeight = (baseMetadata.height * rowsCols);

  // Create the SpriteSheet image.
  const baseImage = sharp({
    create: {
      width:  spriteSheetWidth,
      height: spriteSheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  const compositeOptions = filenames.map((filename, index) => ({
    input: filename,
    left: Math.trunc(index % rowsCols) * baseMetadata.width,
    top:  Math.trunc(index / rowsCols) * baseMetadata.height
  }));

  baseImage
    .composite(compositeOptions)
    .toFile(Options.outputPath, (err, info) => {
      if (err) {
        console.error("Error generating sprite sheet", err);
      } else {
        console.log("Sprite sheet generated:", info);
      }
    });
}

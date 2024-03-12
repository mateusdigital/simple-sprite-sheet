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
  const options = yargs
    .usage('Usage: $0 --input-path [inputPath] --output-path [outputPath]')
    .option('help', {
      describe: 'Show this screen',
      type: 'boolean'
    }).alias('h', 'help')

    .option('version', {
      describe: 'Show version information',
      type: 'boolean'
    }).alias('v', 'version')

    .option('input-path', {
      describe: 'Path to the images directory',
      type: 'string',
      demandOption: true
    })

    .option('output-path', {
      describe: 'Path to the sprite sheet destination',
      type: 'string',
      default: './spriteSheet.png'
    })

    .example('$0 --input-path images --output-path spriteSheet.png', '')
    .argv;

  //------------------------------------------------------------------------------
  if (options.help) {
    yargs.showHelp();
    process.exit();
  }

  if (options.version) {
    console.log(`Copyright information`);
    process.exit();
  }

  return {
    inputPath: options["input-path"],
    outputPath: options["output-path"],
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

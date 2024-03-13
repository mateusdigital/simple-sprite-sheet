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
    outputPath: path.join(process.cwd(), "spriteSheet.png"),
    trim: true,
    crop: "smallest",
    scale: 0.3
  }

} else {
}

Options = handleCommandLineOptions();

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

    .option('trim', {
      describe: 'Trim the input images',
      type: 'boolean'
    })

    .option('crop', {
      describe: 'Crop the input images',
      type: 'string'
    })

    .option('scale', {
      describe: 'Scale the output',
      type: 'number'
    })

    .example(`${PROGRAM_NAME} --input-path images --output-path spriteSheet.png`, '')


  //------------------------------------------------------------------------------
  if (options.argv.help) {
    yargs.showHelp();
    process.exit();
  }

  if (options.argv.version) {
    console.log(`${PROGRAM_NAME} - ${PROGRAM_VERSION} - ${PROGRAM_AUTHOR_FULL}`);
    console.log(`Copyrighdt (c) ${PROGRAM_COPYRIGHT_YEARS} - ${PROGRAM_AUTHOR_SHORT}`);
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
    outputPath: outputPath,
    trim:       options.argv.trim,
    crop:       options.argv.crop,
    scale:      options.argv.scale
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

  console.log("Reading input files:", Options.inputPath);
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
async function _loadImages(filenames)
{
  console.log("Loading...");
  let images = [];
  for (let filename of filenames) {
    const image = await sharp(filename);
    images.push(image);
  }
  return images;
}

//------------------------------------------------------------------------------
async function _trimImages(images)
{
  console.log("Trimming...");
  // Trim each input image
  const trimmedImages = [];
  // @XXX: not good, but trim + getting metadata isn't working correctly
  // need to learn the lib a bit better, but now doing the crude way...
  for (let image of images) {
    const trimmedImageBuffer = await image.trim().toBuffer();
    const trimmedImage       = await sharp(trimmedImageBuffer);
    trimmedImages.push(trimmedImage);
  }

  return trimmedImages;
}

//------------------------------------------------------------------------------
async function _cropImages(images, rect)
{
  console.log("Cropping...", rect);
  // Crop each input image
  const _cropImages = [];
  // @XXX: not good, but crop + getting metadata isn't working correctly
  // need to learn the lib a bit better, but now doing the crude way...

  for (let image of images) {
    const metadata = image.__metadata__;
    if(rect.width * rect.height > metadata.width * metadata.height) {
      _cropImages.push(image.clone());
    } else {
      const croppedImageBuffer = await image.extract(rect).toBuffer();
      const croppedImage       = await sharp(croppedImageBuffer);
      _cropImages.push(croppedImage);
    }

  }

  return _cropImages;
}

//------------------------------------------------------------------------------
async function _loadAndSetMetadata(images)
{
  console.log("Loading metadata...");
  for (let image of images) {
    var meta = await image.metadata();
    image.__metadata__ = meta;
  }
}

//------------------------------------------------------------------------------
async function _findBoundingRects(images)
{
  // Find the biggest bouding-rect all all images.
  const smallestRect = { left: 0, top: 0, width: Infinity, height: Infinity };
  const biggestRect  = { left: 0, top: 0, width: 0, height: 0 };


  for (const image of images) {
    const metadata = image.__metadata__;
    // console.log("Current rect:", metadata.width, "", metadata.height);
    if (biggestRect.width < metadata.width) {
      biggestRect.width = metadata.width;
    } else if (smallestRect.width > metadata.width) {
      smallestRect.width = metadata.width;
    }

    if (biggestRect.height < metadata.height) {
      biggestRect.height = metadata.height;
    } else if (smallestRect.height > metadata.height) {
      smallestRect.height = metadata.height;
    }
  }

  return { smallestRect, biggestRect } ;
}

// -----------------------------------------------------------------------------
async function _createSpriteSheet(filenames) {

  //
  // Load
  //

  let images = await _loadImages(filenames);

  //
  // Trim
  //

  if(Options.trim) {
    images = await _trimImages(images);
  }

  await _loadAndSetMetadata(images);
  const {smallestRect, biggestRect} = await _findBoundingRects(images);

  //
  // Crop
  //

  if(Options.crop)
  {
    const clean_option = Options.crop.toLowerCase().trim();

    let rect = null;
    if(clean_option == "smallest") {
      rect = smallestRect;
    } else if(clean_option == "biggest") {
      rect = biggestRect;
    } else {
        const comp = clean_option.split(",");
        if(comp.length == 4) {
          const left   = parseInt(comp[0]);
          const top    = parseInt(comp[1]);
          const width  = parseInt(comp[2]);
          const height = parseInt(comp[3]);

          if(!isNaN(left) && !isNaN(top) && !isNaN(width) && !isNaN(height)) {
            rect = { left, top, width, height };
          }
        } else {
          const index_option = parseInt(clean_option.replace(" ", ""));
          if(!isNaN(index_option) && index_option < images.length) {
            const metadata = images[index_option].__metadata__;
            rect = { left: 0, top: 0, width: metadata.width, height: metadata.height };
          }
        }

      if(rect == null) {
        console.error("Invalid crop option:", Options.crop);
        process.exit(1);
      }
    }

    images = await _cropImages(
      images,
      rect
    );
    await _loadAndSetMetadata(images);
  }

  //
  // Process
  //

  // calculate the size of the sprite sheet.
  const rowsCols          = Math.trunc(Math.sqrt(images.length + 1));
  const spriteSheetWidth  = (biggestRect.width  * rowsCols);
  const spriteSheetHeight = (biggestRect.height * rowsCols);

  // Create the SpriteSheet image.
  const baseImage = sharp({
    create: {
      width:  spriteSheetWidth,
      height: spriteSheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  const compositeOptions = await Promise.all(images.map(async (image, index) => {
    const metadata = image.__metadata__;

    let x = Math.trunc(index % rowsCols) * biggestRect.width;
    let y = Math.trunc(index / rowsCols) * biggestRect.height;

    // Center the image on the drawable area.
    x += Math.round(biggestRect.width  * 0.5 - metadata.width  * 0.5);
    y += Math.round(biggestRect.height * 0.5 - metadata.height * 0.5);

    return {
      input: await image.toBuffer(),
      left: x,
      top:  y
    };
  }));

  try {
    // Generate the output buffer
    await baseImage.composite(compositeOptions).toFile(Options.outputPath);

    // Scale the output if specified
    if (Options.scale) {
      let safe_float = parseFloat(Options.scale);
      if (isNaN(safe_float) || safe_float <= 0.0) {
        throw new Error("Invalid scale");
      }
      if (safe_float > 1.0) {
        safe_float /= 10;
      }

      const width = Math.round(spriteSheetWidth * safe_float);
      const height = Math.round(spriteSheetHeight * safe_float);

      await sharp(Options.outputPath)
        .resize(width, height, { fit: 'inside' })
        .toFile(Options.outputPath + "-resized");

      fs.renameSync(Options.outputPath + "-resized", Options.outputPath);
    }

    console.log("Sprite sheet generated:", Options.outputPath);
  } catch (err) {
    console.error("Error generating sprite sheet:", err.message);
  }
}

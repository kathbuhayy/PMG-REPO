/**
 * dpiCheck
 *
 * Sub-Module 5.1/5.2: reads an uploaded image's actual pixel dimensions
 * and estimates whether it has enough resolution to print clearly at a
 * given physical size.
 *
 * Honest limitation: true DPI depends on the exact print size in real
 * inches, which isn't tracked per print-zone in the schema yet — only
 * percentages of a zone are stored. This uses a configurable default
 * print-area size (defaults to a standard 10x12in chest print) as the
 * assumed physical size. Pass real inches when you have them (e.g. once
 * a product defines its own print area in inches) for an accurate result.
 */

const DPI_GOOD = 300;
const DPI_ACCEPTABLE = 150;

/**
 * @param {File} file
 * @param {{widthInches:number, heightInches:number}} [printArea] - the
 *   physical size the image will be printed at, at its current scale.
 * @returns {Promise<{
 *   naturalWidth: number,
 *   naturalHeight: number,
 *   dpi: number,
 *   level: "good"|"acceptable"|"poor",
 *   message: string
 * }>}
 */
export function assessImageResolution(
  file,
  printArea = { widthInches: 10, heightInches: 12 }
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const dpiX = img.naturalWidth / printArea.widthInches;
      const dpiY = img.naturalHeight / printArea.heightInches;
      const dpi = Math.round(Math.min(dpiX, dpiY));

      let level, message;
      if (dpi >= DPI_GOOD) {
        level = "good";
        message = "Good resolution — this will print sharp.";
      } else if (dpi >= DPI_ACCEPTABLE) {
        level = "acceptable";
        message = `This image is ${dpi} DPI at this size — usable, but not ideal. For best results, use a higher-resolution image or a smaller print size.`;
      } else {
        level = "poor";
        message = `This image is only ${dpi} DPI at this size — it will likely look blurry when printed. Try a higher-resolution image or reduce the print size.`;
      }

      resolve({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        dpi,
        level,
        message,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };

    img.src = url;
  });
}
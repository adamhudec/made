const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const img = document.getElementById("sourceImage");

const radiusSlider = document.getElementById("radiusSlider");
const strengthSlider = document.getElementById("strengthSlider");
const artifactSlider = document.getElementById("artifactSlider");

const radiusValue = document.getElementById("radiusValue");
const strengthValue = document.getElementById("strengthValue");
const artifactValue = document.getElementById("artifactValue");

let originalImageData;

img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyFilteredImage();
};

radiusSlider.addEventListener("input", applyFilteredImage);
strengthSlider.addEventListener("input", applyFilteredImage);
artifactSlider.addEventListener("input", applyFilteredImage);

function applyFilteredImage() {
  const radius = parseInt(radiusSlider.value);
  const strength = parseFloat(strengthSlider.value) / 100;
  const artifactStrength = parseFloat(artifactSlider.value) / 100;

  radiusValue.textContent = radius;
  strengthValue.textContent = strength.toFixed(2);
  artifactValue.textContent = artifactStrength.toFixed(2);

  ctx.putImageData(originalImageData, 0, 0);
  const filteredData = applyKuwaharaFilter(canvas.width, canvas.height, radius, artifactStrength);

  // Blend original and filtered based on strength
  const blendedData = ctx.createImageData(canvas.width, canvas.height);
  const orig = originalImageData.data;
  const filt = filteredData.data;
  const blend = blendedData.data;

  for (let i = 0; i < orig.length; i += 4) {
    blend[i]     = (1 - strength) * orig[i]     + strength * filt[i];
    blend[i + 1] = (1 - strength) * orig[i + 1] + strength * filt[i + 1];
    blend[i + 2] = (1 - strength) * orig[i + 2] + strength * filt[i + 2];
    blend[i + 3] = 255;
  }

  ctx.putImageData(blendedData, 0, 0);
}

function applyKuwaharaFilter(width, height, radius, artifactStrength = 1.0) {
  const srcData = ctx.getImageData(0, 0, width, height);
  const src = srcData.data;
  const dstData = ctx.createImageData(width, height);
  const dst = dstData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVariance = Infinity;
      let bestMean = [0, 0, 0];

      for (let quadrant = 0; quadrant < 4; quadrant++) {
        let rSum = 0, gSum = 0, bSum = 0;
        let rSq = 0, gSq = 0, bSq = 0;
        let count = 0;

        for (let dy = 0; dy <= radius; dy++) {
          for (let dx = 0; dx <= radius; dx++) {
            let nx = x + (quadrant % 2 === 0 ? dx : -dx);
            let ny = y + (quadrant < 2 ? dy : -dy);

            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

            const idx = (ny * width + nx) * 4;
            const r = src[idx];
            const g = src[idx + 1];
            const b = src[idx + 2];

            rSum += r; gSum += g; bSum += b;
            rSq += r * r; gSq += g * g; bSq += b * b;
            count++;
          }
        }

        if (count === 0) continue;

        const rMean = rSum / count;
        const gMean = gSum / count;
        const bMean = bSum / count;

        const rVar = rSq / count - rMean * rMean;
        const gVar = gSq / count - gMean * gMean;
        const bVar = bSq / count - bMean * bMean;
        const variance = rVar + gVar + bVar;

        if (variance < minVariance) {
          minVariance = variance;
          bestMean = [rMean, gMean, bMean];
        }
      }

      const i = (y * width + x) * 4;
      const origR = src[i], origG = src[i + 1], origB = src[i + 2];

      // Apply artifact strength
      dst[i]     = (1 - artifactStrength) * origR + artifactStrength * bestMean[0];
      dst[i + 1] = (1 - artifactStrength) * origG + artifactStrength * bestMean[1];
      dst[i + 2] = (1 - artifactStrength) * origB + artifactStrength * bestMean[2];
      dst[i + 3] = 255;
    }
  }

  return dstData;
}

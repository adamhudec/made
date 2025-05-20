const filteredCanvas = document.getElementById("filteredCanvas");
const originalCanvas = document.getElementById("originalCanvas");
const filteredCtx = filteredCanvas.getContext("2d");
const originalCtx = originalCanvas.getContext("2d");
const img = document.getElementById("sourceImage");

const radiusSlider = document.getElementById("radiusSlider");
const artifactSlider = document.getElementById("artifactSlider");

const radiusValue = document.getElementById("radiusValue");
const artifactValue = document.getElementById("artifactValue");

let originalImageData;

// Set your desired image scale here
const scale = 0.35; // 50% of original size

img.onload = () => {
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;

  filteredCanvas.width = scaledWidth;
  filteredCanvas.height = scaledHeight;
  originalCanvas.width = scaledWidth;
  originalCanvas.height = scaledHeight;

  originalCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
  originalImageData = originalCtx.getImageData(0, 0, scaledWidth, scaledHeight);

  applyFilteredImage();
};

radiusSlider.addEventListener("input", applyFilteredImage);
artifactSlider.addEventListener("input", applyFilteredImage);

function applyFilteredImage() {
  const radius = parseInt(radiusSlider.value);
  const artifactStrength = parseFloat(artifactSlider.value) / 100;

  radiusValue.textContent = radius;
  artifactValue.textContent = artifactStrength.toFixed(2);

  const filteredData = applyKuwaharaFilter(
    filteredCanvas.width,
    filteredCanvas.height,
    radius,
    artifactStrength
  );

  filteredCtx.putImageData(filteredData, 0, 0);
}

function applyKuwaharaFilter(width, height, radius, artifactStrength = 1.0) {
  const src = originalImageData.data;
  const dstData = filteredCtx.createImageData(width, height);
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

      dst[i]     = (1 - artifactStrength) * origR + artifactStrength * bestMean[0];
      dst[i + 1] = (1 - artifactStrength) * origG + artifactStrength * bestMean[1];
      dst[i + 2] = (1 - artifactStrength) * origB + artifactStrength * bestMean[2];
      dst[i + 3] = 255;
    }
  }

  return dstData;
}

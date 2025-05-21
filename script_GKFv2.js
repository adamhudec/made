const filteredCanvas = document.getElementById('filteredCanvas');
const originalCanvas = document.getElementById('originalCanvas');
const filteredCtx    = filteredCanvas.getContext('2d');
const originalCtx    = originalCanvas.getContext('2d');
const img            = document.getElementById('sourceImage');
const radiusSlider   = document.getElementById('radiusSlider');
const radiusValue    = document.getElementById('radiusValue');

let originalImageData;
const scale = 0.46;

img.onload = () => {
  const w = img.width * scale, h = img.height * scale;
  filteredCanvas.width = originalCanvas.width = w;
  filteredCanvas.height = originalCanvas.height = h;
  originalCtx.drawImage(img, 0, 0, w, h);
  originalImageData = originalCtx.getImageData(0, 0, w, h);
  applyGKF();
};

radiusSlider.addEventListener('input', applyGKF);

function applyGKF() {
  const r = parseInt(radiusSlider.value);
  radiusValue.textContent = r;
  const output = generalizedKuwahara(originalImageData, filteredCanvas.width, filteredCanvas.height, r);
  filteredCtx.putImageData(output, 0, 0);
}

/**
 * Implements the 8-sector Generalized Kuwahara Filter with Gaussian weights.
 */
function generalizedKuwahara(srcImageData, width, height, radius) {
  const src = srcImageData.data;
  const out = filteredCtx.createImageData(width, height);
  const dst = out.data;

  // Precomputes Gaussian weights for distances up to radius
  const sigma = radius / 2;
  const twoSigmaSq = 2 * sigma * sigma;
  const gauss = new Array(radius+1).fill(0).map((_, i) => Math.exp(- (i*i)/twoSigmaSq ));

  // Defines 8 sector offsets
  const sectors = [];
  for (let k = 0; k < 8; k++) {
    const angle = (Math.PI/4) * k;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    sectors.push({dx, dy});
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let bestVar = Infinity;
      let pickMean = [0,0,0];

      sectors.forEach(({dx,dy}) => {
        let wSum=0, rSum=0, gSum=0, bSum=0, varSum=0;

        // iterates along radial directions within circle
        for (let d=0; d<=radius; d++) {
          const wx = Math.round(x + dx*d);
          const wy = Math.round(y + dy*d);
          if (wx<0||wy<0||wx>=width||wy>=height) continue;
          const w = gauss[d];
          const idx = (wy*width + wx)*4;
          const r = src[idx], g=src[idx+1], b=src[idx+2];
          rSum += w*r; gSum += w*g; bSum += w*b;
          wSum += w;
        }
        if (wSum === 0) return;
        const meanR = rSum/wSum, meanG=gSum/wSum, meanB=bSum/wSum;

        // computes weighted variance
        for (let d=0; d<=radius; d++) {
          const wx = Math.round(x + dx*d);
          const wy = Math.round(y + dy*d);
          if (wx<0||wy<0||wx>=width||wy>=height) continue;
          const w = gauss[d];
          const idx = (wy*width + wx)*4;
          const dr = src[idx]   - meanR;
          const dg = src[idx+1] - meanG;
          const db = src[idx+2] - meanB;
          varSum += w*(dr*dr + dg*dg + db*db);
        }
        const variance = varSum / wSum;
        if (variance < bestVar) {
          bestVar = variance;
          pickMean = [meanR, meanG, meanB];
        }
      });

      const i = (y*width + x)*4;
      dst[i]   = pickMean[0];
      dst[i+1] = pickMean[1];
      dst[i+2] = pickMean[2];
      dst[i+3] = 255;
    }
  }
  return out;
}

saveBtn.addEventListener('click', () => {
  const dataURL = filteredCanvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = 'gkf-output.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

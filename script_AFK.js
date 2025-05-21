const filteredCanvas = document.getElementById('filteredCanvas');
const originalCanvas = document.getElementById('originalCanvas');
const filteredCtx    = filteredCanvas.getContext('2d');
const originalCtx    = originalCanvas.getContext('2d');
const img            = document.getElementById('sourceImage');
const radiusSlider   = document.getElementById('radiusSlider');
const radiusValue    = document.getElementById('radiusValue');

let originalImageData;
const scale = 1;  // adjust as needed

img.onload = () => {
  const w = img.width * scale, h = img.height * scale;
  filteredCanvas.width = originalCanvas.width = w;
  filteredCanvas.height = originalCanvas.height = h;
  originalCtx.drawImage(img, 0, 0, w, h);
  originalImageData = originalCtx.getImageData(0, 0, w, h);
  applyAKF();
};

radiusSlider.addEventListener('input', applyAKF);

function applyAKF() {
  const R = parseInt(radiusSlider.value);
  radiusValue.textContent = R;
  const out = anisotropicKuwahara(originalImageData, filteredCanvas.width, filteredCanvas.height, R);
  filteredCtx.putImageData(out, 0, 0);
}

/**
 * Anisotropic Kuwahara Filter with polynomial weights:
 *   w(d) = (1 - (d/R)^2)^2 for d ≤ R
 */
function anisotropicKuwahara(srcImgData, W, H, R) {
  const src = srcImgData.data;
  const dstImg = filteredCtx.createImageData(W, H);
  const dst = dstImg.data;

  // Precompute polynomial weights
  const wPoly = new Array(R+1);
  for (let d=0; d<=R; d++) {
    const t = 1 - (d*d)/(R*R);
    wPoly[d] = t>0 ? t*t : 0;
  }

  // 8 sector directions
  const sectors = [];
  for (let k=0; k<8; k++) {
    const ang = (Math.PI/4)*k;
    sectors.push({dx: Math.cos(ang), dy: Math.sin(ang)});
  }

  for (let y=0; y<H; y++) {
    for (let x=0; x<W; x++) {
      let bestVar = Infinity, bestMean = [0,0,0];

      // loop sectors
      sectors.forEach(({dx,dy}) => {
        let wSum=0, rSum=0, gSum=0, bSum=0, varSum=0;

        // accumulate weighted mean
        for (let d=0; d<=R; d++) {
          const wx = Math.round(x + dx*d),
                wy = Math.round(y + dy*d);
          if (wx<0||wy<0||wx>=W||wy>=H) continue;
          const w = wPoly[d];
          const idx = (wy*W + wx)*4;
          const r = src[idx], g=src[idx+1], b=src[idx+2];
          rSum += w*r; gSum += w*g; bSum += w*b;
          wSum += w;
        }
        if (wSum===0) return;
        const mR = rSum/wSum, mG = gSum/wSum, mB = bSum/wSum;

        // accumulate weighted variance
        for (let d=0; d<=R; d++) {
          const wx = Math.round(x + dx*d),
                wy = Math.round(y + dy*d);
          if (wx<0||wy<0||wx>=W||wy>=H) continue;
          const w = wPoly[d];
          const idx = (wy*W + wx)*4;
          const dr = src[idx]   - mR;
          const dg = src[idx+1] - mG;
          const db = src[idx+2] - mB;
          varSum += w*(dr*dr + dg*dg + db*db);
        }
        const variance = varSum / wSum;
        if (variance < bestVar) {
          bestVar = variance;
          bestMean = [mR, mG, mB];
        }
      });

      // write pixel
      const i = (y*W + x)*4;
      dst[i]   = bestMean[0];
      dst[i+1] = bestMean[1];
      dst[i+2] = bestMean[2];
      dst[i+3] = 255;
    }
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.addEventListener('click', () => {
    // Grab the filtered canvas
    const canvas = document.getElementById('filteredCanvas');
    // Convert to data URL (PNG)
    const dataURL = canvas.toDataURL('image/png');
    // Create a temporary link and click it
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'filtered-image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  return dstImg;
}

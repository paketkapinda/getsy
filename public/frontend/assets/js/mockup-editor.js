// Canvas-based mockup editor for design overlay and multi-angle generation

import { api } from './api.js';
import { showNotification } from './ui.js';

let canvas, ctx, uploadedImage, productId;

export async function initMockupEditor(prodId, container) {
  productId = prodId;
  container.innerHTML = `
    <div class="space-y-4">
      <div>
        <label class="mb-2 block text-sm font-medium">Upload Design (PNG)</label>
        <input
          type="file"
          id="upload-design"
          accept="image/png"
          class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <p class="mb-2 text-sm font-medium">Canvas Editor</p>
          <canvas
            id="mockup-canvas"
            width="800"
            height="800"
            class="w-full rounded-lg border border-slate-700 bg-slate-800"
          ></canvas>
          <div class="mt-2 flex gap-2">
            <button
              id="btn-reset-canvas"
              class="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Reset
            </button>
            <button
              id="btn-export-canvas"
              class="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400"
            >
              Export
            </button>
          </div>
        </div>
        <div>
          <p class="mb-2 text-sm font-medium">Generate Multi-Angle Mockups</p>
          <div class="mb-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <p class="mb-2 text-xs text-slate-400">Select angles to generate:</p>
            <div class="space-y-2">
              <label class="flex items-center gap-2">
                <input type="checkbox" class="angle-check" value="front" checked />
                <span class="text-sm">Front</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" class="angle-check" value="back" checked />
                <span class="text-sm">Back</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" class="angle-check" value="side" />
                <span class="text-sm">Side</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" class="angle-check" value="detail" />
                <span class="text-sm">Detail</span>
              </label>
            </div>
          </div>
          <button
            id="btn-generate-mockups"
            class="w-full rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400"
          >
            Generate Mockups
          </button>
          <div id="mockup-preview" class="mt-4 grid grid-cols-2 gap-2"></div>
        </div>
      </div>
    </div>
  `;

  canvas = document.getElementById('mockup-canvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  setupCanvas();

  const uploadInput = document.getElementById('upload-design');
  if (uploadInput) {
    uploadInput.addEventListener('change', handleFileUpload);
  }

  const btnReset = document.getElementById('btn-reset-canvas');
  if (btnReset) {
    btnReset.addEventListener('click', resetCanvas);
  }

  const btnExport = document.getElementById('btn-export-canvas');
  if (btnExport) {
    btnExport.addEventListener('click', exportCanvas);
  }

  const btnGenerate = document.getElementById('btn-generate-mockups');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', generateMockups);
  }
}

function setupCanvas() {
  if (!ctx) return;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#64748b';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Upload a design to start', canvas.width / 2, canvas.height / 2);
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      drawImage();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function drawImage() {
  if (!ctx || !uploadedImage) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Center and scale image
  const scale = Math.min(canvas.width / uploadedImage.width, canvas.height / uploadedImage.height) * 0.8;
  const x = (canvas.width - uploadedImage.width * scale) / 2;
  const y = (canvas.height - uploadedImage.height * scale) / 2;

  ctx.drawImage(uploadedImage, x, y, uploadedImage.width * scale, uploadedImage.height * scale);
}

function resetCanvas() {
  uploadedImage = null;
  setupCanvas();
}

function exportCanvas() {
  if (!canvas) return;
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'mockup-design.png';
  link.href = dataUrl;
  link.click();
}

async function generateMockups() {
  if (!productId) {
    showNotification('Product ID missing', 'error');
    return;
  }

  const angles = Array.from(document.querySelectorAll('.angle-check:checked')).map(cb => cb.value);
  if (angles.length === 0) {
    showNotification('Select at least one angle', 'warning');
    return;
  }

  try {
    showNotification('Generating mockups...', 'info');

    // Get canvas image as base64
    const designBase64 = canvas.toDataURL('image/png').split(',')[1];

    const result = await api.post('/functions/v1/ai-mockup', {
      product_id: productId,
      design_base64: designBase64,
      presets: {
        angles: angles,
      },
    });

    if (result.error) throw new Error(result.error);

    showNotification('Mockups generated successfully', 'success');

    // Display previews
    const preview = document.getElementById('mockup-preview');
    if (preview && result.storage_urls) {
      preview.innerHTML = result.storage_urls.map(url => `
        <img src="${url}" alt="Mockup" class="rounded-lg" />
      `).join('');
    }

    // Close modal after a delay
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error('Error generating mockups:', error);
    showNotification('Failed to generate mockups', 'error');
  }
}





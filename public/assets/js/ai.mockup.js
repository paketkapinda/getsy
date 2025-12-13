// ai-mockup.js
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function generateMockups(productId, designData, presets = {}) {
  try {
    showNotification('Generating mockups...', 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/ai-mockup', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: productId,
        design_base64: designData,
        presets: {
          category: presets.category || 'tshirt',
          angles: presets.angles || ['front', 'back', 'side']
        }
      })
    });

    if (!response.ok) throw new Error('Mockup generation failed');
    
    const result = await response.json();
    showNotification('Mockups generated successfully', 'success');
    
    return result;
  } catch (error) {
    console.error('Error generating mockups:', error);
    showNotification('Error generating mockups', 'error');
  }
}

export function showMockupGenerator(productId, productData) {
  const modalHTML = `
    <div class="modal-overlay">
      <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
          <h3 class="modal-title">Generate Product Mockups</h3>
          <button class="modal-close" onclick="closeMockupModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="mockup-generator">
            <div class="design-upload">
              <h4>Upload Design</h4>
              <div class="upload-area" id="design-upload-area">
                <input type="file" id="design-file" accept="image/*" style="display: none;">
                <div class="upload-placeholder">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <p>Click to upload design file</p>
                </div>
              </div>
            </div>
            
            <div class="mockup-presets">
              <h4>Mockup Settings</h4>
              <div class="preset-grid">
                <div class="preset-group">
                  <label>Category</label>
                  <select id="mockup-category">
                    <option value="tshirt">T-Shirt</option>
                    <option value="mug">Mug</option>
                    <option value="phone-case">Phone Case</option>
                    <option value="hoodie">Hoodie</option>
                  </select>
                </div>
                
                <div class="preset-group">
                  <label>Angles</label>
                  <div class="angle-options">
                    <label><input type="checkbox" value="front" checked> Front</label>
                    <label><input type="checkbox" value="back"> Back</label>
                    <label><input type="checkbox" value="side"> Side</label>
                    <label><input type="checkbox" value="closeup"> Close-up</label>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mockup-preview" id="mockup-preview">
              <div class="preview-placeholder">
                <p>Mockups will appear here after generation</p>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="generateProductMockups('${productId}')">
            Generate Mockups
          </button>
        </div>
      </div>
    </div>
  `;

  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  // Upload area event listener
  const uploadArea = document.getElementById('design-upload-area');
  const fileInput = document.getElementById('design-file');
  
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleDesignFile(files[0]);
    }
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleDesignFile(e.target.files[0]);
    }
  });

  window.closeMockupModal = () => {
    document.body.removeChild(modalContainer);
  };
}

function handleDesignFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    window.currentDesignData = e.target.result;
    document.getElementById('design-upload-area').innerHTML = `
      <div class="upload-preview">
        <img src="${e.target.result}" alt="Design preview">
        <p>Design uploaded successfully</p>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

window.generateProductMockups = async (productId) => {
  if (!window.currentDesignData) {
    showNotification('Please upload a design first', 'warning');
    return;
  }

  const category = document.getElementById('mockup-category').value;
  const angleCheckboxes = document.querySelectorAll('.angle-options input:checked');
  const angles = Array.from(angleCheckboxes).map(cb => cb.value);

  const result = await generateMockups(productId, window.currentDesignData, {
    category: category,
    angles: angles
  });

  if (result && result.storage_urls) {
    // Mockup preview'ı güncelle
    const preview = document.getElementById('mockup-preview');
    preview.innerHTML = `
      <div class="mockup-grid">
        ${result.storage_urls.map((url, index) => `
          <div class="mockup-item">
            <img src="${url}" alt="Mockup ${index + 1}">
            <div class="mockup-actions">
              <button class="btn btn-sm btn-outline" onclick="useMockup('${url}')">
                Use This Mockup
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};

// ÖNCEKİ (Statik mockup):
async function generateMockup(product, designUrl) {
  // Basic image overlay
  return staticMockup;
}

// SONRAKİ (Gerçek Görsel İşleme Pipeline):
class MockupPipeline {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  async generateVariations(product, designUrl, options = {}) {
    const variations = [];
    
    // 1. Generate different angles/perspectives
    const perspectives = ['front', 'back', 'left', 'right', 'angle'];
    
    for (const perspective of perspectives) {
      // 2. Load base mockup template
      const template = await this.loadTemplate(product.category, perspective);
      
      // 3. Process design image
      const processedDesign = await this.processDesign(designUrl, {
        size: template.designArea,
        colorAdjustment: options.colorAdjustment,
        perspective: perspective
      });
      
      // 4. Compose mockup
      const mockup = await this.composeMockup(template, processedDesign);
      
      // 5. Apply realistic effects
      const finalMockup = await this.applyEffects(mockup, {
        lighting: 'natural',
        shadows: true,
        texture: product.material,
        wrinkles: options.realisticWrinkles || false
      });
      
      variations.push({
        perspective,
        image: finalMockup,
        thumbnail: await this.createThumbnail(finalMockup)
      });
    }
    
    return variations;
  }

  async processDesign(designUrl, options) {
    // Use Fabric.js or similar for design processing
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.canvas.width = options.size.width;
        this.canvas.height = options.size.height;
        
        this.ctx.save();
        
        // Apply perspective transformation
        if (options.perspective === 'angle') {
          this.ctx.transform(1, 0.2, -0.1, 1, 0, 0);
        }
        
        // Draw design
        this.ctx.drawImage(img, 0, 0, options.size.width, options.size.height);
        
        // Apply color adjustment
        if (options.colorAdjustment) {
          this.applyColorAdjustment(options.colorAdjustment);
        }
        
        this.ctx.restore();
        resolve(this.canvas.toDataURL('image/png'));
      };
      img.src = designUrl;
    });
  }

  async composeMockup(template, design) {
    return new Promise((resolve) => {
      const templateImg = new Image();
      const designImg = new Image();
      
      templateImg.onload = () => {
        designImg.onload = () => {
          this.canvas.width = templateImg.width;
          this.canvas.height = templateImg.height;
          
          // Draw template
          this.ctx.drawImage(templateImg, 0, 0);
          
          // Draw design on template's design area
          this.ctx.save();
          this.ctx.globalCompositeOperation = 'multiply';
          this.ctx.drawImage(
            designImg,
            template.designArea.x,
            template.designArea.y,
            template.designArea.width,
            template.designArea.height
          );
          this.ctx.restore();
          
          resolve(this.canvas.toDataURL('image/png'));
        };
        designImg.src = design;
      };
      templateImg.src = template.url;
    });
  }
}

// AI-Powered Mockup Generation
async function generateAIMockupVariations(product, prompt) {
  const openaiApi = await getOpenAIClient();
  const mockupPipeline = new MockupPipeline();
  
  // 1. Generate design variations with DALL-E
  const designVariations = await openaiApi.images.generate({
    model: "dall-e-3",
    prompt: `${prompt} - ${product.category} design, high quality, vector style`,
    n: 3,
    size: "1024x1024",
    quality: "hd",
    style: "natural"
  });
  
  // 2. Apply designs to different mockups
  const allMockups = [];
  
  for (const design of designVariations.data) {
    const variations = await mockupPipeline.generateVariations(
      product,
      design.url,
      {
        colorAdjustment: { brightness: 10, contrast: 5 },
        realisticWrinkles: true
      }
    );
    
    allMockups.push({
      design: design.url,
      variations,
      designPrompt: prompt
    });
  }
  
  // Save to database
  await supabase.from('product_mockups').insert({
    product_id: product.id,
    mockups: allMockups,
    generated_at: new Date().toISOString()
  });
  
  return allMockups;
}

window.useMockup = (mockupUrl) => {
  // Seçilen mockup'ı product'a ata
  showNotification('Mockup selected for product', 'success');
  // Burada product'ı güncelleme işlemi yapılacak
};
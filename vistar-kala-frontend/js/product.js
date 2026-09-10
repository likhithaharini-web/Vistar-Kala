/**
 * Vistar Kala - Product & Sourcing Marketplace Logic
 * Connected directly to Backend API (Source of Truth)
 */

let liveApiProducts = [];
let currentCategoryFilter = 'all';
let currentSearchQuery = '';

/**
 * Loads dynamic marketplace products directly from backend API
 */
async function loadMarketplaceProducts(category = null, searchQuery = null) {
    const loader = document.getElementById('b2b-api-loader');
    const dynamicContainer = document.getElementById('b2b-dynamic-products-container') || createDynamicContainer();
    const errorNotice = document.getElementById('b2b-error-notice');

    if (category !== null) currentCategoryFilter = category;
    if (searchQuery !== null) currentSearchQuery = searchQuery;

    if (loader) loader.classList.remove('hidden');
    if (errorNotice) errorNotice.classList.add('hidden');

    const params = {
        status: 'PUBLISHED',
        limit: 50
    };

    if (currentCategoryFilter && currentCategoryFilter !== 'all') {
        params.category = currentCategoryFilter;
    }
    if (currentSearchQuery && currentSearchQuery.trim()) {
        params.q = currentSearchQuery.trim();
    }

    try {
        const response = await fetchProductsAPI(params);
        liveApiProducts = response.products || [];

        if (dynamicContainer) {
            dynamicContainer.innerHTML = '';

            if (liveApiProducts.length === 0) {
                dynamicContainer.innerHTML = `
                    <div class="col-span-full py-16 text-center">
                        <div class="w-16 h-16 mx-auto rounded-2xl bg-gold-500/10 text-gold-400 flex items-center justify-center text-2xl mb-4 border border-gold-500/20">
                            <i class="fa-solid fa-box-open"></i>
                        </div>
                        <h4 class="text-gold-200 font-bold text-base font-serif-heritage">No published products found</h4>
                        <p class="text-stone-400 text-xs mt-1">Artisans can publish craft products via the Artisan Studio.</p>
                    </div>
                `;
            } else {
                liveApiProducts.forEach(prod => {
                    const cardElement = createProductCardElement(prod);
                    dynamicContainer.appendChild(cardElement);
                });
            }
            if (typeof translateDOM === 'function' && typeof currentLang !== 'undefined') {
                translateDOM(currentLang);
            }
        }
    } catch (err) {
        console.error('[Marketplace] Failed to load products:', err.message);
        if (dynamicContainer) {
            dynamicContainer.innerHTML = `
                <div class="col-span-full py-16 text-center">
                    <div class="w-16 h-16 mx-auto rounded-2xl bg-red-950/60 text-red-400 flex items-center justify-center text-2xl mb-4 border border-red-500/30">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h4 class="text-red-200 font-bold text-base">Unable to connect to Vistar Kala server</h4>
                    <p class="text-stone-400 text-xs mt-1">${err.message || 'Please check that the backend is running on http://localhost:4000.'}</p>
                    <button onclick="loadMarketplaceProducts()" class="mt-4 px-4 py-2 rounded-xl bg-gold-500 text-maroon-950 text-xs font-bold shadow-md hover:bg-gold-400 transition-all">
                        <i class="fa-solid fa-rotate-right me-1"></i> Retry Connection
                    </button>
                </div>
            `;
        }
    } finally {
        if (loader) loader.classList.add('hidden');
    }
}

function createDynamicContainer() {
    const grid = document.getElementById('b2b-products-grid');
    if (!grid) return null;
    let container = document.getElementById('b2b-dynamic-products-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'b2b-dynamic-products-container';
        container.className = 'contents';
        grid.appendChild(container);
    }
    return container;
}

/**
 * Format GI authentication badge text and style based on backend authenticationStatus & isGI
 */
function getGIBadgeInfo(isGI, authStatus) {
    if (isGI && authStatus === 'VERIFIED') {
        return {
            text: '✓ GI Verified',
            badgeClass: 'bg-emerald-500 text-maroon-950 font-black'
        };
    } else if (authStatus === 'PENDING') {
        return {
            text: '⏳ Verification Pending',
            badgeClass: 'bg-amber-500 text-maroon-950 font-bold'
        };
    } else if (isGI) {
        return {
            text: '🌿 GI Registered',
            badgeClass: 'bg-gold-500 text-maroon-950 font-bold'
        };
    }
    return {
        text: '🎨 Artisan Direct',
        badgeClass: 'bg-maroon-950 text-gold-300 border border-gold-500/40 font-semibold'
    };
}

/**
 * Renders HTML card element for a backend API product
 */
function createProductCardElement(prod) {
    const card = document.createElement('div');
    card.setAttribute('data-category', (prod.category || 'other').toLowerCase());
    card.className = 'product-card bg-maroon-900/90 border-2 border-gold-500/35 rounded-2xl overflow-hidden shadow-xl hover:border-gold-400 hover:shadow-gold-500/20 transition-all group flex flex-col justify-between cursor-pointer hover:-translate-y-1';
    
    const productId = prod.id;
    card.onclick = () => openProductDetailModal(productId);

    // Resolve image URL
    let imageUrl = 'warli.png';
    if (prod.images && prod.images.length > 0) {
        const firstImg = prod.images[0];
        const rawUrl = typeof firstImg === 'string' ? firstImg : firstImg.url;
        if (rawUrl) {
            imageUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `http://localhost:4000${rawUrl}`;
        }
    }

    const title = prod.name || 'Handcrafted Heritage Item';
    const origin = prod.origin || 'Registered Craft Cluster';
    const priceFormatted = prod.price !== undefined ? `₹${Number(prod.price).toLocaleString('en-IN')}` : '₹0';
    const stock = prod.quantity !== undefined ? prod.quantity : 0;
    const giInfo = getGIBadgeInfo(prod.isGI, prod.authenticationStatus);

    card.innerHTML = `
        <div>
            <div class="h-52 bg-stone-900 overflow-hidden relative">
                <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-105" onError="this.onerror=null;this.src='warli.png'">
                <span class="absolute top-3 left-3 bg-maroon-950/90 text-gold-300 text-[10px] font-black px-2.5 py-1 rounded-full border border-gold-500/40">
                    ✨ ${prod.craftType || (prod.category || 'Craft').toUpperCase()}
                </span>
                <span class="absolute top-3 right-3 ${giInfo.badgeClass} text-[10px] px-2.5 py-1 rounded-full shadow-md">
                    ${giInfo.text}
                </span>
            </div>

            <div class="p-5">
                <span class="text-[10px] uppercase tracking-wider font-bold text-gold-400">${origin}</span>
                <h3 class="text-lg font-bold text-gold-100 font-serif-heritage mt-1 group-hover:text-gold-300 transition-colors line-clamp-1">
                    ${title}
                </h3>
                <p class="text-xs text-stone-200 mt-1 line-clamp-2">
                    ${prod.description || prod.englishDescription || 'Authentic handcrafted heritage item made by skilled artisans.'}
                </p>
                
                <div class="mt-4 pt-3 border-t border-gold-500/20 flex justify-between items-center text-xs">
                    <div>
                        <span class="text-stone-400 block text-[10px]">Wholesale Rate:</span>
                        <span class="font-extrabold text-gold-300 text-lg">${priceFormatted} <span class="text-[10px] font-normal text-stone-400">/ pc</span></span>
                    </div>
                    <div class="text-right">
                        <span class="text-stone-400 block text-[10px]">Available Stock:</span>
                        <span class="font-bold ${stock > 0 ? 'text-amber-300 bg-maroon-950' : 'text-red-300 bg-red-950/50'} px-2 py-0.5 rounded border border-gold-500/30">
                            ${stock > 0 ? `${stock} Pcs` : 'Out of Stock'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div class="p-5 pt-0">
            <button class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-gold-400 to-amber-500 text-maroon-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 btn-inspect-card hover:scale-[1.02]">
                <i class="fa-solid fa-id-card"></i> 🛍️ Inspect Details & Buy →
            </button>
        </div>
    `;

    return card;
}

/**
 * Filter B2B Category Pills
 */
function filterB2BCategory(cat) {
    document.querySelectorAll('.cat-pill').forEach(btn => {
        btn.classList.remove('bg-gold-500', 'text-maroon-950', 'font-black');
        btn.classList.add('bg-maroon-900', 'border', 'border-gold-500/30', 'text-gold-200');
    });

    const activePill = document.getElementById(`cat-pill-${cat}`);
    if (activePill) {
        activePill.classList.remove('bg-maroon-900', 'border', 'border-gold-500/30', 'text-gold-200');
        activePill.classList.add('bg-gold-500', 'text-maroon-950', 'font-black');
    }

    // Load filtered products from backend API
    loadMarketplaceProducts(cat);
}

/**
 * Add Product Form Handler (Artisan only)
 * Creates DRAFT product in backend via multipart/form-data, then publishes it.
 */
async function handleAddProductSubmit(event) {
    if (event) event.preventDefault();

    const token = localStorage.getItem('vk_token') || (typeof authToken !== 'undefined' ? authToken : null);
    let user = typeof currentUser !== 'undefined' ? currentUser : null;
    if (!user) {
        try {
            user = JSON.parse(localStorage.getItem('vk_user') || 'null');
        } catch (e) {
            user = null;
        }
    }

    if (!token || !user) {
        alert('Please sign in as an artisan to publish products.');
        if (typeof navigateTo === 'function') navigateTo('login');
        return;
    }

    if (user.role !== 'artisan') {
        alert('Only registered artisans can publish products. Please sign in with an artisan account.');
        return;
    }

    const titleInput = document.getElementById('add-title') || document.getElementById('title');
    const categoryInput = document.getElementById('add-category') || document.getElementById('category');
    const priceInput = document.getElementById('add-price') || document.getElementById('price');
    const stockInput = document.getElementById('add-stock') || document.getElementById('stockQuantity') || document.getElementById('quantity');
    const clusterInput = document.getElementById('add-cluster') || document.getElementById('artisanCluster') || document.getElementById('origin');
    const descriptionInput = document.getElementById('add-description') || document.getElementById('description');
    const imageInput = document.getElementById('add-image-file') || document.getElementById('image');

    const name = titleInput?.value.trim();
    const category = categoryInput?.value || 'warli';
    const price = priceInput?.value;
    const quantity = stockInput?.value || '10';
    const origin = clusterInput?.value.trim() || 'Handmade Craft Cluster';
    const description = descriptionInput?.value.trim();

    if (!name || !price || !description) {
        alert('Please fill out all required product fields: Product Name, Price, and Description.');
        return;
    }

    const submitBtn = document.getElementById('btn-submit-add-product');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Creating Product on Server...';
    }

    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('category', category);
        formData.append('material', category === 'pottery' ? 'Clay & Natural Glaze' : (category === 'ikat' ? 'Handloom Silk' : 'Traditional Canvas & Pigments'));
        formData.append('craftType', category.toUpperCase());
        formData.append('origin', origin);
        formData.append('description', description);
        formData.append('englishDescription', description);
        formData.append('hindiDescription', description);
        formData.append('keywords', `${category},handmade,craft,heritage`);
        formData.append('quantity', String(quantity));
        formData.append('dimensions', 'Standard Traditional');
        formData.append('productionTimeDays', '5');
        formData.append('customizationAvailable', 'true');
        formData.append('isHandmade', 'true');
        formData.append('isGI', 'true');
        formData.append('price', String(price));

        if (imageInput && imageInput.files && imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        // 1. Create Product (returns status: DRAFT)
        const createResult = await createProductAPI(formData);
        const realProduct = createResult?.product || createResult?.data?.product || (createResult?.id ? createResult : null);
        const productId = realProduct?.id;

        if (!productId) {
            throw new Error((createResult && createResult.message) || 'Server did not return a valid product ID.');
        }

        window._currentDraftProductId = productId;
        window._lastPublishedProductId = productId;
        window._currentProduct = realProduct;
        sessionStorage.setItem('vk_current_product_id', productId);

        // 2. Publish Product (PUT /api/products/:id with status = PUBLISHED)
        if (submitBtn) submitBtn.innerText = 'Publishing to Marketplace...';
        await updateProductAPI(productId, { status: 'PUBLISHED' });

        if (typeof confetti === 'function') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        alert(`🎉 Success! "${name}" has been published to the Vistar Kala Marketplace!`);
        closeAddProductModal();

        // Reset form
        document.getElementById('form-add-product')?.reset();

        // Reload products from backend
        await loadMarketplaceProducts();
    } catch (err) {
        alert(`Product creation failed: ${err.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = '🚀 Publish Craft Product';
        }
    }
}

/**
 * Open Product Detail Modal by fetching product from backend
 */
async function openProductDetailModal(productId) {
    const modal = document.getElementById('modal-product-detail');
    if (!modal) return;

    // Reset fields to loading state
    const setTxt = (id, val) => {
        const elem = document.getElementById(id);
        if (elem) elem.innerText = val || '';
    };

    setTxt('modal-product-title', 'Loading Product Details...');
    setTxt('modal-product-craft-tag', 'Authentic Craft');
    setTxt('modal-product-desc', 'Fetching specifications and provenance from server...');
    modal.classList.remove('hidden');

    try {
        let p = null;
        // Try fetching by ID from API
        if (productId) {
            try {
                const res = await fetchProductByIdAPI(productId);
                p = res.product;
            } catch (err) {
                // If not found in backend or offline, look in loaded liveApiProducts
                p = liveApiProducts.find(item => item.id === productId);
            }
        }

        if (!p) {
            throw new Error('Product details could not be retrieved.');
        }

        window._selectedModalProduct = p;

        let imageUrl = 'warli.png';
        if (p.images && p.images.length > 0) {
            const firstImg = p.images[0];
            const rawUrl = typeof firstImg === 'string' ? firstImg : firstImg.url;
            if (rawUrl) {
                imageUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `http://localhost:4000${rawUrl}`;
            }
        }

        const elImg = document.getElementById('modal-product-img');
        if (elImg) {
            elImg.src = imageUrl;
            elImg.onerror = () => { elImg.src = 'warli.png'; };
        }

        const priceStr = p.price !== undefined ? `₹${Number(p.price).toLocaleString('en-IN')}` : '₹2,500';
        const msrpStr = p.price !== undefined ? `₹${Math.round(Number(p.price) * 1.35).toLocaleString('en-IN')}` : '₹3,500';
        const giInfo = getGIBadgeInfo(p.isGI, p.authenticationStatus);

        setTxt('modal-product-title', p.name || 'Handcrafted Heritage Item');
        setTxt('modal-product-craft-tag', p.craftType || (p.category || 'Heritage').toUpperCase());
        setTxt('modal-product-desc', p.description || p.englishDescription || 'Authentic handmade heritage product crafted by master artisans.');
        setTxt('modal-product-material', p.material || 'Natural Regional Materials');
        setTxt('modal-product-origin', p.origin || 'Registered Cluster');
        setTxt('modal-product-seller', p.artisan ? (p.artisan.name || 'Verified Master Artisan') : 'Verified Master Artisan');
        setTxt('modal-gi-badge', giInfo.text);
        setTxt('modal-product-specs', p.dimensions || 'Standard Traditional Dimensions');
        setTxt('modal-product-moq', `${p.quantity !== undefined ? p.quantity : 10} Units Ready`);
        setTxt('modal-product-prodtime', p.productionTimeDays ? `${p.productionTimeDays} Days` : '3–5 Days');
        setTxt('modal-product-custom', p.customizationAvailable ? 'Available ✓' : 'Standard Production');
        setTxt('modal-product-price-badge', priceStr);

        setTxt('modal-story-heading', `Traditional Heritage: ${p.name}`);
        setTxt('modal-story-body', p.detailedDescription || p.description || 'Crafted using age-old ancestral techniques by regional artisans.');

        setTxt('modal-price-mat-val', `₹${Math.round(Number(p.price || 2000) * 0.3)}`);
        setTxt('modal-price-labor-summary', 'Master Craftsmanship & Hours');
        setTxt('modal-price-artisans', 'Authentic Direct Payout');
        setTxt('modal-out-labor', `₹${Math.round(Number(p.price || 2000) * 0.5)}`);
        setTxt('modal-out-cost', `₹${Math.round(Number(p.price || 2000) * 0.8)}`);
        setTxt('modal-out-premium', `₹${Math.round(Number(p.price || 2000) * 0.2)}`);
        setTxt('modal-out-msrp', msrpStr);
        setTxt('modal-out-b2b', `${priceStr} / unit`);

        if (typeof translateDOM === 'function' && typeof currentLang !== 'undefined') {
            translateDOM(currentLang);
        }

    } catch (err) {
        setTxt('modal-product-title', 'Error Loading Product');
        setTxt('modal-product-desc', err.message);
    }
}

function closeProductDetailModal() {
    const modal = document.getElementById('modal-product-detail');
    if (modal) modal.classList.add('hidden');
}

// Alias for compatibility
function closeProductModal() {
    closeProductDetailModal();
}

function openAddProductModal() {
    const modal = document.getElementById('modal-add-product');
    if (modal) modal.classList.remove('hidden');
}

function closeAddProductModal() {
    const modal = document.getElementById('modal-add-product');
    if (modal) modal.classList.add('hidden');
}

/**
 * Vistar Kala - Product & Sourcing Marketplace Logic
 */

// Fallback catalog for initial demo static cards
const staticProductCatalog = {
    warli: {
        id: 'warli',
        title: "Sacred Harvest Warli Canvas",
        name: "Sacred Harvest Celebration Warli Canvas",
        craft: "Warli Folk Art",
        medium: "Warli Tribal Art on Handspun Canvas",
        specs: "18 x 24 Inches (Hand-stretched)",
        price: "₹2,850 / pc",
        msrp: "₹3,890",
        b2bRate: "₹2,850 / unit",
        stock: "45 Units Ready",
        cluster: "Palghar Master Cluster • Maharashtra",
        img: "warli.png",
        giBadge: "GI Verified #MH-WARLI",
        giCert: "GI Verified #MH-WARLI",
        certNo: "GI-TAG #MH-WARLI-2024-8842",
        certCluster: "Dahanu & Palghar, Maharashtra",
        desc: `"Handcrafted using organic rice paste and bamboo stylus. Depicts the traditional Tarpa harvest dance celebrating human harmony with nature."`,
        material: "Rice Paste & Canvas",
        origin: "Dahanu, Palghar, MH",
        seller: "Devu Patil & Clan",
        prodTime: "3–5 Days",
        custom: "Available ✓",
        labor: "₹2,520",
        cost: "₹3,120",
        premium: "+₹770",
        materialVal: "₹450",
        hours: "14 Hrs @ ₹180/hr",
        artisans: "1 Master Artisan",
        complexity: "Intricate Tarpa Motif (Medium)",
        storyHeading: `"Song of the Mother Earth: The Sacred Tarpa Circle"`,
        storyBody: `"In the deep misty forests of the Sahyadri mountains, the Warli tribe paints not with synthetic pigments, but with sacred rice paste and mother earth. This piece captures the Tarpa Dance—where men and women intertwine hands in a perpetual spiral, mirroring the cosmic cycle of birth, harvest, and monsoon. Every stroke represents harmony between human spirit and the sacred wilderness, preserving 2,500 years of unbroken indigenous oral history."`
    },
    ikat: {
        id: 'ikat',
        title: "Pochampally Double Ikat Silk Stoles",
        name: "Pochampally Handloom Pure Double Ikat Silk",
        craft: "Pochampally Handloom",
        medium: "Pure Handloom Mulberry Silk & Natural Dyes",
        specs: "6.5 Meters (Includes Blouse Fabric)",
        price: "₹1,950 / pc",
        msrp: "₹2,850",
        b2bRate: "₹1,950 / unit",
        stock: "50 Units Ready",
        cluster: "Yadadri Master Cluster • Telangana",
        img: "warli.png",
        giBadge: "GI Verified #TS-IKAT",
        giCert: "GI Verified #TS-IKAT",
        certNo: "GI-TAG #TS-IKAT-2024-0012",
        certCluster: "Pochampally & Bhoodan, Telangana",
        desc: `"Intricate geometric resist-dyed pure mulberry silk woven on traditional pit-looms by master weavers in Telangana."`,
        material: "Mulberry Silk & Natural Dyes",
        origin: "Yadadri, Bhoodan, TS",
        seller: "Kondaiah & Guild",
        prodTime: "5–7 Days",
        custom: "Available ✓",
        labor: "₹1,800",
        cost: "₹2,250",
        premium: "+₹600",
        materialVal: "₹450",
        hours: "12 Hrs @ ₹150/hr",
        artisans: "1 Pit-Loom Weaver",
        complexity: "Double Ikat Geometric (Complex)",
        storyHeading: `"The Mathematics of Sacred Loom: Pochampally Ikat"`,
        storyBody: `"Woven on traditional pit looms in the heart of Telangana, Double Ikat is a mastercraft where warp and weft threads are individually tied and dyed before weaving. The mathematical precision required to align geometric motifs without error has been passed down over 800 years, creating timeless silk textiles that hold their vivid luster for generations."`
    },
    pottery: {
        id: 'pottery',
        title: "Jaipur Traditional Blue Pottery Floral Urn",
        name: "Jaipur Blue Pottery Glazed Floral Urn Set",
        craft: "Jaipur Blue Pottery",
        medium: "Quartz & Fuller Earth Glazed Ceramic",
        specs: "12 Inch Height (Hand-painted Cobalt)",
        price: "₹1,420 / pc",
        msrp: "₹2,100",
        b2bRate: "₹1,420 / unit",
        stock: "30 Units Ready",
        cluster: "Kot Jewar Master Cluster • Rajasthan",
        img: "warli.png",
        giBadge: "GI Verified #RJ-POTTERY",
        giCert: "GI Verified #RJ-POTTERY",
        certNo: "GI-TAG #RJ-POTTERY-2024-0045",
        certCluster: "Kot Jewar & Jaipur, Rajasthan",
        desc: `"Hand-crafted clay-free quartz powder glazed ceramic painted with cobalt oxide floral foliage motifs."`,
        material: "Quartz Glass & Cobalt Glaze",
        origin: "Kot Jewar, Jaipur, RJ",
        seller: "Ramgopal & Family",
        prodTime: "4–6 Days",
        custom: "Available ✓",
        labor: "₹1,200",
        cost: "₹1,650",
        premium: "+₹450",
        materialVal: "₹450",
        hours: "10 Hrs @ ₹120/hr",
        artisans: "1 Master Potter",
        complexity: "Glazed Arabesque (Medium)",
        storyHeading: `"The Persian Cobalt Flame: Jaipur Blue Pottery"`,
        storyBody: `"Unique in the world of ceramics, Jaipur Blue Pottery uses no clay. Instead, master potters grind natural quartz stone powder, glass, and Fuller's earth, hand-painting intricate floral Arabesque motifs with cobalt and copper oxides. Fired once at precise kiln temperatures, each urn emerges with an unmistakable turquoise glass sheen celebrated in royal palaces."`
    },
    dhokra: {
        id: 'dhokra',
        title: "Bastar Tribal Dhokra Lost-Wax Brass Figurine",
        name: "Bastar Tribal Horn Player Dhokra Figurine",
        craft: "Bastar Bell Metal",
        medium: "Hand-Cast Bell Metal Brass Alloy",
        specs: "8 x 5 Inches (Solid Brass Alloy)",
        price: "₹3,200 / pc",
        msrp: "₹4,500",
        b2bRate: "₹3,200 / unit",
        stock: "15 Units Ready",
        cluster: "Bastar Tribal Cluster • Chhattisgarh",
        img: "warli.png",
        giBadge: "GI Verified #CG-DHOKRA",
        giCert: "GI Verified #CG-DHOKRA",
        certNo: "GI-TAG #CG-DHOKRA-2024-0089",
        certCluster: "Bastar & Kondagaon, Chhattisgarh",
        desc: `"Ancient lost-wax bell metal brass sculpture molded using natural beeswax threads and river clay."`,
        material: "Lost-Wax Bell Metal Brass",
        origin: "Kondagaon, Bastar, CG",
        seller: "Jharu Ram & Cluster",
        prodTime: "7–10 Days",
        custom: "Available ✓",
        labor: "₹2,880",
        cost: "₹3,600",
        premium: "+₹900",
        materialVal: "₹450",
        hours: "16 Hrs @ ₹180/hr",
        artisans: "2 Tribal Craftsmen",
        complexity: "Lost-Wax Cast Figurine (Complex)",
        storyHeading: `"The 4,000-Year Metallurgy of Bastar Dhokra"`,
        storyBody: `"Direct descendant of the Mohenjo-daro Dancing Girl, Dhokra is one of humanity's earliest known lost-wax casting techniques. Bastar tribal craftsmen hand-wind beeswax threads around clay cores, burying the molds in pit furnaces fueled by sal wood. Because the wax melts away during molten metal pouring, each piece is an irreproducible, singular masterpiece."`
    }
};

let liveApiProducts = [];

/**
 * Loads dynamic marketplace products from backend API
 */
async function loadMarketplaceProducts(category = 'all') {
    const loader = document.getElementById('b2b-api-loader');
    const dynamicContainer = document.getElementById('b2b-dynamic-products-container') || createDynamicContainer();
    
    if (loader) loader.classList.remove('hidden');

    try {
        const response = await fetchProductsAPI(category === 'all' ? null : category);
        const products = response.data || response.products || (Array.isArray(response) ? response : []);
        liveApiProducts = products;
        
        dynamicContainer.innerHTML = '';
        
        if (products.length > 0) {
            products.forEach(prod => {
                const cardElement = createProductCardElement(prod);
                dynamicContainer.appendChild(cardElement);
            });
        }
    } catch (err) {
        console.warn('Could not load products from API backend:', err.message);
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
        grid.insertBefore(container, grid.firstChild.nextSibling);
    }
    return container;
}

/**
 * Renders HTML card element for a dynamic backend API product
 */
function createProductCardElement(prod) {
    const card = document.createElement('div');
    card.setAttribute('data-category', prod.category || 'other');
    card.className = 'product-card bg-maroon-900/90 border-2 border-gold-500/35 rounded-2xl overflow-hidden shadow-xl hover:border-gold-400 hover:shadow-gold-500/20 transition-all group flex flex-col justify-between cursor-pointer hover:-translate-y-1';
    card.onclick = () => openProductDetailModal(prod._id || prod.id);

    const imageUrl = prod.images && prod.images.length > 0 ? (prod.images[0].url || prod.images[0]) : (prod.imageUrl || 'warli.png');
    const title = prod.title || prod.name || 'Artisan Craft Item';
    const category = (prod.category || 'Craft').toUpperCase();
    const price = prod.price ? `₹${Number(prod.price).toLocaleString('en-IN')}` : '₹2,500';
    const stock = prod.stockQuantity || prod.stock || 25;
    const cluster = prod.artisanCluster || prod.cluster || 'GI Certified Cluster';
    const giTag = prod.giTagNumber || prod.giCert || 'GI #VK-VERIFIED';

    card.innerHTML = `
        <div>
            <div class="h-52 bg-stone-900 overflow-hidden relative">
                <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-105" onError="this.src='warli.png'">
                <span class="absolute top-3 left-3 bg-maroon-950/90 text-gold-300 text-[10px] font-black px-2.5 py-1 rounded-full border border-gold-500/40">
                    ✨ Live Artisan Product
                </span>
                <span class="absolute top-3 right-3 bg-gold-500 text-maroon-950 text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md">
                    ${giTag}
                </span>
            </div>

            <div class="p-5">
                <span class="text-[10px] uppercase tracking-wider font-bold text-gold-400">${cluster}</span>
                <h3 class="text-lg font-bold text-gold-100 font-serif-heritage mt-1 group-hover:text-gold-300 transition-colors">
                    ${title}
                </h3>
                <p class="text-xs text-stone-200 mt-1 line-clamp-2">
                    ${prod.description || 'Authentic handmade heritage product crafted by master artisans.'}
                </p>
                
                <div class="mt-4 pt-3 border-t border-gold-500/20 flex justify-between items-center text-xs">
                    <div>
                        <span class="text-stone-400 block text-[10px]">Wholesale Rate:</span>
                        <span class="font-extrabold text-gold-300 text-lg">${price} <span class="text-[10px] font-normal text-stone-400">/ pc</span></span>
                    </div>
                    <div class="text-right">
                        <span class="text-stone-400 block text-[10px]">Stock:</span>
                        <span class="font-bold text-amber-300 bg-maroon-950 px-2 py-0.5 rounded border border-gold-500/30">${stock} Pcs</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="p-5 pt-0">
            <button class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-gold-400 to-amber-500 text-maroon-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 btn-inspect-card hover:scale-[1.02]">
                <i class="fa-solid fa-id-card"></i> 🛍️ Product Card & Details →
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

    // Filter static fallback cards
    document.querySelectorAll('.product-card').forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (cat === 'all' || cardCat === cat) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });

    // Re-fetch dynamic cards from API
    loadMarketplaceProducts(cat);
}

/**
 * Add Product Form Handler (with Cloudinary multipart upload)
 */
async function handleAddProductSubmit(event) {
    event.preventDefault();

    const title = document.getElementById('add-title')?.value.trim();
    const category = document.getElementById('add-category')?.value;
    const price = document.getElementById('add-price')?.value;
    const stock = document.getElementById('add-stock')?.value;
    const description = document.getElementById('add-description')?.value.trim();
    const artisanCluster = document.getElementById('add-cluster')?.value.trim();
    const imageInput = document.getElementById('add-image-file');

    if (!title || !price || !description) {
        alert('Please fill out all required product fields (Title, Price, Description).');
        return;
    }

    const submitBtn = document.getElementById('btn-submit-add-product');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Publishing to Cloudinary & Backend...';
    }

    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('category', category || 'warli');
        formData.append('price', price);
        formData.append('stockQuantity', stock || 10);
        formData.append('description', description);
        formData.append('artisanCluster', artisanCluster || 'Verified GI Cluster');

        if (imageInput && imageInput.files && imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        const result = await createProductAPI(formData);
        
        if (typeof confetti === 'function') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        alert(`Success! "${title}" has been created and published to the B2B Wholesale Hub.`);
        closeAddProductModal();

        // Reset form
        document.getElementById('form-add-product')?.reset();

        // Reload products catalog
        await loadMarketplaceProducts();
    } catch (err) {
        alert(`Failed to add product: ${err.message}. Please check backend connection.`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = '🚀 Publish Craft Product';
        }
    }
}

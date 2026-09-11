/**
 * Vistar Kala - Reverse Bidding Module
 * Connected directly to:
 * - POST /requirements
 * - GET /requirements
 * - GET /requirements/:id
 * - POST /requirements/:id/bids
 * - GET /requirements/:id/bids
 * - POST /requirements/:id/select-artisan
 */

let liveRequirements = [];
let currentViewingRequirement = null;
let currentOffers = [];

/**
 * Load requirements for B2B Hub or Artisan Studio
 */
async function loadRequirements(filterCategory = null, status = 'OPEN') {
    const container = document.getElementById('b2b-requirements-container') || document.getElementById('artisan-requirements-list');
    const loader = document.getElementById('b2b-requirements-loader');

    if (loader) loader.classList.remove('hidden');

    const params = { limit: 50 };
    if (status) params.status = status;
    if (filterCategory && filterCategory !== 'all') params.category = filterCategory;

    try {
        const response = await fetchRequirementsAPI(params);
        liveRequirements = response.requirements || [];

        renderRequirementsList(container, liveRequirements);
    } catch (err) {
        console.error('[Reverse Bidding] Failed to load requirements:', err.message);
        if (container) {
            container.innerHTML = `
                <div class="col-span-full py-12 text-center">
                    <p class="text-red-300 text-xs">Unable to load wholesale requirements: ${err.message}</p>
                    <button onclick="loadRequirements()" class="mt-3 px-3 py-1.5 rounded-lg bg-gold-500 text-maroon-950 font-bold text-xs">Retry</button>
                </div>
            `;
        }
    } finally {
        if (loader) loader.classList.add('hidden');
    }
}

/**
 * Render requirements cards
 */
function renderRequirementsList(container, reqs) {
    if (!container) return;
    container.innerHTML = '';

    if (reqs.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-14 text-center">
                <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl mb-4 border border-amber-500/20">
                    <i class="fa-solid fa-clipboard-list"></i>
                </div>
                <h4 class="text-gold-200 font-bold text-base font-serif-heritage">No Open Requirements Found</h4>
                <p class="text-stone-400 text-xs mt-1">Enterprise & retail buyers can post custom wholesale sourcing requirements for master artisan clusters.</p>
            </div>
        `;
        return;
    }

    reqs.forEach(req => {
        const card = document.createElement('div');
        card.className = 'bg-maroon-900/90 border-2 border-gold-500/30 rounded-2xl p-5 shadow-xl hover:border-gold-400 transition-all flex flex-col justify-between';

        const isOwner = currentUser && req.buyerId === currentUser.id;
        const isArtisan = currentUser && currentUser.role === 'artisan';

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/30">
                        🏷️ ${(req.category || 'Craft').toUpperCase()}
                    </span>
                    <span class="text-[10px] font-bold ${req.status === 'OPEN' ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40' : 'text-stone-400 bg-stone-900 border-stone-700'} px-2.5 py-0.5 rounded-full border">
                        ${req.status}
                    </span>
                </div>

                <h3 class="text-base font-bold text-gold-100 font-serif-heritage mt-1 line-clamp-2">
                    ${req.productRequired}
                </h3>

                <div class="mt-3 grid grid-cols-2 gap-2 text-[11px] bg-maroon-950/80 p-3 rounded-xl border border-gold-500/20">
                    <div>
                        <span class="text-stone-400 block text-[9px] uppercase font-semibold">Quantity Needed:</span>
                        <span class="font-bold text-gold-200 font-mono">${req.quantity} Pcs</span>
                    </div>
                    <div>
                        <span class="text-stone-400 block text-[9px] uppercase font-semibold">Target Budget:</span>
                        <span class="font-bold text-amber-300 font-mono">₹${Number(req.budget || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                        <span class="text-stone-400 block text-[9px] uppercase font-semibold">Destination:</span>
                        <span class="font-medium text-stone-200 truncate block">${req.deliveryLocation || 'India'}</span>
                    </div>
                    <div>
                        <span class="text-stone-400 block text-[9px] uppercase font-semibold">Required By:</span>
                        <span class="font-medium text-stone-200">${req.requiredByDate ? new Date(req.requiredByDate).toLocaleDateString() : 'Flexible'}</span>
                    </div>
                </div>

                ${req.customization ? `
                    <p class="text-xs text-stone-300 mt-3 italic bg-maroon-950/40 p-2 rounded-lg border border-gold-500/10">
                        <i class="fa-solid fa-paintbrush text-gold-400 me-1"></i> "${req.customization}"
                    </p>
                ` : ''}
            </div>

            <div class="mt-4 pt-3 border-t border-gold-500/20 flex flex-wrap items-center justify-between gap-2">
                ${isOwner ? `
                    <button onclick="openCompareOffersModal('${req.id}')" class="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-gold-400 hover:from-amber-400 hover:to-gold-300 text-maroon-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-scale-balanced"></i> Compare Offers (${req.status === 'OPEN' ? 'Active' : 'Closed'}) →
                    </button>
                ` : isArtisan && req.status === 'OPEN' ? `
                    <button onclick="openSubmitBidModal('${req.id}')" class="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-maroon-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-paper-plane"></i> Submit Proposal / Bid →
                    </button>
                ` : `
                    <button onclick="openCompareOffersModal('${req.id}')" class="flex-1 py-2 px-3 rounded-xl bg-maroon-950 border border-gold-500/30 text-gold-300 font-bold text-xs hover:border-gold-400 transition-all flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-eye"></i> View Proposals & Specs →
                    </button>
                `}
            </div>
        `;

        container.appendChild(card);
    });
}

/**
 * Open Comparison Modal for Buyer to evaluate bids
 */
async function openCompareOffersModal(reqId) {
    const modal = document.getElementById('modal-compare-offers');
    if (!modal) return;

    modal.classList.remove('hidden');

    const titleEl = document.getElementById('compare-offers-title');
    const subtitleEl = document.getElementById('compare-offers-sub');
    const container = document.getElementById('compare-offers-list');

    if (titleEl) titleEl.innerText = 'Loading requirement & proposals...';
    if (container) container.innerHTML = '<p class="text-xs text-stone-400 text-center py-6">Fetching bids from server...</p>';

    try {
        const reqRes = await fetchRequirementByIdAPI(reqId);
        currentViewingRequirement = reqRes.requirement;

        if (titleEl) titleEl.innerText = currentViewingRequirement.productRequired;
        if (subtitleEl) {
            subtitleEl.innerText = `Category: ${currentViewingRequirement.category || 'Craft'} • Qty: ${currentViewingRequirement.quantity} Pcs • Budget: ₹${Number(currentViewingRequirement.budget || 0).toLocaleString('en-IN')}`;
        }

        // Fetch bids
        const bidsRes = await fetchReverseBidsAPI(reqId);
        currentOffers = bidsRes.bids || [];

        if (container) {
            if (currentOffers.length === 0) {
                container.innerHTML = `
                    <div class="py-10 text-center">
                        <div class="w-12 h-12 mx-auto rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center text-xl mb-3 border border-gold-500/20">
                            <i class="fa-regular fa-clock"></i>
                        </div>
                        <h5 class="text-gold-200 font-bold text-sm">No proposals submitted yet</h5>
                        <p class="text-stone-400 text-xs mt-1">Artisans are currently preparing quotes and craft samples.</p>
                    </div>
                `;
            } else {
                const isOwner = currentUser && currentViewingRequirement.buyerId === currentUser.id;
                const isRequirementOpen = currentViewingRequirement.status === 'OPEN';

                container.innerHTML = currentOffers.map((bid, idx) => {
                    const artisanName = bid.artisan ? (bid.artisan.name || 'Verified Master Artisan') : 'Master Artisan';
                    const isSelected = bid.status === 'SELECTED';
                    const isRejected = bid.status === 'REJECTED';

                    let statusPill = '';
                    if (isSelected) statusPill = '<span class="text-[10px] bg-emerald-500 text-maroon-950 font-black px-2.5 py-0.5 rounded-full shadow-sm">👑 AWARDED</span>';
                    else if (isRejected) statusPill = '<span class="text-[10px] bg-red-950 text-red-300 font-bold px-2 py-0.5 rounded border border-red-500/40">Not Selected</span>';
                    else statusPill = '<span class="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">Under Review</span>';

                    return `
                        <div class="p-4 rounded-2xl ${isSelected ? 'bg-emerald-950/40 border-2 border-emerald-500/60' : 'bg-maroon-950/80 border border-gold-500/25'} text-xs space-y-3">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gold-500/15 pb-2">
                                <div class="flex items-center gap-2">
                                    <span class="w-7 h-7 rounded-lg bg-gold-500/20 text-gold-300 flex items-center justify-center font-bold text-xs">
                                        #${idx + 1}
                                    </span>
                                    <div>
                                        <h4 class="font-bold text-gold-100 text-sm">${artisanName}</h4>
                                        <span class="text-[10px] text-stone-400">Craft Guild Participant</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    ${bid.matchScore !== undefined ? `
                                        <span class="text-[11px] font-black text-amber-300 bg-maroon-900 px-2.5 py-1 rounded-full border border-amber-500/40">
                                            ✨ Match Score: ${bid.matchScore}/100
                                        </span>
                                    ` : ''}
                                    ${statusPill}
                                </div>
                            </div>

                            <!-- Proposal Metrics Comparison Grid -->
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                <div class="p-2 rounded-xl bg-maroon-900/60 border border-gold-500/15">
                                    <span class="text-stone-400 block text-[9px] uppercase font-bold">Total Bid Price:</span>
                                    <span class="font-extrabold text-amber-300 text-sm font-mono">₹${Number(bid.bidPrice).toLocaleString('en-IN')}</span>
                                </div>
                                <div class="p-2 rounded-xl bg-maroon-900/60 border border-gold-500/15">
                                    <span class="text-stone-400 block text-[9px] uppercase font-bold">Qty Fulfillable:</span>
                                    <span class="font-bold text-gold-200">${bid.quantityFulfillable} Pcs</span>
                                </div>
                                <div class="p-2 rounded-xl bg-maroon-900/60 border border-gold-500/15">
                                    <span class="text-stone-400 block text-[9px] uppercase font-bold">Completion Time:</span>
                                    <span class="font-bold text-gold-200">${bid.completionTimeDays || 15} Days</span>
                                </div>
                                <div class="p-2 rounded-xl bg-maroon-900/60 border border-gold-500/15">
                                    <span class="text-stone-400 block text-[9px] uppercase font-bold">Customization:</span>
                                    <span class="font-bold text-emerald-400">${bid.customizationCapability ? 'Fully Supported ✓' : 'Standard'}</span>
                                </div>
                            </div>

                            <div class="p-3 rounded-xl bg-maroon-900/40 border border-gold-500/10">
                                <span class="text-[10px] uppercase font-bold text-stone-400 block mb-1">Proposal & Craftsmanship Notes:</span>
                                <p class="text-stone-200 text-xs italic leading-relaxed">
                                    "${bid.proposal}"
                                </p>
                            </div>

                            ${isOwner && isRequirementOpen ? `
                                <div class="pt-2 flex justify-end">
                                    <button onclick="handleSelectArtisan('${currentViewingRequirement.id}', '${bid.id}')"
                                        class="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-maroon-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 hover:scale-105">
                                        <i class="fa-solid fa-handshake"></i> Select Artisan & Confirm Wholesale Order →
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (err) {
        if (titleEl) titleEl.innerText = 'Error Loading Requirement';
        if (container) container.innerHTML = `<p class="text-xs text-red-300 text-center py-4">${err.message}</p>`;
    }
}

function closeCompareOffersModal() {
    const modal = document.getElementById('modal-compare-offers');
    if (modal) modal.classList.add('hidden');
}

/**
 * Buyer selects winning artisan via POST /requirements/:id/select-artisan
 */
async function handleSelectArtisan(reqId, reverseBidId) {
    if (!confirm('Are you sure you want to select this artisan? This will award the contract, fulfill the requirement, and create a confirmed order.')) {
        return;
    }

    try {
        const result = await selectArtisanAPI(reqId, { reverseBidId });

        if (typeof confetti === 'function') {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }

        alert(`🎉 Success! Artisan awarded. Order #${result.order.id} has been created and the artisan has been notified.`);
        closeCompareOffersModal();

        // Refresh requirements list and user orders
        await loadRequirements();
        if (typeof loadUserOrders === 'function') {
            loadUserOrders();
        }
    } catch (err) {
        alert(`Selection failed: ${err.message}`);
    }
}

// Global Exports
if (typeof window !== 'undefined') {
    window.loadRequirements = loadRequirements;
    window.openCompareOffersModal = openCompareOffersModal;
    window.closeCompareOffersModal = closeCompareOffersModal;
    window.handleSelectArtisan = handleSelectArtisan;
}

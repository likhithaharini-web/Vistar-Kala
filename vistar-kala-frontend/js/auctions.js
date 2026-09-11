/**
 * Vistar Kala - Normal Heritage Bidding (Auction Engine)
 * Modular client interface connected directly to GET /auctions, GET /auctions/:id, POST /auctions/:id/bids
 */

let liveAuctions = [];
let currentAuctionDetail = null;
let countdownTimerInterval = null;

/**
 * Load all live auctions from backend
 */
async function loadAuctions(statusFilter = null) {
    const container = document.getElementById('b2b-auctions-container') || createAuctionsContainer();
    const loader = document.getElementById('b2b-auctions-loader');

    if (loader) loader.classList.remove('hidden');

    const params = { limit: 50 };
    if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
    }

    try {
        const response = await fetchAuctionsAPI(params);
        liveAuctions = response.auctions || [];

        if (container) {
            container.innerHTML = '';

            if (liveAuctions.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full py-16 text-center">
                        <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl mb-4 border border-amber-500/20">
                            <i class="fa-solid fa-gavel"></i>
                        </div>
                        <h4 class="text-gold-200 font-bold text-base font-serif-heritage">No Active Heritage Auctions Found</h4>
                        <p class="text-stone-400 text-xs mt-1">Artisans can launch live auctions for rare masterpiece crafts from the Artisan Studio.</p>
                    </div>
                `;
            } else {
                liveAuctions.forEach(auction => {
                    const card = createAuctionCardElement(auction);
                    container.appendChild(card);
                });
            }
        }
    } catch (err) {
        console.error('[Auctions] Failed to load auctions:', err.message);
        if (container) {
            container.innerHTML = `
                <div class="col-span-full py-12 text-center">
                    <p class="text-red-300 text-xs">Failed to load auctions: ${err.message}</p>
                    <button onclick="loadAuctions()" class="mt-3 px-3 py-1.5 rounded-lg bg-gold-500 text-maroon-950 font-bold text-xs">Retry</button>
                </div>
            `;
        }
    } finally {
        if (loader) loader.classList.add('hidden');
    }
}

function createAuctionsContainer() {
    let container = document.getElementById('b2b-auctions-container');
    if (!container) {
        const section = document.getElementById('b2b-auctions-section');
        if (section) {
            container = document.createElement('div');
            container.id = 'b2b-auctions-container';
            container.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
            section.appendChild(container);
        }
    }
    return container;
}

/**
 * Format remaining time countdown
 */
function getAuctionTimeRemaining(endTimeStr) {
    const end = new Date(endTimeStr).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return { label: 'Auction Closed', isExpired: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return { label: `${days}d ${hours}h left`, isExpired: false };
    if (hours > 0) return { label: `${hours}h ${mins}m left`, isExpired: false };
    return { label: `${mins}m left`, isExpired: false };
}

/**
 * Renders an auction card element
 */
function createAuctionCardElement(auction) {
    const card = document.createElement('div');
    card.className = 'auction-card bg-maroon-900/90 border-2 border-amber-500/40 rounded-2xl overflow-hidden shadow-xl hover:border-amber-400 hover:shadow-amber-500/25 transition-all group flex flex-col justify-between cursor-pointer hover:-translate-y-1';
    card.onclick = () => openAuctionDetailModal(auction.id);

    const product = auction.product || {};
    const title = product.name || 'Heritage Craft Masterpiece';
    const origin = product.origin || 'Registered Cluster';
    const craft = product.craftType || (product.category || 'Craft').toUpperCase();

    // Image
    let imageUrl = 'warli.png';
    if (product.images && product.images.length > 0) {
        const first = product.images[0];
        imageUrl = resolveMediaUrl(typeof first === 'string' ? first : first.url);
    }

    const currentBid = auction.highestBidAmount || auction.basePrice;
    const timeRemaining = getAuctionTimeRemaining(auction.endTime);
    const effectiveStatus = auction.effectiveStatus || auction.status;

    let statusBadgeClass = 'bg-emerald-500 text-maroon-950';
    if (effectiveStatus === 'SCHEDULED') statusBadgeClass = 'bg-blue-500 text-white';
    if (effectiveStatus === 'CLOSED') statusBadgeClass = 'bg-stone-600 text-stone-200';

    card.innerHTML = `
        <div>
            <div class="h-52 bg-stone-900 overflow-hidden relative">
                <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-105" onError="this.onerror=null;this.src='warli.png'">
                <span class="absolute top-3 left-3 bg-maroon-950/90 text-gold-300 text-[10px] font-black px-2.5 py-1 rounded-full border border-gold-500/40">
                    🔨 Heritage Auction
                </span>
                <span class="absolute top-3 right-3 ${statusBadgeClass} text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">
                    ${effectiveStatus}
                </span>
                <div class="absolute bottom-3 left-3 bg-maroon-950/95 text-amber-300 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-500/40 flex items-center gap-1.5 shadow-lg">
                    <i class="fa-regular fa-clock"></i> ${timeRemaining.label}
                </div>
            </div>

            <div class="p-5">
                <span class="text-[10px] uppercase tracking-wider font-bold text-gold-400">${origin} • ${craft}</span>
                <h3 class="text-lg font-bold text-gold-100 font-serif-heritage mt-1 group-hover:text-gold-300 transition-colors line-clamp-1">
                    ${title}
                </h3>
                <p class="text-xs text-stone-200 mt-1 line-clamp-2">
                    ${product.description || 'Rare handcrafted artisan work up for competitive live heritage bidding.'}
                </p>

                <div class="mt-4 pt-3 border-t border-gold-500/20 flex justify-between items-center text-xs">
                    <div>
                        <span class="text-stone-400 block text-[10px]">${auction.highestBidAmount ? 'Current Highest Bid:' : 'Starting Base Price:'}</span>
                        <span class="font-extrabold text-amber-300 text-lg font-mono">₹${Number(currentBid).toLocaleString('en-IN')}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-stone-400 block text-[10px]">Min. Increment:</span>
                        <span class="font-bold text-gold-300 bg-maroon-950 px-2 py-0.5 rounded border border-gold-500/30">
                            +₹${auction.minBidIncrement || 50}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div class="p-5 pt-0">
            <button class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-gold-400 hover:from-amber-400 hover:to-gold-300 text-maroon-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02]">
                <i class="fa-solid fa-gavel"></i> ${effectiveStatus === 'ACTIVE' ? 'Place Bid Now →' : 'View Auction Details →'}
            </button>
        </div>
    `;

    return card;
}

/**
 * Open Auction Detail Modal
 */
async function openAuctionDetailModal(auctionId) {
    const modal = document.getElementById('modal-auction-detail');
    if (!modal) return;

    modal.classList.remove('hidden');

    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val || '';
    };

    setTxt('auction-detail-title', 'Loading Auction Details...');
    setTxt('auction-detail-craft', 'Heritage Auction');
    setTxt('auction-detail-desc', 'Fetching live bid ledger and status from server...');

    try {
        const res = await fetchAuctionByIdAPI(auctionId);
        const auction = res.auction;
        currentAuctionDetail = auction;
        window._selectedAuction = auction;

        const product = auction.product || {};
        const title = product.name || 'Masterpiece Heritage Craft';
        const bids = auction.bids || [];
        const highestBid = auction.highestBidAmount || auction.basePrice;
        const effectiveStatus = auction.effectiveStatus || auction.status;
        const minIncrement = auction.minBidIncrement || 50;
        const minNextBid = (auction.highestBidAmount ? auction.highestBidAmount + minIncrement : auction.basePrice);

        let imageUrl = 'warli.png';
        if (product.images && product.images.length > 0) {
            const first = product.images[0];
            imageUrl = resolveMediaUrl(typeof first === 'string' ? first : first.url);
        }

        const imgEl = document.getElementById('auction-detail-img');
        if (imgEl) imgEl.src = imageUrl;

        setTxt('auction-detail-title', title);
        setTxt('auction-detail-craft', (product.craftType || product.category || 'Heritage').toUpperCase());
        setTxt('auction-detail-desc', product.description || 'Authentic handcrafted heritage treasure up for live auction.');
        setTxt('auction-detail-origin', product.origin || 'Registered Cluster');
        setTxt('auction-detail-base-price', `₹${Number(auction.basePrice).toLocaleString('en-IN')}`);
        setTxt('auction-detail-highest-bid', `₹${Number(highestBid).toLocaleString('en-IN')}`);
        setTxt('auction-detail-min-increment', `+₹${minIncrement}`);
        setTxt('auction-detail-status', effectiveStatus);

        const timeRemaining = getAuctionTimeRemaining(auction.endTime);
        setTxt('auction-detail-timer', timeRemaining.label);

        // Next bid input min
        const bidInput = document.getElementById('auction-bid-amount');
        if (bidInput) {
            bidInput.min = minNextBid;
            bidInput.value = minNextBid;
            bidInput.placeholder = `Min. ₹${minNextBid}`;
        }

        const minNotice = document.getElementById('auction-min-bid-notice');
        if (minNotice) {
            minNotice.innerText = `Minimum acceptable bid: ₹${minNextBid.toLocaleString('en-IN')}`;
        }

        // Render Bid Ledger / History
        const bidsContainer = document.getElementById('auction-bids-history');
        if (bidsContainer) {
            if (bids.length === 0) {
                bidsContainer.innerHTML = `
                    <div class="py-6 text-center text-stone-400 text-xs italic">
                        No bids placed yet. Be the first bidder at base price ₹${Number(auction.basePrice).toLocaleString('en-IN')}!
                    </div>
                `;
            } else {
                bidsContainer.innerHTML = bids.map((b, idx) => `
                    <div class="p-2.5 rounded-xl ${idx === 0 ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200' : 'bg-maroon-950/60 border border-gold-500/10 text-stone-300'} text-xs flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="${idx === 0 ? 'w-5 h-5 rounded-full bg-amber-500 text-maroon-950 font-black text-[10px] flex items-center justify-center shadow-sm' : 'text-stone-500'}">
                                ${idx === 0 ? '👑' : `#${idx + 1}`}
                            </span>
                            <span class="font-bold">${b.bidder ? (b.bidder.name || 'Verified Buyer') : 'Anonymous Bidder'}</span>
                            ${idx === 0 ? '<span class="text-[9px] uppercase tracking-wider font-extrabold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">Highest</span>' : ''}
                        </div>
                        <div class="text-right">
                            <span class="font-mono font-black ${idx === 0 ? 'text-amber-300 text-sm' : 'text-stone-300'}">₹${Number(b.amount).toLocaleString('en-IN')}</span>
                            <span class="block text-[9px] text-stone-500">${new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Toggle bidding controls based on user role and status
        const bidSection = document.getElementById('auction-bidding-controls');
        if (bidSection) {
            if (effectiveStatus !== 'ACTIVE') {
                bidSection.innerHTML = `
                    <div class="p-3 rounded-xl bg-stone-900 border border-stone-700 text-center text-stone-400 text-xs">
                        This auction is currently ${effectiveStatus.toLowerCase()}. Bidding is closed.
                    </div>
                `;
            } else if (!authToken || currentUser?.role !== 'buyer') {
                bidSection.innerHTML = `
                    <div class="p-3 rounded-xl bg-maroon-950 border border-amber-500/30 text-center text-xs">
                        <span class="text-stone-300">Only registered buyers can place bids on heritage auctions.</span>
                        <button onclick="selectPortalRole('b2b'); navigateTo('login'); closeAuctionDetailModal();" class="mt-2 block w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-maroon-950 font-bold text-xs">
                            Sign in as Buyer to Bid →
                        </button>
                    </div>
                `;
            } else {
                bidSection.innerHTML = `
                    <form onsubmit="handlePlaceAuctionBid(event)" class="space-y-3">
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-gold-300 font-bold text-xs">Your Bid Amount (₹):</label>
                                <span id="auction-min-bid-notice" class="text-[10px] text-amber-400">Min: ₹${minNextBid.toLocaleString('en-IN')}</span>
                            </div>
                            <input type="number" id="auction-bid-amount" required min="${minNextBid}" value="${minNextBid}" step="${minIncrement}"
                                class="w-full bg-maroon-950 border border-amber-500/40 rounded-xl p-2.5 text-sm text-gold-100 font-mono font-bold focus:outline-none focus:border-amber-400">
                        </div>
                        <button type="submit" id="btn-submit-auction-bid"
                            class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-gold-400 to-amber-500 hover:from-amber-400 hover:to-gold-300 text-maroon-950 font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-gavel"></i> Confirm & Submit Bid →
                        </button>
                    </form>
                `;
            }
        }

    } catch (err) {
        setTxt('auction-detail-title', 'Error Loading Auction');
        setTxt('auction-detail-desc', err.message);
    }
}

function closeAuctionDetailModal() {
    const modal = document.getElementById('modal-auction-detail');
    if (modal) modal.classList.add('hidden');
}

/**
 * Submit Bid via POST /auctions/:id/bids
 */
async function handlePlaceAuctionBid(event) {
    if (event) event.preventDefault();

    const auction = currentAuctionDetail;
    if (!auction || !auction.id) return;

    if (!authToken || currentUser?.role !== 'buyer') {
        alert('Please sign in as a buyer to place bids.');
        return;
    }

    const input = document.getElementById('auction-bid-amount');
    const amount = Number(input?.value);

    if (!amount || isNaN(amount)) {
        alert('Please enter a valid bid amount.');
        return;
    }

    const btn = document.getElementById('btn-submit-auction-bid');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Placing Bid...';
    }

    try {
        const result = await placeBidAPI(auction.id, amount);

        if (typeof confetti === 'function') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        alert(`🎉 Bid of ₹${amount.toLocaleString('en-IN')} placed successfully! You are currently the highest bidder.`);

        // Refresh detail view & list
        await openAuctionDetailModal(auction.id);
        await loadAuctions();
    } catch (err) {
        alert(`Bid failed: ${err.message}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Confirm & Submit Bid →';
        }
    }
}

// Global Exports
if (typeof window !== 'undefined') {
    window.loadAuctions = loadAuctions;
    window.openAuctionDetailModal = openAuctionDetailModal;
    window.closeAuctionDetailModal = closeAuctionDetailModal;
    window.handlePlaceAuctionBid = handlePlaceAuctionBid;
}

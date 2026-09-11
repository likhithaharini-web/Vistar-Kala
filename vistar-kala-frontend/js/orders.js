/**
 * Vistar Kala - Order Management & Fulfillment Pipeline
 * Connected directly to:
 * - POST /orders
 * - GET /orders
 * - GET /orders/:id
 * - PUT /orders/:id/status
 */

const ORDER_STATUS_FLOW = ['Confirmed', 'In Production', 'Ready', 'Shipped', 'Delivered'];

let currentUserOrders = [];

/**
 * Open Orders Modal and fetch user's orders
 */
function openOrdersModal() {
    if (!authToken || !currentUser) {
        alert('Please sign in to view your orders.');
        selectPortalRole('b2b');
        navigateTo('login');
        return;
    }
    const modal = document.getElementById('modal-orders-list');
    if (modal) modal.classList.remove('hidden');
    loadUserOrders();
}

function closeOrdersModal() {
    const modal = document.getElementById('modal-orders-list');
    if (modal) modal.classList.add('hidden');
}

/**
 * Fetch and render orders scoped to current user
 */
async function loadUserOrders(statusFilter = null) {
    const container = document.getElementById('orders-content-container');
    if (!container) return;

    container.innerHTML = `
        <div class="py-12 text-center text-stone-400 text-xs">
            <div class="w-8 h-8 border-2 border-gold-500/40 border-t-gold-400 rounded-full animate-spin mx-auto mb-3"></div>
            Loading orders from server...
        </div>
    `;

    try {
        const res = await fetchOrdersAPI(statusFilter);
        currentUserOrders = res.orders || [];

        if (currentUserOrders.length === 0) {
            container.innerHTML = `
                <div class="py-14 text-center">
                    <div class="w-16 h-16 mx-auto rounded-2xl bg-gold-500/10 text-gold-400 flex items-center justify-center text-2xl mb-4 border border-gold-500/20">
                        <i class="fa-solid fa-box-open"></i>
                    </div>
                    <h4 class="text-gold-200 font-bold text-base font-serif-heritage">No Orders Placed Yet</h4>
                    <p class="text-stone-400 text-xs mt-1">Direct purchases, winning auction bids, and accepted reverse bids will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = currentUserOrders.map(order => {
            const isArtisan = currentUser && currentUser.role === 'artisan';
            const isBuyer = currentUser && currentUser.role === 'buyer';
            const product = order.product || {};
            const title = product.name || (order.sourceType === 'REVERSE_BID' ? 'Wholesale Custom Requirement' : 'Heritage Craft Order');
            const sourceBadge = getOrderSourceBadge(order.sourceType);
            const statusBadge = getOrderStatusBadge(order.status);
            const nextStatus = getNextStatus(order.status);

            let thumbUrl = 'warli.png';
            if (product.images && product.images.length > 0) {
                const first = product.images[0];
                thumbUrl = resolveMediaUrl(typeof first === 'string' ? first : first.url);
            }

            return `
                <div class="p-4 sm:p-5 rounded-2xl bg-maroon-900/90 border border-gold-500/30 text-xs shadow-xl space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gold-500/20 pb-3">
                        <div class="flex items-center gap-3">
                            <img src="${thumbUrl}" alt="Product" class="w-12 h-12 rounded-xl object-cover border border-gold-500/30 bg-black" onError="this.onerror=null;this.src='warli.png'">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-gold-100 text-sm font-serif-heritage">Order #${order.id.slice(0, 8)}...</span>
                                    ${sourceBadge}
                                </div>
                                <h5 class="text-xs font-semibold text-stone-200 mt-0.5">${title}</h5>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 self-start sm:self-auto">
                            ${statusBadge}
                        </div>
                    </div>

                    <!-- Order Financials & Shipping -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-maroon-950/70 p-3 rounded-xl border border-gold-500/15">
                        <div>
                            <span class="text-stone-400 block text-[9px] uppercase font-bold">Quantity:</span>
                            <span class="font-bold text-gold-200">${order.quantity} Units</span>
                        </div>
                        <div>
                            <span class="text-stone-400 block text-[9px] uppercase font-bold">Total Amount:</span>
                            <span class="font-extrabold text-amber-300 font-mono text-xs">₹${Number(order.price).toLocaleString('en-IN')}</span>
                        </div>
                        <div class="col-span-2">
                            <span class="text-stone-400 block text-[9px] uppercase font-bold">Delivery Address:</span>
                            <span class="text-stone-300 truncate block"><i class="fa-solid fa-location-dot text-gold-400 me-1"></i> ${order.shippingAddress}</span>
                        </div>
                    </div>

                    <!-- Status Flow Stepper Visualization -->
                    <div class="pt-1">
                        <div class="flex items-center justify-between text-[10px] font-bold text-stone-400 mb-1.5 px-1">
                            <span>Fulfillment Progress:</span>
                            <span class="text-gold-300">${order.status}</span>
                        </div>
                        <div class="w-full bg-maroon-950 h-2 rounded-full overflow-hidden border border-gold-500/20">
                            <div class="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-500"
                                style="width: ${getStatusProgressPercent(order.status)}%;"></div>
                        </div>
                    </div>

                    <!-- Action Controls -->
                    <div class="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gold-500/15">
                        <span class="text-[10px] text-stone-400">
                            Ordered: ${new Date(order.createdAt).toLocaleDateString()}
                        </span>

                        <div class="flex items-center gap-2">
                            ${isArtisan && nextStatus ? `
                                <button onclick="handleUpdateOrderStatus('${order.id}', '${nextStatus}')"
                                    class="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-maroon-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5">
                                    <i class="fa-solid fa-forward-step"></i> Advance to "${nextStatus}" →
                                </button>
                            ` : ''}

                            ${isBuyer && order.status === 'Confirmed' ? `
                                <button onclick="handleUpdateOrderStatus('${order.id}', 'Cancelled')"
                                    class="py-1.5 px-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 font-bold text-xs hover:bg-red-900 transition-all">
                                    Cancel Order
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('[Orders] Failed to load orders:', err.message);
        container.innerHTML = `<p class="text-xs text-red-300 text-center py-6">Failed to load orders: ${err.message}</p>`;
    }
}

function getOrderSourceBadge(sourceType) {
    if (sourceType === 'AUCTION') {
        return '<span class="text-[10px] font-black text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded-full border border-amber-500/40">🔨 AUCTION</span>';
    }
    if (sourceType === 'REVERSE_BID') {
        return '<span class="text-[10px] font-black text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded-full border border-cyan-500/40">📋 REVERSE BID</span>';
    }
    return '<span class="text-[10px] font-black text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-500/40">🛍️ DIRECT</span>';
}

function getOrderStatusBadge(status) {
    if (status === 'Delivered') {
        return '<span class="text-[11px] font-black text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-500/40">✓ Delivered</span>';
    }
    if (status === 'Cancelled') {
        return '<span class="text-[11px] font-bold text-red-400 bg-red-950 px-3 py-1 rounded-full border border-red-500/40">Cancelled</span>';
    }
    if (status === 'Shipped') {
        return '<span class="text-[11px] font-bold text-cyan-300 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-500/40"><i class="fa-solid fa-truck-fast me-1"></i> Shipped</span>';
    }
    if (status === 'Ready') {
        return '<span class="text-[11px] font-bold text-purple-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-500/40">Ready</span>';
    }
    if (status === 'In Production') {
        return '<span class="text-[11px] font-bold text-amber-300 bg-amber-950 px-3 py-1 rounded-full border border-amber-500/40"><i class="fa-solid fa-palette me-1"></i> In Production</span>';
    }
    return '<span class="text-[11px] font-bold text-gold-300 bg-maroon-950 px-3 py-1 rounded-full border border-gold-500/40">Confirmed</span>';
}

function getStatusProgressPercent(status) {
    switch (status) {
        case 'Confirmed': return 20;
        case 'In Production': return 40;
        case 'Ready': return 65;
        case 'Shipped': return 85;
        case 'Delivered': return 100;
        default: return 10;
    }
}

function getNextStatus(currentStatus) {
    const idx = ORDER_STATUS_FLOW.indexOf(currentStatus);
    if (idx !== -1 && idx < ORDER_STATUS_FLOW.length - 1) {
        return ORDER_STATUS_FLOW[idx + 1];
    }
    return null;
}

/**
 * Transition order status
 */
async function handleUpdateOrderStatus(orderId, newStatus) {
    try {
        await updateOrderStatusAPI(orderId, { status: newStatus });
        alert(`Order updated to "${newStatus}".`);
        loadUserOrders();
    } catch (err) {
        alert(`Failed to update status: ${err.message}`);
    }
}

// Global Exports
if (typeof window !== 'undefined') {
    window.openOrdersModal = openOrdersModal;
    window.closeOrdersModal = closeOrdersModal;
    window.loadUserOrders = loadUserOrders;
    window.handleUpdateOrderStatus = handleUpdateOrderStatus;
}

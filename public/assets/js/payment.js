import { supabase } from "./supabaseClient.js";

/* ======================================================
   SYNC PAYMENTS (EDGE FUNCTION)
====================================================== */
window.syncPayments = async () => {
  console.log("🔄 Syncing payments (Edge)...");

  const btn = document.getElementById("btn-sync-payments");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Syncing...";
  }

  const { error } = await supabase.functions.invoke(
    "sync-marketplace-payments"
  );

  if (btn) {
    btn.disabled = false;
    btn.innerText = "Sync Payments";
  }

  if (error) {
    console.error("❌ Payment sync failed", error);
    alert("Payment sync failed");
    return;
  }

  await loadPayments();
};

/* ======================================================
   LOAD PAYMENTS (GRID)
====================================================== */
async function loadPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Payments load error:", error);
    return;
  }

  const el = document.getElementById("payments-container");
  if (!el) return;

  if (!data || data.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        No payments found
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="payments-grid">
      <div class="payments-header">
        <span>Provider</span>
        <span>Order</span>
        <span>Amount</span>
        <span>Status</span>
        <span>Date</span>
      </div>

      ${data.map(p => `
        <div class="payments-row">
          <span class="provider">${(p.provider || "-").toUpperCase()}</span>
          <span class="order">${p.order_id || "-"}</span>
          <span class="amount">$${Number(p.amount || 0).toFixed(2)}</span>
          <span class="status status-${p.status}">
            ${p.status}
          </span>
          <span class="date">
            ${new Date(p.payment_date).toLocaleString()}
          </span>
        </div>
      `).join("")}
    </div>
  `;
}

/* ======================================================
   PROCESS PAYOUTS (PLACEHOLDER)
====================================================== */
window.processAllPayouts = () => {
  alert("Payout processing will be implemented next");
};

/* ======================================================
   EVENTS
====================================================== */
document
  .getElementById("btn-sync-payments")
  ?.addEventListener("click", window.syncPayments);

document
  .getElementById("btn-process-payouts")
  ?.addEventListener("click", window.processAllPayouts);

/* ======================================================
   INIT
====================================================== */
document.addEventListener("DOMContentLoaded", loadPayments);

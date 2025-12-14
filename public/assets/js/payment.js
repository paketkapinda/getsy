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
  const container = document.getElementById('payments-container');
  if (!container) return;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', user.id)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Payments load error:', error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p>No payments found</p>`;
    return;
  }

  container.innerHTML = `
    <table class="table payments-table">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Order</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(p => `
          <tr>
            <td>${p.provider}</td>
            <td>${p.order_id || '-'}</td>
            <td>${Number(p.amount).toFixed(2)} ${p.currency}</td>
            <td>${p.status}</td>
            <td>${new Date(p.payment_date).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
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

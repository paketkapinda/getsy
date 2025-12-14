import { supabase } from "./supabaseClient.js";

window.syncPayments = async () => {
  console.log("🔄 Syncing payments (Edge)...");

  const { error } = await supabase.functions.invoke(
    "sync-marketplace-payments"
  );

  if (error) {
    console.error("❌ Payment sync failed", error);
    alert("Payment sync failed");
    return;
  }

  await loadPayments();
};

async function loadPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("payment_date", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const el = document.getElementById("payments-container");
  if (!el) return;

  el.innerHTML = `
    <table class="table">
      <tr>
        <th>Provider</th>
        <th>Order</th>
        <th>Amount</th>
        <th>Status</th>
        <th>Date</th>
      </tr>
      ${data.map(p => `
        <tr>
          <td>${p.provider}</td>
          <td>${p.order_id}</td>
          <td>${p.amount} ${p.currency}</td>
          <td>${p.status}</td>
          <td>${new Date(p.payment_date).toLocaleString()}</td>
        </tr>
      `).join("")}
    </table>
  `;
}

document
  .getElementById("btn-sync-payments")
  ?.addEventListener("click", syncPayments);

loadPayments();

// Team member invite, role management

import { supabase } from './supabaseClient.js';
import { api } from './api.js';
import { showNotification, showModal, hideModal, setupModalClose } from './ui.js';
import { formatDate } from './helpers.js';

export async function loadTeamMembers() {
  const container = document.getElementById('team-members-list');
  if (!container) return;

  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*, profiles(email, full_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-400">No team members yet.</p>';
      return;
    }

    container.innerHTML = data.map(member => `
      <div class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div>
          <p class="font-medium">${member.profiles?.full_name || member.profiles?.email || '—'}</p>
          <p class="text-xs text-slate-400">${member.role || 'operator'} · Joined ${formatDate(member.created_at)}</p>
        </div>
        <span class="rounded px-2 py-0.5 text-xs bg-slate-800 text-slate-300">${member.role || 'operator'}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading team members:', error);
    container.innerHTML = '<p class="text-sm text-red-300">Error loading team members</p>';
  }
}

export function initTeamInvite() {
  const btnInvite = document.getElementById('btn-invite-member');
  if (!btnInvite) return;

  btnInvite.addEventListener('click', () => {
    const email = prompt('Enter email address to invite:');
    if (!email) return;

    // In real implementation, would call an edge function to send invite
    showNotification('Invite functionality requires backend implementation', 'info');
  });
}

// Initialize
if (document.getElementById('team-members-list')) {
  loadTeamMembers();
  initTeamInvite();
}


// public/js/modules/settings/instansi-manager.js
// Instansi Management Module

let instansiList = [];
let isEditingInstansi = false;

/**
 * Fetch all instansi from API
 */
export async function fetchInstansi() {
  try {
    const res = await fetch('/api/instansi'); // ✅ Hapus parameter showInactive
    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Gagal memuat data instansi');
    }

    instansiList = result.data || [];
    renderInstansiTable();
    updateInstansiDropdowns();
    
    return instansiList;
  } catch (error) {
    console.error('Error fetching instansi:', error);
    Swal.fire('Error', error.message, 'error');
    return [];
  }
}
/**
 * Render instansi management table
 */
export function renderInstansiTable() {
  const tbody = document.getElementById('instansi-management-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (instansiList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px;">
          <i class="fa-solid fa-building" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
          <p style="color: #a0aec0; margin: 0;">Belum ada data instansi</p>
        </td>
      </tr>
    `;
    return;
  }

  instansiList.forEach((instansi) => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${instansi.id}</td>
      <td><strong>${instansi.nama}</strong></td>
      <td>${instansi.keterangan || '-'}</td>
      <td class="action-buttons">
        <button class="edit-instansi-btn" onclick="window.instansiModule.showEditInstansiModal(${instansi.id})">
          <i class="fa-solid fa-edit"></i> Edit
        </button>
        <button class="delete-instansi-btn" onclick="window.instansiModule.deleteInstansi(${instansi.id}, '${instansi.nama}')">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

/**
 * Update all instansi dropdowns in forms
 */
export function updateInstansiDropdowns() {
  const dropdowns = [
    document.getElementById('contact-crud-instansi'),
    document.getElementById('edit-contact-instansi')
  ];

  dropdowns.forEach(dropdown => {
    if (!dropdown) return;

    const currentValue = dropdown.value;
    
    dropdown.innerHTML = '<option value="">-- Pilih Instansi --</option>';
    
    instansiList.forEach(instansi => {
      const option = document.createElement('option');
      option.value = instansi.nama;
      option.textContent = instansi.nama;
      dropdown.appendChild(option);
    });

    if (currentValue) {
      dropdown.value = currentValue;
    }
  });
}

/**
 * Handle instansi form submit (add/edit)
 */
export async function handleInstansiFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('instansi-crud-id').value;
  const nama = document.getElementById('instansi-crud-nama').value.trim();
  const keterangan = document.getElementById('instansi-crud-keterangan').value.trim();

  if (!nama || nama.length < 2) {
    Swal.fire({
      icon: 'error',
      title: 'Validasi Gagal',
      text: 'Nama instansi minimal 2 karakter',
      confirmButtonColor: '#f56565'
    });
    return;
  }

  const url = id ? `/api/instansi/${id}` : '/api/instansi';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, keterangan })
    });

    const result = await res.json();

    if (res.status === 409 && result.duplicate) {
      Swal.fire({
        icon: 'error',
        title: 'Duplikasi Data',
        text: result.error,
        confirmButtonColor: '#f56565'
      });
      return;
    }

    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Terjadi kesalahan');
    }

    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: result.message,
      confirmButtonColor: '#48bb78',
      timer: 2000
    });

    resetInstansiForm();
    await fetchInstansi();

  } catch (error) {
    console.error('Error saving instansi:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message,
      confirmButtonColor: '#f56565'
    });
  }
}

/**
 * Show edit instansi modal
 */
export function showEditInstansiModal(id) {
  const instansi = instansiList.find(i => i.id === id);
  if (!instansi) {
    Swal.fire('Error', 'Instansi tidak ditemukan', 'error');
    return;
  }

  Swal.fire({
    title: 'Edit Instansi',
    html: `
      <div style="text-align: left;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">
          <i class="fa-solid fa-building"></i> Nama Instansi:
        </label>
        <input 
          type="text" 
          id="swal-edit-instansi-nama" 
          class="swal2-input" 
          value="${instansi.nama}"
          placeholder="Nama Instansi"
          style="width: 100%; margin: 0 0 16px 0;"
        />
        
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">
          <i class="fa-solid fa-comment"></i> Keterangan (opsional):
        </label>
        <textarea 
          id="swal-edit-instansi-keterangan" 
          class="swal2-textarea" 
          placeholder="Deskripsi instansi..."
          style="width: 100%; margin: 0; min-height: 80px;"
        >${instansi.keterangan || ''}</textarea>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: '<i class="fa-solid fa-save"></i> Update',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#4299e1',
    cancelButtonColor: '#718096',
    width: '500px',
    preConfirm: () => {
      const nama = document.getElementById('swal-edit-instansi-nama').value.trim();
      const keterangan = document.getElementById('swal-edit-instansi-keterangan').value.trim();
      
      if (!nama || nama.length < 2) {
        Swal.showValidationMessage('Nama instansi minimal 2 karakter');
        return false;
      }
      
      return { id, nama, keterangan };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      await handleEditInstansi(result.value);
    }
  });
}

/**
 * Handle edit instansi submission
 */
async function handleEditInstansi({ id, nama, keterangan }) {
  try {
    const res = await fetch(`/api/instansi/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, keterangan })
    });

    const result = await res.json();

    if (res.status === 409 && result.duplicate) {
      Swal.fire({
        icon: 'error',
        title: 'Duplikasi Data',
        text: result.error,
        confirmButtonColor: '#f56565'
      });
      return;
    }

    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Terjadi kesalahan');
    }

    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: result.message,
      confirmButtonColor: '#48bb78',
      timer: 2000
    });

    await fetchInstansi();

  } catch (error) {
    console.error('Error updating instansi:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message,
      confirmButtonColor: '#f56565'
    });
  }
}

/**
 * Edit instansi (untuk form biasa, bukan modal)
 */
export function editInstansi(id) {
  const instansi = instansiList.find(i => i.id === id);
  if (!instansi) {
    Swal.fire('Error', 'Instansi tidak ditemukan', 'error');
    return;
  }

  document.getElementById('instansi-crud-id').value = instansi.id;
  document.getElementById('instansi-crud-nama').value = instansi.nama;
  document.getElementById('instansi-crud-keterangan').value = instansi.keterangan || '';

  const submitBtn = document.getElementById('instansi-crud-submit');
  const cancelBtn = document.getElementById('instansi-crud-cancel');

  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Update Instansi';
  }
  if (cancelBtn) {
    cancelBtn.style.display = 'block';
  }

  isEditingInstansi = true;

  document.getElementById('instansi-crud-nama').focus();
  document.getElementById('instansi-crud-nama').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Delete instansi (HARD DELETE)
 */
export async function deleteInstansi(id, nama) {
  const result = await Swal.fire({
    title: `Hapus Instansi "${nama}"?`,
    html: `
      <p style="color: #718096;">Instansi akan dihapus permanen dari database.</p>
      <p style="color: #f56565; margin-top: 12px;">
        <i class="fa-solid fa-warning"></i> 
        Tindakan ini tidak dapat dibatalkan!
      </p>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f56565',
    cancelButtonColor: '#718096',
    confirmButtonText: '<i class="fa-solid fa-trash"></i> Ya, Hapus Permanen',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`/api/instansi/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal menghapus instansi');
    }

    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: data.message,
      confirmButtonColor: '#48bb78',
      timer: 2000
    });

    await fetchInstansi(); // ✅ PERBAIKAN: Hapus parameter true

  } catch (error) {
    console.error('Error deleting instansi:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message,
      confirmButtonColor: '#f56565'
    });
  }
}
/**
 * Restore instansi
 */
export async function restoreInstansi(id) {
  try {
    const res = await fetch(`/api/instansi/${id}/restore`, {
      method: 'PATCH'
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Gagal mengaktifkan instansi');
    }

    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: result.message,
      confirmButtonColor: '#48bb78',
      timer: 2000
    });

    await fetchInstansi(true);

  } catch (error) {
    console.error('Error restoring instansi:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message,
      confirmButtonColor: '#f56565'
    });
  }
}

/**
 * Reset instansi form
 */
export function resetInstansiForm() {
  document.getElementById('instansi-crud-form').reset();
  document.getElementById('instansi-crud-id').value = '';

  const submitBtn = document.getElementById('instansi-crud-submit');
  const cancelBtn = document.getElementById('instansi-crud-cancel');

  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Tambah Instansi';
  }
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }

  isEditingInstansi = false;
}

/**
 * Initialize instansi listeners
 */
export function initInstansiListeners() {
  const form = document.getElementById('instansi-crud-form');
  if (form) {
    form.addEventListener('submit', handleInstansiFormSubmit);
  }

  const cancelBtn = document.getElementById('instansi-crud-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetInstansiForm);
  }
}

/**
 * Get instansi list
 */
export function getInstansiList() {
  return instansiList;
}
// public/js/modules/settings/jabatan-manager.js
// Jabatan Management Module (Updated: Modal + Hard Delete)

let jabatanList = [];
let isEditingJabatan = false;

/**
 * Fetch all jabatan from API
 */
export async function fetchJabatan() {
  try {
    const res = await fetch('/api/jabatan');
    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Gagal memuat data jabatan');
    }

    jabatanList = result.data || [];
    renderJabatanTable();
    updateJabatanDropdowns();
    
    return jabatanList;
  } catch (error) {
    console.error('Error fetching jabatan:', error);
    Swal.fire('Error', error.message, 'error');
    return [];
  }
}

/**
 * Render jabatan management table
 */
export function renderJabatanTable() {
  const tbody = document.getElementById('jabatan-management-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (jabatanList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px;">
          <i class="fa-solid fa-briefcase" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
          <p style="color: #a0aec0; margin: 0;">Belum ada data jabatan</p>
        </td>
      </tr>
    `;
    return;
  }

  jabatanList.forEach((jabatan) => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${jabatan.id}</td>
      <td><strong>${jabatan.nama}</strong></td>
      <td>${jabatan.keterangan || '-'}</td>
      <td class="action-buttons">
        <button class="edit-jabatan-btn" onclick="window.jabatanModule.showEditJabatanModal(${jabatan.id})">
          <i class="fa-solid fa-edit"></i> Edit
        </button>
        <button class="delete-jabatan-btn" onclick="window.jabatanModule.deleteJabatan(${jabatan.id}, '${jabatan.nama}')">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

/**
 * Update all jabatan dropdowns in forms
 */
export function updateJabatanDropdowns() {
  const dropdowns = [
    document.getElementById('contact-crud-jabatan'),
    document.getElementById('edit-contact-jabatan')
  ];

  dropdowns.forEach(dropdown => {
    if (!dropdown) return;

    const currentValue = dropdown.value;
    
    dropdown.innerHTML = '<option value="">-- Pilih Jabatan --</option>';
    
    jabatanList.forEach(jabatan => {
      const option = document.createElement('option');
      option.value = jabatan.nama;
      option.textContent = jabatan.nama;
      dropdown.appendChild(option);
    });

    if (currentValue) {
      dropdown.value = currentValue;
    }
  });
}

/**
 * Handle jabatan form submit (add/edit)
 */
export async function handleJabatanFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('jabatan-crud-id').value;
  const nama = document.getElementById('jabatan-crud-nama').value.trim();
  const keterangan = document.getElementById('jabatan-crud-keterangan').value.trim();

  if (!nama || nama.length < 2) {
    Swal.fire({
      icon: 'error',
      title: 'Validasi Gagal',
      text: 'Nama jabatan minimal 2 karakter',
      confirmButtonColor: '#f56565'
    });
    return;
  }

  const url = id ? `/api/jabatan/${id}` : '/api/jabatan';
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

    resetJabatanForm();
    await fetchJabatan();

  } catch (error) {
    console.error('Error saving jabatan:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message,
      confirmButtonColor: '#f56565'
    });
  }
}

/**
 * Show edit jabatan modal
 */
export function showEditJabatanModal(id) {
  const jabatan = jabatanList.find(j => j.id === id);
  if (!jabatan) {
    Swal.fire('Error', 'Jabatan tidak ditemukan', 'error');
    return;
  }

  Swal.fire({
    title: 'Edit Jabatan',
    html: `
      <div style="text-align: left;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">
          <i class="fa-solid fa-briefcase"></i> Nama Jabatan:
        </label>
        <input 
          type="text" 
          id="swal-edit-jabatan-nama" 
          class="swal2-input" 
          value="${jabatan.nama}"
          placeholder="Nama Jabatan"
          style="width: 100%; margin: 0 0 16px 0;"
        />
        
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">
          <i class="fa-solid fa-comment"></i> Keterangan (opsional):
        </label>
        <textarea 
          id="swal-edit-jabatan-keterangan" 
          class="swal2-textarea" 
          placeholder="Deskripsi jabatan..."
          style="width: 100%; margin: 0; min-height: 80px;"
        >${jabatan.keterangan || ''}</textarea>
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
      const nama = document.getElementById('swal-edit-jabatan-nama').value.trim();
      const keterangan = document.getElementById('swal-edit-jabatan-keterangan').value.trim();
      
      if (!nama || nama.length < 2) {
        Swal.showValidationMessage('Nama jabatan minimal 2 karakter');
        return false;
      }
      
      return { id, nama, keterangan };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      await handleEditJabatan(result.value);
    }
  });
}

/**
 * Handle edit jabatan submission
 */
async function handleEditJabatan({ id, nama, keterangan }) {
  try {
    const res = await fetch(`/api/jabatan/${id}`, {
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

    await fetchJabatan();

  } catch (error) {
    console.error('Error updating jabatan:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message,
      confirmButtonColor: '#f56565'
    });
  }
}

/**
 * Edit jabatan (untuk form biasa, bukan modal)
 */
export function editJabatan(id) {
  const jabatan = jabatanList.find(j => j.id === id);
  if (!jabatan) {
    Swal.fire('Error', 'Jabatan tidak ditemukan', 'error');
    return;
  }

  document.getElementById('jabatan-crud-id').value = jabatan.id;
  document.getElementById('jabatan-crud-nama').value = jabatan.nama;
  document.getElementById('jabatan-crud-keterangan').value = jabatan.keterangan || '';

  const submitBtn = document.getElementById('jabatan-crud-submit');
  const cancelBtn = document.getElementById('jabatan-crud-cancel');

  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Update Jabatan';
  }
  if (cancelBtn) {
    cancelBtn.style.display = 'block';
  }

  isEditingJabatan = true;

  document.getElementById('jabatan-crud-nama').focus();
  document.getElementById('jabatan-crud-nama').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Delete jabatan
 */
export async function deleteJabatan(id, nama) {
  const result = await Swal.fire({
    title: `Hapus Jabatan "${nama}"?`,
    html: `
      <p style="color: #718096;">Jabatan akan dihapus permanen dari database.</p>
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
    const res = await fetch(`/api/jabatan/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal menghapus jabatan');
    }

    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: data.message,
      confirmButtonColor: '#48bb78',
      timer: 2000
    });

    await fetchJabatan();

  } catch (error) {
    console.error('Error deleting jabatan:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message,
      confirmButtonColor: '#f56565'
    });
  }
}

/**
 * Restore jabatan (REMOVED - tidak digunakan lagi)
 */
export async function restoreJabatan(id) {
  console.warn('restoreJabatan is deprecated - using hard delete now');
}

/**
 * Reset jabatan form
 */
export function resetJabatanForm() {
  document.getElementById('jabatan-crud-form').reset();
  document.getElementById('jabatan-crud-id').value = '';

  const submitBtn = document.getElementById('jabatan-crud-submit');
  const cancelBtn = document.getElementById('jabatan-crud-cancel');

  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Tambah Jabatan';
  }
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }

  isEditingJabatan = false;
}

/**
 * Initialize jabatan listeners
 */
export function initJabatanListeners() {
  const form = document.getElementById('jabatan-crud-form');
  if (form) {
    form.addEventListener('submit', handleJabatanFormSubmit);
  }

  const cancelBtn = document.getElementById('jabatan-crud-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetJabatanForm);
  }
}

/**
 * Get jabatan list
 */
export function getJabatanList() {
  return jabatanList;
}
// contact-import.js - Complete Contact Import Module (FIXED)
// Path: public/js/modules/contacts/contact-import.js

/**
 * Initialize contact import functionality
 */
export function initContactImport() {
  const importForm = document.getElementById('import-form');
  const fileInput = importForm?.querySelector('input[type="file"]');
  
  if (!importForm || !fileInput) {
    console.error('❌ Import form or file input not found');
    return;
  }
  
  // Preview file name when selected
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      console.log(`📄 File dipilih: ${file.name} (${formatFileSize(file.size)})`);
      showFileInfo(file);
    }
  });
  
  // Handle form submission
  importForm.addEventListener('submit', handleImportSubmit);
  
  // ✅ FIX: Setup template download buttons
  setupTemplateButtons();
  
  console.log('✅ Contact import initialized');
}

/**
 * ✅ NEW: Setup template download buttons
 */
function setupTemplateButtons() {
  const csvBtn = document.getElementById('downloadCSVTemplate');
  const excelBtn = document.getElementById('showExcelGuide');
  
  if (csvBtn) {
    csvBtn.addEventListener('click', (e) => {
      e.preventDefault();
      downloadCSVTemplate();
    });
    console.log('✅ CSV template button ready');
  }
  
  if (excelBtn) {
    excelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      downloadExcelTemplate();
    });
    console.log('✅ Excel guide button ready');
  }
}

/**
 * Show file info preview
 */
function showFileInfo(file) {
  // Remove existing info
  const existingInfo = document.querySelector('.import-file-info');
  if (existingInfo) {
    existingInfo.remove();
  }
  
  const fileInput = document.querySelector('#import-form input[type="file"]');
  if (!fileInput) return;
  
  const info = document.createElement('div');
  info.className = 'import-file-info';
  
  const fileIcon = getFileIcon(file.name);
  const fileExt = getFileExtension(file.name).toUpperCase().replace('.', '');
  
  info.innerHTML = `
    <div>
      <div class="file-icon-box">
        <i class="${fileIcon}"></i>
      </div>
      <div class="file-details">
        <strong>${file.name}</strong>
        <small>
          <span>${formatFileSize(file.size)}</span>
          <span class="file-type-badge">${fileExt}</span>
        </small>
      </div>
      <button type="button" class="file-clear-btn" onclick="this.closest('.import-file-info').remove(); document.querySelector('#import-form input[type=file]').value = '';">
        <i class="fa-solid fa-times"></i>
      </button>
    </div>
  `;
  
  fileInput.closest('.import-file-wrapper').appendChild(info);
}

/**
 * Get file icon based on extension
 */
function getFileIcon(filename) {
  const ext = getFileExtension(filename);
  const iconMap = {
    '.csv': 'fa-solid fa-file-csv',
    '.xlsx': 'fa-solid fa-file-excel',
    '.xls': 'fa-solid fa-file-excel',
    '.json': 'fa-solid fa-file-code'
  };
  return iconMap[ext] || 'fa-solid fa-file';
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension
 */
function getFileExtension(filename) {
  return filename.substring(filename.lastIndexOf('.')).toLowerCase();
}

/**
 * Handle import form submission
 */
async function handleImportSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const fileInput = form.querySelector('input[type="file"]');
  const file = fileInput.files[0];
  
  // Validate file selection
  if (!file) {
    Swal.fire({
      icon: 'error',
      title: 'File Tidak Dipilih',
      text: 'Silakan pilih file untuk diimport',
      confirmButtonColor: '#f56565'
    });
    return;
  }
  
  // Validate file type
  const validExtensions = ['.csv', '.json', '.xlsx', '.xls'];
  const fileExt = getFileExtension(file.name);
  
  if (!validExtensions.includes(fileExt)) {
    Swal.fire({
      icon: 'error',
      title: 'Format File Tidak Didukung',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p style="margin-bottom: 12px;">File yang dipilih: <strong>${file.name}</strong></p>
          <div style="background: #f7fafc; padding: 14px; border-radius: 8px; border-left: 4px solid #fc8181;">
            <strong style="color: #2d3748; display: block; margin-bottom: 8px;">Format yang didukung:</strong>
            <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 13px;">
              <li>CSV (.csv)</li>
              <li>Excel (.xlsx, .xls)</li>
              <li>JSON (.json)</li>
            </ul>
          </div>
        </div>
      `,
      confirmButtonColor: '#f56565'
    });
    return;
  }
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    Swal.fire({
      icon: 'error',
      title: 'File Terlalu Besar',
      html: `
        <div style="text-align: center;">
          <p style="margin-bottom: 12px;">Ukuran file maksimal <strong>5MB</strong></p>
          <div style="background: #fff5f5; padding: 12px; border-radius: 6px; border-left: 4px solid #f56565;">
            <strong style="color: #e53e3e;">File Anda: ${formatFileSize(file.size)}</strong>
          </div>
          <p style="margin-top: 12px; color: #718096; font-size: 13px;">
            Silakan kompres atau pecah file menjadi beberapa bagian
          </p>
        </div>
      `,
      confirmButtonColor: '#f56565'
    });
    return;
  }
  
  // Show loading
  Swal.fire({
    title: '<i class="fa-solid fa-spinner fa-spin"></i> Mengimport...',
    html: `
      <div style="text-align: center; padding: 10px;">
        <p style="color: #718096; margin-bottom: 12px;">Mohon tunggu, sedang memproses file...</p>
        <div style="background: #f7fafc; padding: 14px; border-radius: 8px; display: inline-block; min-width: 250px;">
          <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
            <i class="${getFileIcon(file.name)}" style="font-size: 24px; color: #4299e1;"></i>
            <div style="text-align: left;">
              <strong style="display: block; color: #2d3748; font-size: 14px;">${file.name}</strong>
              <small style="color: #a0aec0;">${formatFileSize(file.size)}</small>
            </div>
          </div>
        </div>
        <p style="margin-top: 16px; color: #a0aec0; font-size: 12px;">
          <i class="fa-solid fa-circle-info"></i> Jangan tutup halaman ini
        </p>
      </div>
    `,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });
  
  try {
    const formData = new FormData(form);
    const response = await fetch('/api/import', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Gagal mengimport kontak');
    }
    
    await showImportSuccess(result);
    
    // Reset form
    form.reset();
    const fileInfo = document.querySelector('.import-file-info');
    if (fileInfo) fileInfo.remove();
    
    // Refresh contact list
    if (window.contactManagerModule && window.contactManagerModule.fetchAndRenderContacts) {
      await window.contactManagerModule.fetchAndRenderContacts();
    }
    
    if (window.groupModule && window.groupModule.fetchAndRenderGroups) {
      await window.groupModule.fetchAndRenderGroups();
    }
    
  } catch (error) {
    console.error('Import error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Import Gagal',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p style="color: #e53e3e; margin-bottom: 12px;">
            <strong>Terjadi kesalahan saat mengimport kontak</strong>
          </p>
          <div style="background: #fff5f5; padding: 12px; border-radius: 6px; border-left: 4px solid #f56565;">
            <small style="color: #742a2a; font-family: monospace;">${error.message}</small>
          </div>
          <p style="margin-top: 16px; color: #4a5568; font-size: 13px;">
            Silakan periksa format file dan coba lagi
          </p>
        </div>
      `,
      confirmButtonColor: '#f56565'
    });
  }
}

/**
 * Show import success with statistics
 */
async function showImportSuccess(result) {
  const { stats, errors } = result;
  
  let html = '<div style="text-align: left; padding: 10px;">';
  
  // Success banner
  html += `
    <div style="background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%); padding: 16px; border-radius: 10px; margin-bottom: 16px; border-left: 4px solid #48bb78; box-shadow: 0 2px 8px rgba(72, 187, 120, 0.15);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <div style="background: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <i class="fa-solid fa-check-circle" style="color: #48bb78; font-size: 24px;"></i>
        </div>
        <div>
          <strong style="color: #22543d; font-size: 18px; display: block;">Import Berhasil!</strong>
          <span style="color: #2f855a; font-size: 14px;">${stats.imported} kontak ditambahkan</span>
        </div>
      </div>
    </div>
  `;
  
  // Statistics table
  html += `
    <div style="background: #f7fafc; padding: 16px; border-radius: 8px; margin-bottom: 12px; border: 2px solid #e2e8f0;">
      <strong style="color: #2d3748; display: block; margin-bottom: 12px; font-size: 15px;">
        <i class="fa-solid fa-chart-pie"></i> Statistik Import:
      </strong>
      <table style="width: 100%; font-size: 14px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #4a5568;">
            <i class="fa-solid fa-check" style="color: #48bb78; margin-right: 8px;"></i>
            Berhasil ditambahkan
          </td>
          <td style="text-align: right; padding: 8px 0;">
            <strong style="color: #48bb78; font-size: 16px;">${stats.imported}</strong>
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #4a5568;">
            <i class="fa-solid fa-exclamation-triangle" style="color: #ed8936; margin-right: 8px;"></i>
            Diabaikan (duplikat/invalid)
          </td>
          <td style="text-align: right; padding: 8px 0;">
            <strong style="color: #ed8936; font-size: 16px;">${stats.skipped}</strong>
          </td>
        </tr>
        <tr style="background: #edf2f7;">
          <td style="padding: 12px 8px; color: #2d3748; font-weight: 600;">
            <i class="fa-solid fa-database" style="color: #4299e1; margin-right: 8px;"></i>
            Total data diproses
          </td>
          <td style="text-align: right; padding: 12px 8px;">
            <strong style="color: #2d3748; font-size: 18px;">${stats.total}</strong>
          </td>
        </tr>
      </table>
    </div>
  `;
  
  // Skipped info
  if (stats.skipped > 0) {
    html += `
      <div style="background: linear-gradient(135deg, #fffaf0 0%, #feebc8 100%); padding: 14px; border-radius: 8px; border-left: 4px solid #ed8936; margin-bottom: 12px;">
        <strong style="color: #c05621; display: block; margin-bottom: 6px;">
          <i class="fa-solid fa-info-circle"></i> ${stats.skipped} kontak diabaikan
        </strong>
        <small style="color: #744210; display: block; line-height: 1.5;">
          Kontak diabaikan karena:
          <ul style="margin: 6px 0 0 20px; padding: 0;">
            <li>Nomor sudah terdaftar</li>
            <li>Format nomor tidak valid</li>
            <li>Data tidak lengkap (nama < 2 karakter)</li>
          </ul>
        </small>
      </div>
    `;
  }
  
  // Errors (if any)
  if (errors && errors.length > 0) {
    html += `
      <details style="background: #fff5f5; padding: 12px; border-radius: 8px; border-left: 4px solid #f56565; cursor: pointer;">
        <summary style="font-weight: 600; color: #e53e3e; margin-bottom: 8px; cursor: pointer;">
          <i class="fa-solid fa-exclamation-circle"></i> Detail Error (${errors.length})
        </summary>
        <div style="max-height: 200px; overflow-y: auto; margin-top: 12px; padding-top: 12px; border-top: 1px solid #fed7d7;">
    `;
    
    errors.slice(0, 15).forEach((error, index) => {
      html += `
        <div style="padding: 6px 8px; margin-bottom: 4px; background: white; border-radius: 4px; font-size: 12px; color: #742a2a;">
          <strong>${index + 1}.</strong> ${error}
        </div>
      `;
    });
    
    if (errors.length > 15) {
      html += `
        <div style="padding: 8px; text-align: center; color: #a0aec0; font-size: 12px; border-top: 1px solid #fed7d7; margin-top: 8px;">
          ... dan ${errors.length - 15} error lainnya
        </div>
      `;
    }
    
    html += `
        </div>
      </details>
    `;
  }
  
  html += '</div>';
  
  return Swal.fire({
    icon: 'success',
    title: 'Import Selesai',
    html: html,
    confirmButtonColor: '#48bb78',
    confirmButtonText: 'OK',
    width: '600px'
  });
}

/**
 * Download CSV template
 */
export function downloadCSVTemplate() {
  const template = `name,number,instansi,jabatan,grup
John Doe,081234567890,Tim TI,Pegawai,Tim TI
Jane Smith,082345678901,Tim Umum,Kepala Bagian Umum,Tim Umum
Ahmad Hassan,+6283456789012,Tim Statistik Sosial,Pegawai,Tim Sosial
Siti Nurhaliza,628987654321,Tim IPDS (TI),Pegawai,Tim TI
Budi Santoso,081122334455,Tim Administrasi,Pegawai,Tim Admin`;
  
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template_import_kontak_' + new Date().getTime() + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  Swal.fire({
    icon: 'success',
    title: 'Template Diunduh',
    html: `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 12px;">Template CSV berhasil diunduh!</p>
        
        <div style="background: #ebf8ff; padding: 14px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #4299e1;">
          <strong style="color: #2c5282; display: block; margin-bottom: 8px;">
            <i class="fa-solid fa-table"></i> Format Kolom:
          </strong>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #bee3f8;">
              <td style="padding: 6px 0; color: #2c5282;"><strong>name</strong></td>
              <td style="padding: 6px 0; color: #4a5568;">Nama kontak (wajib, min 2 karakter)</td>
            </tr>
            <tr style="border-bottom: 1px solid #bee3f8;">
              <td style="padding: 6px 0; color: #2c5282;"><strong>number</strong></td>
              <td style="padding: 6px 0; color: #4a5568;">Nomor telepon (wajib, format: 08xx/+628xx/628xx)</td>
            </tr>
            <tr style="border-bottom: 1px solid #bee3f8;">
              <td style="padding: 6px 0; color: #2c5282;"><strong>instansi</strong></td>
              <td style="padding: 6px 0; color: #4a5568;">Nama instansi (opsional)</td>
            </tr>
            <tr style="border-bottom: 1px solid #bee3f8;">
              <td style="padding: 6px 0; color: #2c5282;"><strong>jabatan</strong></td>
              <td style="padding: 6px 0; color: #4a5568;">Jabatan (opsional)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #2c5282;"><strong>grup</strong></td>
              <td style="padding: 6px 0; color: #4a5568;">Nama grup (opsional, harus sudah ada)</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fffaf0; padding: 12px; border-radius: 6px; border-left: 4px solid #ed8936;">
          <strong style="color: #c05621; display: block; margin-bottom: 6px;">
            <i class="fa-solid fa-users"></i> Tips Sinkronisasi Grup:
          </strong>
          <ul style="margin: 6px 0 0 20px; padding: 0; color: #744210; font-size: 12px; line-height: 1.6;">
            <li>Pastikan grup sudah dibuat terlebih dahulu di menu <strong>Manajemen Grup</strong></li>
            <li>Nama grup di file CSV harus <strong>sama persis</strong> dengan nama grup di database (case-sensitive)</li>
            <li>Jika nama grup tidak ditemukan, kontak tetap diimport tapi tidak masuk grup</li>
            <li>Satu kontak hanya bisa masuk ke satu grup saat import</li>
          </ul>
        </div>
      </div>
    `,
    confirmButtonColor: '#4299e1',
    width: '650px'
  });
}

/**
 * Download Excel template with group sync support
 */
export function downloadExcelTemplate() {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Sample data with examples
  const data = [
    {
      name: 'John Doe',
      number: '081234567890',
      instansi: 'Tim TI',
      jabatan: 'Pegawai',
      grup: 'Tim TI'
    },
    {
      name: 'Jane Smith',
      number: '082345678901',
      instansi: 'Tim Umum',
      jabatan: 'Kepala Bagian Umum',
      grup: 'Tim Umum'
    },
    {
      name: 'Ahmad Hassan',
      number: '+6283456789012',
      instansi: 'Tim Statistik Sosial',
      jabatan: 'Pegawai',
      grup: 'Tim Sosial'
    },
    {
      name: 'Siti Nurhaliza',
      number: '628987654321',
      instansi: 'Tim IPDS (TI)',
      jabatan: 'Pegawai',
      grup: 'Tim TI'
    },
    {
      name: 'Budi Santoso',
      number: '081122334455',
      instansi: 'Tim Administrasi',
      jabatan: 'Pegawai',
      grup: 'Tim Admin'
    }
  ];
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // name
    { wch: 18 }, // number
    { wch: 30 }, // instansi
    { wch: 25 }, // jabatan
    { wch: 20 }  // grup
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Kontak');
  
  // Generate filename with timestamp
  const filename = `template_import_kontak_${new Date().getTime()}.xlsx`;
  
  // Download file
  XLSX.writeFile(wb, filename);
  
  // Show success message
  Swal.fire({
    icon: 'success',
    title: 'Template Excel Diunduh',
    html: `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 12px;">Buat file Excel dengan kolom berikut:</p>
        
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px;">
            <thead>
              <tr style="background: #f7fafc;">
                <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Kolom</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Contoh</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 8px;"><strong>name</strong></td>
                <td style="border: 1px solid #e2e8f0; padding: 8px;">John Doe</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; color: #e53e3e;">Wajib</td>
              </tr>
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 8px;"><strong>number</strong></td>
                <td style="border: 1px solid #e2e8f0; padding: 8px;">081234567890</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; color: #e53e3e;">Wajib</td>
              </tr>
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 8px;"><strong>instansi</strong></td>
                <td style="border: 1px solid #e2e8f0; padding: 8px;">Tim TI</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; color: #718096;">Opsional</td>
              </tr>
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 8px;"><strong>jabatan</strong></td>
                <td style="border: 1px solid #e2e8f0; padding: 8px;">Pegawai</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; color: #718096;">Opsional</td>
              </tr>
              <tr style="background: #ebf8ff;">
                <td style="border: 1px solid #e2e8f0; padding: 8px;"><strong>grup</strong></td>
                <td style="border: 1px solid #e2e8f0; padding: 8px;">Tim TI</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; color: #2c5282;">Opsional (auto-sync)</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style="background: #ebf8ff; padding: 14px; border-radius: 8px; border-left: 4px solid #4299e1; margin-top: 16px;">
          <strong style="color: #2c5282; display: block; margin-bottom: 8px;">
            <i class="fa-solid fa-users-gear"></i> Sinkronisasi Otomatis ke Grup:
          </strong>
          <ul style="margin: 0; padding-left: 20px; color: #2c5282; font-size: 12px; line-height: 1.7;">
            <li>Jika kolom <strong>grup</strong> diisi, kontak akan otomatis ditambahkan ke grup tersebut</li>
            <li>Nama grup harus <strong>sama persis</strong> dengan yang ada di database</li>
            <li>Grup harus sudah dibuat sebelum import</li>
            <li>Cek console browser untuk melihat hasil sinkronisasi</li>
          </ul>
        </div>
        
        <div style="background: #fffaf0; padding: 12px; border-radius: 6px; border-left: 4px solid #ed8936; margin-top: 12px;">
          <strong style="color: #c05621;">⚠️ Tips:</strong>
          <ul style="margin: 8px 0 0 20px; color: #744210; font-size: 12px;">
            <li>Pastikan kolom header sesuai (case-sensitive)</li>
            <li>Format nomor: 08xxxxxxxxxx atau +628xxxxxxxxxx</li>
            <li>Nomor minimal 10 digit, maksimal 15 digit</li>
            <li>Gunakan sheet pertama jika ada multiple sheets</li>
          </ul>
        </div>
      </div>
    `,
    confirmButtonColor: '#4299e1',
    width: '700px'
  });
}

/**
 * Show import help with group sync explanation
 */
export function showImportHelp() {
  Swal.fire({
    icon: 'question',
    title: 'Bantuan Import Kontak',
    html: `
      <div style="text-align: left; padding: 10px;">
        <h4 style="color: #2c5282; margin-bottom: 12px;">📋 Langkah-langkah Import:</h4>
        
        <ol style="color: #4a5568; font-size: 13px; line-height: 1.8;">
          <li>Buat grup yang diperlukan di menu <strong>Manajemen Grup</strong> (jika tidak ada)</li>
          <li>Download template CSV atau buat file Excel dengan format yang benar</li>
          <li>Isi data kontak sesuai kolom yang tersedia</li>
          <li>Untuk auto-sync ke grup, isi kolom <strong>grup</strong> dengan nama grup yang valid</li>
          <li>Simpan file (format: CSV, Excel, atau JSON)</li>
          <li>Klik tombol "Import" dan pilih file Anda</li>
          <li>Tunggu proses import selesai dan cek statistik</li>
        </ol>
        
        <div style="background: #ebf8ff; padding: 14px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #4299e1;">
          <strong style="color: #2c5282; display: block; margin-bottom: 8px;">
            <i class="fa-solid fa-users-gear"></i> Fitur Sinkronisasi Grup Otomatis:
          </strong>
          <ul style="margin: 0; padding-left: 20px; color: #2c5282; font-size: 12px; line-height: 1.7;">
            <li>Kontak akan otomatis ditambahkan ke grup yang disebutkan di kolom <strong>grup</strong></li>
            <li>Nama grup harus persis sama dengan yang ada di database (case-sensitive)</li>
            <li>Statistik import akan menunjukkan jumlah kontak yang berhasil disinkronkan</li>
            <li>Jika grup tidak ditemukan, kontak tetap diimport tapi tidak masuk grup</li>
          </ul>
        </div>
        
        <div style="background: #f7fafc; padding: 12px; border-radius: 6px; margin: 12px 0;">
          <strong style="color: #2d3748;">📱 Format Nomor yang Diterima:</strong>
          <ul style="margin: 8px 0 0 20px; color: #4a5568; font-size: 12px;">
            <li>08xxxxxxxxxx (contoh: 081234567890)</li>
            <li>+628xxxxxxxxxx (contoh: +6281234567890)</li>
            <li>628xxxxxxxxxx (contoh: 6281234567890)</li>
          </ul>
        </div>
        
        <div style="background: #f0fff4; padding: 12px; border-radius: 6px;">
          <strong style="color: #22543d;">✅ Aturan Validasi:</strong>
          <ul style="margin: 8px 0 0 20px; color: #276749; font-size: 12px;">
            <li>Nama minimal 2 karakter</li>
            <li>Nomor minimal 10 digit, maksimal 15 digit</li>
            <li>Nomor yang duplikat akan diabaikan</li>
            <li>Field kosong akan diisi NULL</li>
            <li>Grup yang tidak ditemukan akan diabaikan (kontak tetap masuk)</li>
          </ul>
        </div>
      </div>
    `,
    confirmButtonText: 'Mengerti',
    confirmButtonColor: '#4299e1',
    width: '700px'
  });
}
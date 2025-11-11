// routes/jabatan.js - CRUD API for Jabatan Master Data
const express = require("express");
const { toTitleCase, normalizeForComparison } = require('../utils/textHelpers');

function createJabatanRouter(db) {
  const router = express.Router();

  // Helper: Promisify db operations
  const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  };

  const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  };

  const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  };

  // ==========================================
  // GET ALL JABATAN
  // ==========================================
  router.get("/", async (req, res) => {
    try {
      const sql = "SELECT * FROM jabatan ORDER BY nama ASC";
      const rows = await dbAll(sql);
      res.json({ 
        success: true, 
        data: rows,
        count: rows.length 
      });
    } catch (err) {
      console.error("Error fetching jabatan:", err);
      res.status(500).json({ 
        success: false, 
        error: "Gagal mengambil data jabatan" 
      });
    }
  });

  // ==========================================
  // GET JABATAN BY ID
  // ==========================================
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const row = await dbGet("SELECT * FROM jabatan WHERE id = ?", [id]);
      
      if (!row) {
        return res.status(404).json({ 
          success: false, 
          error: "Jabatan tidak ditemukan" 
        });
      }
      
      res.json({ success: true, data: row });
    } catch (err) {
      console.error("Error fetching jabatan:", err);
      res.status(500).json({ 
        success: false, 
        error: "Gagal mengambil data jabatan" 
      });
    }
  });

  // ==========================================
  // CREATE NEW JABATAN
  // ==========================================
  router.post("/", async (req, res) => {
    try {
      const { nama, keterangan } = req.body;

      // Validasi nama
      if (!nama || nama.trim().length < 2) {
        return res.status(400).json({ 
          success: false, 
          error: "Nama jabatan minimal 2 karakter",
          field: "nama"
        });
      }

      // ✅ Normalisasi ke Title Case
      const normalizedNama = toTitleCase(nama.trim());

      // ✅ Cek duplikasi nama (case-insensitive)
      const existing = await dbGet(
        "SELECT id, nama FROM jabatan WHERE LOWER(nama) = LOWER(?)",
        [normalizedNama]
      );

      if (existing) {
        return res.status(409).json({ 
          success: false, 
          error: `Jabatan "${normalizedNama}" sudah ada`,
          field: "nama",
          duplicate: true
        });
      }

      // ✅ Insert data dengan nama yang sudah dinormalisasi
      const result = await dbRun(
        "INSERT INTO jabatan (nama, keterangan, aktif) VALUES (?, ?, 1)",
        [normalizedNama, keterangan || null]
      );

      res.status(201).json({ 
        success: true, 
        message: "Jabatan berhasil ditambahkan",
        data: {
          id: result.lastID,
          nama: normalizedNama,
          keterangan: keterangan || null,
          aktif: 1
        }
      });
    } catch (err) {
      console.error("Error creating jabatan:", err);
      res.status(500).json({ 
        success: false, 
        error: "Gagal menambahkan jabatan" 
      });
    }
  });

  // ==========================================
  // UPDATE JABATAN
  // ==========================================
router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { nama, keterangan, aktif } = req.body;

      // Validasi nama
      if (!nama || nama.trim().length < 2) {
        return res.status(400).json({ 
          success: false, 
          error: "Nama jabatan minimal 2 karakter",
          field: "nama"
        });
      }

      // ✅ Normalisasi ke Title Case
      const normalizedNama = toTitleCase(nama.trim());

      // Cek apakah jabatan ada
      const existing = await dbGet("SELECT * FROM jabatan WHERE id = ?", [id]);
      if (!existing) {
        return res.status(404).json({ 
          success: false, 
          error: "Jabatan tidak ditemukan" 
        });
      }

      // ✅ Cek duplikasi nama (case-insensitive, kecuali untuk jabatan yang sedang diedit)
      const duplicate = await dbGet(
        "SELECT id, nama FROM jabatan WHERE LOWER(nama) = LOWER(?) AND id != ?",
        [normalizedNama, id]
      );

      if (duplicate) {
        return res.status(409).json({ 
          success: false, 
          error: `Jabatan "${normalizedNama}" sudah ada`,
          field: "nama",
          duplicate: true
        });
      }

      // ✅ Update data dengan nama yang sudah dinormalisasi
      const result = await dbRun(
        `UPDATE jabatan 
         SET nama = ?, keterangan = ?, aktif = ?, updatedAt = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [normalizedNama, keterangan || null, aktif !== undefined ? aktif : 1, id]
      );

      if (result.changes === 0) {
        return res.status(404).json({ 
          success: false, 
          error: "Jabatan tidak ditemukan" 
        });
      }

      // ✅ Jika nama berubah, update juga di tabel contacts
      if (normalizeForComparison(existing.nama) !== normalizeForComparison(normalizedNama)) {
        await dbRun(
          "UPDATE contacts SET jabatan = ? WHERE LOWER(jabatan) = LOWER(?)",
          [normalizedNama, existing.nama]
        );
        console.log(`✅ Updated jabatan di contacts: "${existing.nama}" → "${normalizedNama}"`);
      }

      res.json({ 
        success: true, 
        message: "Jabatan berhasil diupdate",
        data: {
          id,
          nama: normalizedNama,
          keterangan: keterangan || null,
          aktif: aktif !== undefined ? aktif : 1
        }
      });
    } catch (err) {
      console.error("Error updating jabatan:", err);
      res.status(500).json({ 
        success: false, 
        error: "Gagal mengupdate jabatan" 
      });
    }
  });

  // ==========================================
  // DELETE JABATAN (Soft Delete)
  // ==========================================
  router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah jabatan ada
    const existing = await dbGet("SELECT * FROM jabatan WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ 
        success: false, 
        error: "Jabatan tidak ditemukan" 
      });
    }

    // Cek apakah ada kontak yang menggunakan jabatan ini
    const contactCount = await dbGet(
      "SELECT COUNT(*) as count FROM contacts WHERE jabatan = ?",
      [existing.nama]
    );

    if (contactCount.count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Tidak dapat menghapus jabatan "${existing.nama}" karena masih digunakan oleh ${contactCount.count} kontak`,
        contactCount: contactCount.count
      });
    }

    // Hard delete - hapus permanen
    const result = await dbRun("DELETE FROM jabatan WHERE id = ?", [id]);

    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Jabatan tidak ditemukan" 
      });
    }

    res.json({ 
      success: true, 
      message: "Jabatan berhasil dihapus permanen"
    });
  } catch (err) {
    console.error("Error deleting jabatan:", err);
    res.status(500).json({ 
      success: false, 
      error: "Gagal menghapus jabatan" 
    });
  }
});

  // ==========================================
  // RESTORE JABATAN (Reactivate)
  // ==========================================
  router.patch("/:id/restore", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await dbRun(
        "UPDATE jabatan SET aktif = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );

      if (result.changes === 0) {
        return res.status(404).json({ 
          success: false, 
          error: "Jabatan tidak ditemukan" 
        });
      }

      res.json({ 
        success: true, 
        message: "Jabatan berhasil diaktifkan kembali" 
      });
    } catch (err) {
      console.error("Error restoring jabatan:", err);
      res.status(500).json({ 
        success: false, 
        error: "Gagal mengaktifkan jabatan" 
      });
    }
  });

  return router;
}

module.exports = createJabatanRouter;
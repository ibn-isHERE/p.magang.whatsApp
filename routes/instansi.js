// routes/instansi.js - CRUD API for Instansi Master Data
const express = require("express");

function createInstansiRouter(db) {
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
  // GET ALL INSTANSI
  // ==========================================
  router.get("/", async (req, res) => {
    try {
      const sql = "SELECT * FROM instansi ORDER BY nama ASC";
      const rows = await dbAll(sql);
      res.json({ 
        success: true, 
        data: rows,
        count: rows.length 
      });
    } catch (err) {
      console.error("Error fetching instansi:", err);
      res.status(500).json({ 
        success: false, 
        error: "Gagal mengambil data instansi" 
      });
    }
  });

  // ==========================================
  // GET INSTANSI BY ID
  // ==========================================
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const row = await dbGet("SELECT * FROM instansi WHERE id = ?", [id]);
      
      if (!row) {
        return res.status(404).json({ 
          success: false, 
          error: "Instansi tidak ditemukan" 
        });
      }
      
      res.json({ success: true, data: row });
    } catch (err) {
      console.error("Error fetching instansi:", err);
      res.status(500).json({ 
        success: false, 
        error: "Gagal mengambil data instansi" 
      });
    }
  });

  // ==========================================
  // CREATE NEW INSTANSI
  // ==========================================
  router.post("/", async (req, res) => {
    try {
      const { nama, keterangan } = req.body;

      // Validasi nama
      if (!nama || nama.trim().length < 2) {
        return res.status(400).json({ 
          success: false, 
          error: "Nama instansi minimal 2 karakter",
          field: "nama"
        });
      }

      // Cek duplikasi nama
      const existing = await dbGet(
        "SELECT id FROM instansi WHERE LOWER(nama) = LOWER(?)",
        [nama.trim()]
      );

      if (existing) {
        return res.status(409).json({ 
          success: false, 
          error: `Instansi "${nama.trim()}" sudah ada`,
          field: "nama",
          duplicate: true
        });
      }

      // Insert data
      const result = await dbRun(
        "INSERT INTO instansi (nama, keterangan, aktif) VALUES (?, ?, 1)",
        [nama.trim(), keterangan || null]
      );

      res.status(201).json({ 
        success: true, 
        message: "Instansi berhasil ditambahkan",
        data: {
          id: result.lastID,
          nama: nama.trim(),
          keterangan: keterangan || null,
          aktif: 1
        }
      });
    } catch (err) {
      console.error("Error creating instansi:", err);
      res.status(500).json({ 
        success: false, 
        error: "Gagal menambahkan instansi" 
      });
    }
  });

  // ==========================================
  // UPDATE INSTANSI
  // ==========================================
  router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { nama, keterangan, aktif } = req.body;

      // Validasi nama
      if (!nama || nama.trim().length < 2) {
        return res.status(400).json({ 
          success: false, 
          error: "Nama instansi minimal 2 karakter",
          field: "nama"
        });
      }

      // Cek apakah instansi ada
      const existing = await dbGet("SELECT * FROM instansi WHERE id = ?", [id]);
      if (!existing) {
        return res.status(404).json({ 
          success: false, 
          error: "Instansi tidak ditemukan" 
        });
      }

      // Cek duplikasi nama (kecuali untuk instansi yang sedang diedit)
      const duplicate = await dbGet(
        "SELECT id FROM instansi WHERE LOWER(nama) = LOWER(?) AND id != ?",
        [nama.trim(), id]
      );

      if (duplicate) {
        return res.status(409).json({ 
          success: false, 
          error: `Instansi "${nama.trim()}" sudah ada`,
          field: "nama",
          duplicate: true
        });
      }

      // Update data
      const result = await dbRun(
        `UPDATE instansi 
         SET nama = ?, keterangan = ?, aktif = ?, updatedAt = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [nama.trim(), keterangan || null, aktif !== undefined ? aktif : 1, id]
      );

      if (result.changes === 0) {
        return res.status(404).json({ 
          success: false, 
          error: "Instansi tidak ditemukan" 
        });
      }

      res.json({ 
        success: true, 
        message: "Instansi berhasil diupdate",
        data: {
          id,
          nama: nama.trim(),
          keterangan: keterangan || null,
          aktif: aktif !== undefined ? aktif : 1
        }
      });
    } catch (err) {
      console.error("Error updating instansi:", err);
      res.status(500).json({ 
        success: false, 
        error: "Gagal mengupdate instansi" 
      });
    }
  });

  // ==========================================
  // DELETE INSTANSI (Soft Delete)
  // ==========================================
  router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah instansi ada
    const existing = await dbGet("SELECT * FROM instansi WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ 
        success: false, 
        error: "Instansi tidak ditemukan" 
      });
    }

    // Cek apakah ada kontak yang menggunakan instansi ini
    const contactCount = await dbGet(
      "SELECT COUNT(*) as count FROM contacts WHERE instansi = ?",
      [existing.nama]
    );

    if (contactCount.count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Tidak dapat menghapus instansi "${existing.nama}" karena masih digunakan oleh ${contactCount.count} kontak`,
        contactCount: contactCount.count
      });
    }

    // Hard delete - hapus permanen
    const result = await dbRun("DELETE FROM instansi WHERE id = ?", [id]);

    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Instansi tidak ditemukan" 
      });
    }

    res.json({ 
      success: true, 
      message: "Instansi berhasil dihapus permanen"
    });
  } catch (err) {
    console.error("Error deleting instansi:", err);
    res.status(500).json({ 
      success: false, 
      error: "Gagal menghapus instansi" 
    });
  }
});

  // ==========================================
  // RESTORE INSTANSI (Reactivate)
  // ==========================================
  router.patch("/:id/restore", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await dbRun(
        "UPDATE instansi SET aktif = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );

      if (result.changes === 0) {
        return res.status(404).json({ 
          success: false, 
          error: "Instansi tidak ditemukan" 
        });
      }

      res.json({ 
        success: true, 
        message: "Instansi berhasil diaktifkan kembali" 
      });
    } catch (err) {
      console.error("Error restoring instansi:", err);
      res.status(500).json({ 
        success: false, 
        error: "Gagal mengaktifkan instansi" 
      });
    }
  });

  return router;
}

module.exports = createInstansiRouter;
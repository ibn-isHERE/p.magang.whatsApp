// routes/contacts.js
const express = require("express");

// Kita akan membuat fungsi yang menerima 'db' sebagai argumen
// Ini adalah cara yang baik agar router ini bisa mengakses database dari index.js
function createContactsRouter(db) {
  const router = express.Router();

  // READ: Mendapatkan semua kontak (GET /api/contacts)
  // routes/contacts.js

  router.get("/", (req, res) => {
    const sql = "SELECT * FROM contacts ORDER BY name ASC";
    db.all(sql, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "success", data: rows });
    });
  });

  // POST: Menambahkan kontak baru
  router.post("/", (req, res) => {
    const { name, number, instansi, jabatan, grup } = req.body;
    if (!name || !number || !instansi || !jabatan) {
      return res
        .status(400)
        .json({ error: "Nama, nomor, instansi, dan jabatan wajib diisi." });
    }

    // MODIFIKASI KRITIS UNTUK MENDUKUNG JSON ARRAY
    let groupValue = null;
    if (grup && grup.trim()) {
      // Karena form kontak hanya mengirim satu grup (string), kita bungkus menjadi JSON array string
      groupValue = JSON.stringify([grup.trim()]);
    }

    const sql =
      "INSERT INTO contacts (name, number, instansi, jabatan, grup) VALUES (?, ?, ?, ?, ?)";
    db.run(sql, [name, number, instansi, jabatan, groupValue], function (err) {
      // Menggunakan groupValue
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res
            .status(409)
            .json({
              error: `Nomor ${number} sudah digunakan oleh kontak lain.`,
            });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: "Kontak berhasil dibuat",
        data: {
          id: this.lastID,
          name,
          number,
          instansi,
          jabatan,
          grup: groupValue,
        },
      });
    });
  });

  // PUT: Mengupdate kontak
  router.put("/:id", (req, res) => {
    const { name, number, instansi, jabatan, grup } = req.body;
    const { id } = req.params;

    // MODIFIKASI KRITIS UNTUK MENDUKUNG JSON ARRAY
    let groupValue = null;
    if (grup && grup.trim()) {
      // Bungkus string tunggal dari form kontak menjadi JSON array string
      groupValue = JSON.stringify([grup.trim()]);
    }

    const sql =
      "UPDATE contacts SET name = ?, number = ?, instansi = ?, jabatan = ?, grup = ? WHERE id = ?";
    db.run(
      sql,
      [name, number, instansi, jabatan, groupValue, id],
      function (err) {
        // Menggunakan groupValue
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            return res
              .status(409)
              .json({
                error: `Nomor ${number} sudah digunakan oleh kontak lain.`,
              });
          }
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res
            .status(404)
            .json({ message: `Kontak dengan ID ${id} tidak ditemukan.` });
        }
        res.json({
          message: `Kontak ${id} berhasil diperbarui`,
          changes: this.changes,
        });
      }
    );
  });

  // DELETE: Menghapus kontak berdasarkan ID (DELETE /api/contacts/:id)
  router.delete("/:id", (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM contacts WHERE id = ?";
    db.run(sql, id, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res
          .status(404)
          .json({ message: `Kontak dengan ID ${id} tidak ditemukan.` });
      }
      res.json({
        message: `Kontak ${id} berhasil dihapus`,
        changes: this.changes,
      });
    });
  });

  return router;
}

module.exports = createContactsRouter;

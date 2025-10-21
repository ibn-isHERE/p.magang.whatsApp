// routes/contacts.js - Updated with Phone Number Validation
const express = require("express");
const util = require("util");

// ========================================
// ✅ PHONE NUMBER VALIDATOR
// ========================================
function validatePhoneNumber(number) {
  const cleaned = String(number).trim().replace(/[^\d+]/g, '');
  
  if (!cleaned) {
    return {
      valid: false,
      message: 'Nomor telepon tidak boleh kosong'
    };
  }

  const digitOnly = cleaned.replace(/\+/g, '');
  if (digitOnly.length < 10) {
    return {
      valid: false,
      message: 'Nomor telepon minimal 10 digit'
    };
  }
  
  if (digitOnly.length > 15) {
    return {
      valid: false,
      message: 'Nomor telepon maksimal 15 digit'
    };
  }

  const patterns = [
    /^08\d{8,13}$/,           // 08xxxxxxxxxx
    /^\+628\d{8,13}$/,        // +628xxxxxxxxxx
    /^628\d{8,13}$/           // 628xxxxxxxxxx
  ];

  const isValidFormat = patterns.some(pattern => pattern.test(cleaned));
  
  if (!isValidFormat) {
    return {
      valid: false,
      message: 'Format nomor tidak valid. Gunakan format: 08xx, +628xx, atau 628xx'
    };
  }

  // Normalize to 08xx format
  let normalized = cleaned;
  if (normalized.startsWith('+62')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('628')) {
    normalized = '0' + normalized.slice(2);
  } else if (normalized.startsWith('62') && !normalized.startsWith('620')) {
    normalized = '0' + normalized.slice(2);
  }

  return {
    valid: true,
    message: 'Nomor telepon valid',
    normalized: normalized
  };
}

function createContactsRouter(db) {
  const router = express.Router();

  const dbAll = util.promisify(db.all).bind(db);

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

  /**
   * Helper: updateGroupMembers
   * Supports multiple groups - updates all groups that the contact belongs to
   */
  async function updateGroupMembers(groupName, contactNumber, action) {
    if (!groupName || !contactNumber) return;

    try {
      const rows = await dbAll(
        "SELECT id, members FROM groups WHERE name = ?",
        [groupName]
      );
      if (!rows || rows.length === 0) return;

      const row = rows[0];
      let membersArray = [];
      try {
        membersArray = row.members ? JSON.parse(row.members) : [];
      } catch (e) {
        membersArray = [];
      }
      if (!Array.isArray(membersArray)) membersArray = [];

      const set = new Set(membersArray.map(String));
      if (action === "add") {
        set.add(String(contactNumber));
      } else if (action === "remove") {
        set.delete(String(contactNumber));
      }

      const newMembers = Array.from(set);
      const membersJson =
        newMembers.length > 0 ? JSON.stringify(newMembers) : JSON.stringify([]);

      await dbRun("UPDATE groups SET members = ? WHERE id = ?", [
        membersJson,
        row.id,
      ]);
    } catch (err) {
      console.error("updateGroupMembers error:", err);
    }
  }

  // GET all contacts
  router.get("/", (req, res) => {
    const sql = "SELECT * FROM contacts ORDER BY name ASC";
    db.all(sql, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "success", data: rows });
    });
  });

  // POST create new contact
  router.post("/", async (req, res) => {
    const { name, number, instansi, jabatan, grup } = req.body;

    if (!name || !number) {
      return res.status(400).json({ 
        error: "Nama dan nomor wajib diisi." 
      });
    }

    // ✅ VALIDASI NAMA
    if (name.trim().length < 2) {
      return res.status(400).json({ 
        error: "Nama minimal 2 karakter",
        field: 'name'
      });
    }

    // ✅ VALIDASI NOMOR TELEPON
    const phoneValidation = validatePhoneNumber(number);
    
    if (!phoneValidation.valid) {
      return res.status(400).json({ 
        error: phoneValidation.message,
        field: 'number'
      });
    }

    // ✅ CEK DUPLIKASI NOMOR
    try {
      const existingContact = await dbGet(
        "SELECT id, name FROM contacts WHERE number = ?",
        [phoneValidation.normalized]
      );
      
      if (existingContact) {
        return res.status(409).json({ 
          error: `Nomor ${phoneValidation.normalized} sudah terdaftar atas nama "${existingContact.name}"`,
          field: 'number',
          duplicate: true,
          existingContact: {
            id: existingContact.id,
            name: existingContact.name
          }
        });
      }
    } catch (err) {
      console.error("Error checking duplicate:", err);
      return res.status(500).json({ error: "Gagal memeriksa duplikasi nomor" });
    }

    // ✅ Support multiple groups
    let groupValue = null;
    let groupNamesForSync = [];

    if (typeof grup === "string" && grup.trim()) {
      try {
        const parsed = JSON.parse(grup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          groupValue = grup;
          groupNamesForSync = parsed
            .map((g) => String(g).trim())
            .filter(Boolean);
        }
      } catch (e) {
        groupValue = JSON.stringify([grup.trim()]);
        groupNamesForSync = [grup.trim()];
      }
    } else if (Array.isArray(grup) && grup.length > 0) {
      const trimmed = grup
        .map((g) => (typeof g === "string" ? g.trim() : ""))
        .filter(Boolean);
      groupValue = trimmed.length > 0 ? JSON.stringify(trimmed) : null;
      groupNamesForSync = trimmed;
    }

    const sql = "INSERT INTO contacts (name, number, instansi, jabatan, grup) VALUES (?, ?, ?, ?, ?)";

    try {
      const result = await dbRun(sql, [
        name.trim(),
        phoneValidation.normalized,
        instansi || null,  // ← Bisa NULL
        jabatan || null,   // ← Bisa NULL
        groupValue,
      ]);
      

      // Respond with success
      res.json({ 
        message: "Kontak berhasil ditambahkan", 
        id: result.lastID,
        data: {
          id: result.lastID,
          name: name.trim(),
          number: phoneValidation.normalized,
          instansi,
          jabatan,
          grup: groupValue
        }
      });

      // Sync all groups (async, don't wait)
      if (groupNamesForSync.length > 0) {
        for (const groupName of groupNamesForSync) {
          await updateGroupMembers(groupName, phoneValidation.normalized, "add")
            .catch((e) => console.error(`sync add group ${groupName} failed:`, e));
        }
      }
    } catch (err) {
      console.error("Insert contact error:", err);
      return res.status(500).json({ error: "Gagal menambahkan kontak ke database" });
    }
  });

  // PUT update contact by id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, number, instansi, jabatan, grup } = req.body;

     if (!name || !number) {
      return res.status(400).json({ 
        error: "Nama dan nomor wajib diisi." 
      });
    }

    // ✅ VALIDASI NAMA
    if (name.trim().length < 2) {
      return res.status(400).json({ 
        error: "Nama minimal 2 karakter",
        field: 'name'
      });
    }

    // ✅ VALIDASI NOMOR TELEPON
    const phoneValidation = validatePhoneNumber(number);
    
    if (!phoneValidation.valid) {
      return res.status(400).json({ 
        error: phoneValidation.message,
        field: 'number'
      });
    }

    try {
      // ✅ CEK DUPLIKASI (kecuali untuk kontak yang sedang diedit)
      const existingContact = await dbGet(
        "SELECT id, name FROM contacts WHERE number = ? AND id != ?",
        [phoneValidation.normalized, id]
      );
      
      if (existingContact) {
        return res.status(409).json({ 
          error: `Nomor ${phoneValidation.normalized} sudah terdaftar atas nama "${existingContact.name}"`,
          field: 'number',
          duplicate: true,
          existingContact: {
            id: existingContact.id,
            name: existingContact.name
          }
        });
      }

      // Get old contact data for synchronization
      const oldRows = await dbAll(
        "SELECT number, grup FROM contacts WHERE id = ?",
        [id]
      );

      if (!oldRows || oldRows.length === 0) {
        return res.status(404).json({ 
          error: `Kontak dengan ID ${id} tidak ditemukan.` 
        });
      }

      const oldNumber = oldRows[0].number;
      let oldGrupArray = [];
      try {
        oldGrupArray = oldRows[0].grup ? JSON.parse(oldRows[0].grup) : [];
      } catch (e) {
        oldGrupArray = [];
      }

      // ✅ Parse new groups - support multiple groups
      let groupValue = null;
      let newGrupArray = [];

      if (typeof grup === "string" && grup.trim()) {
        try {
          const parsed = JSON.parse(grup);
          if (Array.isArray(parsed) && parsed.length > 0) {
            groupValue = grup;
            newGrupArray = parsed.map((g) => String(g).trim()).filter(Boolean);
          }
        } catch (e) {
          groupValue = JSON.stringify([grup.trim()]);
          newGrupArray = [grup.trim()];
        }
      } else if (Array.isArray(grup) && grup.length > 0) {
        const trimmed = grup
          .map((g) => (typeof g === "string" ? g.trim() : ""))
          .filter(Boolean);
        groupValue = trimmed.length > 0 ? JSON.stringify(trimmed) : null;
        newGrupArray = trimmed;
      }

      const sql = "UPDATE contacts SET name = ?, number = ?, instansi = ?, jabatan = ?, grup = ? WHERE id = ?";
    
    const result = await dbRun(sql, [
        name.trim(),
        phoneValidation.normalized,
        instansi || null,  // ← Bisa NULL
        jabatan || null,   // ← Bisa NULL
        groupValue,
        id,
    ]);

      if (result.changes === 0) {
        return res.status(404).json({ 
          error: `Kontak dengan ID ${id} tidak ditemukan.` 
        });
      }

      res.json({
        message: `Kontak berhasil diperbarui`,
        changes: result.changes,
        data: {
          id,
          name: name.trim(),
          number: phoneValidation.normalized,
          instansi,
          jabatan,
          grup: groupValue
        }
      });

      // SYNCHRONIZATION LOGIC for multiple groups (async)
      (async () => {
        try {
          const oldSet = new Set(oldGrupArray.map(String));
          const newSet = new Set(newGrupArray.map(String));

          // Remove from groups that are no longer assigned
          for (const oldGroup of oldGrupArray) {
            if (!newSet.has(String(oldGroup))) {
              await updateGroupMembers(oldGroup, oldNumber, "remove");
            }
          }

          // Add to new groups
          for (const newGroup of newGrupArray) {
            if (!oldSet.has(String(newGroup))) {
              await updateGroupMembers(newGroup, phoneValidation.normalized, "add");
            }
          }

          // If number changed, update all current groups
          if (oldNumber !== phoneValidation.normalized) {
            for (const groupName of newGrupArray) {
              await updateGroupMembers(groupName, oldNumber, "remove");
              await updateGroupMembers(groupName, phoneValidation.normalized, "add");
            }
          }
        } catch (e) {
          console.error("Error during post-update group sync:", e);
        }
      })();
    } catch (err) {
      console.error("Update contact error:", err);
      return res.status(500).json({ error: "Gagal mengupdate kontak" });
    }
  });

  // DELETE contact by id
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
      // Get contact data before deletion
      const rows = await dbAll(
        "SELECT number, grup FROM contacts WHERE id = ?",
        [id]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ 
          error: `Kontak dengan ID ${id} tidak ditemukan.` 
        });
      }

      const number = rows[0].number;
      let grups = [];
      try {
        grups = rows[0].grup ? JSON.parse(rows[0].grup) : [];
      } catch (e) {
        grups = [];
      }

      // Delete contact
      const result = await dbRun("DELETE FROM contacts WHERE id = ?", [id]);

      if (result.changes === 0) {
        return res.status(404).json({ 
          error: `Kontak dengan ID ${id} tidak ditemukan.` 
        });
      }

      res.json({
        message: `Kontak berhasil dihapus`,
        changes: result.changes
      });

      // Synchronization: remove number from all assigned groups (async)
      (async () => {
        try {
          for (const g of Array.isArray(grups) ? grups : []) {
            if (g && String(g).trim()) {
              await updateGroupMembers(String(g).trim(), number, "remove");
            }
          }
        } catch (e) {
          console.error("Error during post-delete group sync:", e);
        }
      })();
    } catch (err) {
      console.error("Delete contact error:", err);
      return res.status(500).json({ error: "Gagal menghapus kontak" });
    }
  });

  return router;
}

module.exports = createContactsRouter;
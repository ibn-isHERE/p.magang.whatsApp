// routes/contacts.js - Updated with Multi-Group Support
const express = require("express");
const util = require("util");

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

    if (!name || !number || !instansi || !jabatan) {
      return res
        .status(400)
        .json({ error: "Nama, nomor, instansi, dan jabatan wajib diisi." });
    }

    // ✅ Support multiple groups - already in JSON array format from frontend
    let groupValue = null;
    let groupNamesForSync = [];

    if (typeof grup === "string" && grup.trim()) {
      try {
        // Try to parse as JSON array first
        const parsed = JSON.parse(grup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          groupValue = grup;
          groupNamesForSync = parsed
            .map((g) => String(g).trim())
            .filter(Boolean);
        }
      } catch (e) {
        // If not JSON, treat as single group
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

    const sql =
      "INSERT INTO contacts (name, number, instansi, jabatan, grup) VALUES (?, ?, ?, ?, ?)";

    try {
      const result = await dbRun(sql, [
        name,
        number,
        instansi,
        jabatan,
        groupValue,
      ]);

      // Respond first
      res.json({ message: "Kontak berhasil ditambahkan", id: result.lastID });

      // Sync all groups (don't wait)
      if (groupNamesForSync.length > 0) {
        for (const groupName of groupNamesForSync) {
          await updateGroupMembers(groupName, number, "add").catch((e) =>
            console.error(`sync add group ${groupName} failed:`, e)
          );
        }
      }
    } catch (err) {
      console.error("Insert contact error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // PUT update contact by id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, number, instansi, jabatan, grup } = req.body;

    try {
      // Get old contact data for synchronization
      const oldRows = await dbAll(
        "SELECT number, grup FROM contacts WHERE id = ?",
        [id]
      );

      if (!oldRows || oldRows.length === 0) {
        return res
          .status(404)
          .json({ message: `Kontak dengan ID ${id} tidak ditemukan.` });
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

      // Update contact
      const sql =
        "UPDATE contacts SET name = ?, number = ?, instansi = ?, jabatan = ?, grup = ? WHERE id = ?";
      const result = await dbRun(sql, [
        name,
        number,
        instansi,
        jabatan,
        groupValue,
        id,
      ]);

      if (result.changes === 0) {
        return res
          .status(404)
          .json({ message: `Kontak dengan ID ${id} tidak ditemukan.` });
      }

      res.json({
        message: `Kontak ${id} berhasil diperbarui`,
        changes: result.changes,
      });

      // SYNCHRONIZATION LOGIC for multiple groups
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
              await updateGroupMembers(newGroup, number, "add");
            }
          }

          // If number changed, update all current groups
          if (oldNumber !== number) {
            // Remove old number from all current groups
            for (const groupName of newGrupArray) {
              await updateGroupMembers(groupName, oldNumber, "remove");
              await updateGroupMembers(groupName, number, "add");
            }
          }
        } catch (e) {
          console.error("Error during post-update group sync:", e);
        }
      })();
    } catch (err) {
      console.error("Update contact error:", err);
      return res.status(500).json({ error: err.message });
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
        return res
          .status(404)
          .json({ message: `Kontak dengan ID ${id} tidak ditemukan.` });
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
        return res
          .status(404)
          .json({ message: `Kontak dengan ID ${id} tidak ditemukan.` });
      }

      res.json({
        message: `Kontak ${id} berhasil dihapus`,
        changes: result.changes,
      });

      // Synchronization: remove number from all assigned groups
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
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createContactsRouter;

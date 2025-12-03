// routes/groups.js - Enhanced Multi-Group Support

const express = require("express");
const util = require("util");
const { toTitleCase, normalizeForComparison } = require('../utils/textHelpers');

function createGroupsRouter(db) {
  const router = express.Router();

  const dbAll = util.promisify(db.all).bind(db);

  const dbRun = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });

  /**
   * updateContactGroup - mendukung multiple groups per contact
   * - contactNumber: string
   * - groupName: string
   * - action: 'add' | 'remove'
   */
  async function updateContactGroup(contactNumber, groupName, action) {
    if (!contactNumber || !groupName) return;

    try {
      const rows = await dbAll("SELECT id, grup FROM contacts WHERE number = ?", [
        contactNumber,
      ]);
      if (!rows || rows.length === 0) return;

      const row = rows[0];
      let currentGroups = [];
      try {
        currentGroups = row.grup ? JSON.parse(row.grup) : [];
      } catch (e) {
        currentGroups = [];
      }
      if (!Array.isArray(currentGroups)) currentGroups = [];

      // Gunakan Set untuk operasi yang efisien
      const groupSet = new Set(currentGroups.map(String));

      if (action === "add") {
        groupSet.add(String(groupName));
      } else if (action === "remove") {
        groupSet.delete(String(groupName));
      }

      const newGroupsArray = Array.from(groupSet);
      const newGroupsJson = newGroupsArray.length > 0 ? JSON.stringify(newGroupsArray) : null;
      
      await dbRun("UPDATE contacts SET grup = ? WHERE id = ?", [
        newGroupsJson,
        row.id,
      ]);
    } catch (err) {
      console.error("Error updateContactGroup:", err);
    }
  }

  // GET all groups
  router.get("/", async (req, res) => {
    try {
      const sql = "SELECT * FROM groups ORDER BY name ASC";
      const rows = await dbAll(sql);
      res.json({ message: "success", data: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST create new group
  router.post("/", async (req, res) => {
    try {
      const { name, members, contactNumbers } = req.body;
      
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "Nama grup wajib diisi." });
      }
      
      // Normalisasi ke Title Case
      const groupName = toTitleCase(String(name).trim());

      // Cek duplikasi (case-insensitive) sebelum insert
      const existingGroups = await dbAll("SELECT name FROM groups");
      const isDuplicate = existingGroups.some(g => 
        normalizeForComparison(g.name) === normalizeForComparison(groupName)
      );

      if (isDuplicate) {
        return res.status(409).json({ 
          error: `Grup "${groupName}" sudah ada (tidak case-sensitive).` 
        });
      }

      // Support both 'members' and 'contactNumbers' for flexibility
      let newMembers = [];
      const memberSource = members || contactNumbers;
      
      if (Array.isArray(memberSource)) {
        newMembers = memberSource.map((m) => String(m).trim()).filter(Boolean);
      } else if (typeof memberSource === "string" && memberSource.trim()) {
        try {
          newMembers = JSON.parse(memberSource);
          if (!Array.isArray(newMembers)) newMembers = [];
        } catch (e) {
          newMembers = [memberSource.trim()];
        }
      }

      // Hapus duplikat
      newMembers = [...new Set(newMembers)];

      const membersJson = newMembers.length > 0 ? JSON.stringify(newMembers) : null;
      const result = await dbRun("INSERT INTO groups (name, members) VALUES (?, ?)", [
        groupName, // Menggunakan groupName yang sudah dinormalisasi
        membersJson,
      ]);

      // Sinkronisasi: tambahkan grup ke semua kontak member
      if (newMembers.length > 0) {
        for (const number of newMembers) {
          await updateContactGroup(number, groupName, "add");
        }
      }

      res.json({
        message: "Grup berhasil ditambahkan, dan kontak berhasil disinkronkan.",
        id: result.lastID,
      });
    } catch (err) {
      console.error("Error membuat grup:", err);
      // Error handling sudah tidak perlu lagi karena cek duplikasi manual
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update group by id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { name, members, contactNumbers } = req.body;
      
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "Nama grup wajib diisi." });
      }
      
      // Normalisasi ke Title Case
      const newName = toTitleCase(String(name).trim());

      // Get old record
      const oldRows = await dbAll("SELECT name, members FROM groups WHERE id = ?", [id]);
      if (!oldRows || oldRows.length === 0) {
        return res.status(404).json({ message: `Grup dengan ID ${id} tidak ditemukan.` });
      }
      
      const oldRow = oldRows[0];
      const oldName = oldRow.name;
      
      // Cek duplikasi (case-insensitive) hanya jika nama berubah
      if (normalizeForComparison(oldName) !== normalizeForComparison(newName)) {
        const existingGroups = await dbAll("SELECT id, name FROM groups WHERE id != ?", [id]);
        const isDuplicate = existingGroups.some(g => 
          normalizeForComparison(g.name) === normalizeForComparison(newName)
        );

        if (isDuplicate) {
          return res.status(409).json({ 
            error: `Grup "${newName}" sudah ada (tidak case-sensitive).` 
          });
        }
      }

      let oldMembers = [];
      try {
        oldMembers = oldRow.members ? JSON.parse(oldRow.members) : [];
      } catch (e) {
        oldMembers = [];
      }

      // Support both 'members' and 'contactNumbers'
      let newMembers = [];
      const memberSource = members || contactNumbers;
      
      if (Array.isArray(memberSource)) {
        newMembers = memberSource.map((m) => String(m).trim()).filter(Boolean);
      } else if (typeof memberSource === "string" && memberSource.trim()) {
        try {
          newMembers = JSON.parse(memberSource);
          if (!Array.isArray(newMembers)) newMembers = [];
        } catch (e) {
          newMembers = [memberSource.trim()];
        }
      }

      // Hapus duplikat
      newMembers = [...new Set(newMembers)];

      const membersJson = newMembers.length > 0 ? JSON.stringify(newMembers) : null;
      const result = await dbRun("UPDATE groups SET name = ?, members = ? WHERE id = ?", [
        newName, // Menggunakan newName yang sudah dinormalisasi
        membersJson,
        id,
      ]);

      // Sinkronisasi kontak
      const oldSet = new Set(oldMembers.map(String));
      const newSet = new Set(newMembers.map(String));

      // Member yang dihapus: hapus oldName dari kontak mereka
      for (const number of oldMembers) {
        if (!newSet.has(String(number))) {
          await updateContactGroup(String(number), oldName, "remove");
        }
      }

      // Member yang ditambahkan: tambahkan newName ke kontak mereka
      for (const number of newMembers) {
        if (!oldSet.has(String(number))) {
          await updateContactGroup(String(number), newName, "add");
        }
      }

      // Jika nama grup berubah (case-insensitive check), update semua kontak
      if (normalizeForComparison(oldName) !== normalizeForComparison(newName)) {
        const contactsWithOld = await dbAll(
          "SELECT id, grup, number FROM contacts WHERE grup IS NOT NULL"
        );
        
        for (const c of contactsWithOld) {
          let cGroups = [];
          try {
            cGroups = c.grup ? JSON.parse(c.grup) : [];
          } catch (e) {
            cGroups = [];
          }
          if (!Array.isArray(cGroups)) cGroups = [];

          // Cari grup dengan case-insensitive
          const hasOldGroup = cGroups.some(g => 
            normalizeForComparison(g) === normalizeForComparison(oldName)
          );

          if (hasOldGroup) {
            // Replace old group name dengan new name (case-insensitive)
            const replaced = cGroups.map((g) => 
              normalizeForComparison(g) === normalizeForComparison(oldName) ? newName : g
            );
            const uniqueGroups = [...new Set(replaced)];
            const jsonVal = uniqueGroups.length > 0 ? JSON.stringify(uniqueGroups) : null;
            await dbRun("UPDATE contacts SET grup = ? WHERE id = ?", [jsonVal, c.id]);
          }
        }
      }

      res.json({
        message: `Grup ${id} berhasil diperbarui, dan kontak berhasil disinkronkan.`,
        changes: result.changes,
      });
    } catch (err) {
      console.error("Error update grup:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE group by id
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const rows = await dbAll("SELECT name, members FROM groups WHERE id = ?", [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: `Grup dengan ID ${id} tidak ditemukan.` });
      }
      
      const row = rows[0];
      const groupName = row.name;
      let members = [];
      try {
        members = row.members ? JSON.parse(row.members) : [];
      } catch (e) {
        members = [];
      }

      const result = await dbRun("DELETE FROM groups WHERE id = ?", [id]);

      // Hapus grup dari semua kontak member
      for (const number of members) {
        await updateContactGroup(String(number), groupName, "remove");
      }

      // Safety: cek semua kontak untuk nama grup ini
      const contactsWithGroup = await dbAll("SELECT id, grup FROM contacts WHERE grup IS NOT NULL");
      for (const c of contactsWithGroup) {
        let cGroups = [];
        try {
          cGroups = c.grup ? JSON.parse(c.grup) : [];
        } catch (e) {
          cGroups = [];
        }
        if (!Array.isArray(cGroups)) cGroups = [];

        if (cGroups.includes(groupName)) {
          const newArr = cGroups.filter((g) => g !== groupName);
          const jsonVal = newArr.length > 0 ? JSON.stringify([...new Set(newArr)]) : null;
          await dbRun("UPDATE contacts SET grup = ? WHERE id = ?", [jsonVal, c.id]);
        }
      }

      res.json({
        message: "Grup berhasil dihapus, dan kontak berhasil disinkronkan.",
        changes: result.changes,
      });
    } catch (err) {
      console.error("Error hapus grup:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createGroupsRouter;
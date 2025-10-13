// routes/groups.js - Enhanced Multi-Group Support

const express = require("express");
const util = require("util");

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
   * updateContactGroup - supports multiple groups per contact
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

      // Use Set for efficient operations
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
      console.error("updateContactGroup error:", err);
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
      const groupName = String(name).trim();

      // ✅ Support both 'members' and 'contactNumbers' for flexibility
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

      // Remove duplicates
      newMembers = [...new Set(newMembers)];

      const membersJson = newMembers.length > 0 ? JSON.stringify(newMembers) : null;
      const result = await dbRun("INSERT INTO groups (name, members) VALUES (?, ?)", [
        groupName,
        membersJson,
      ]);

      // Synchronize: add group to all member contacts
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
      console.error("Create group error:", err);
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({ error: "Nama grup sudah ada." });
      }
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
      const newName = String(name).trim();

      // ✅ Support both 'members' and 'contactNumbers'
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

      // Remove duplicates
      newMembers = [...new Set(newMembers)];

      // Get old record
      const oldRows = await dbAll("SELECT name, members FROM groups WHERE id = ?", [id]);
      if (!oldRows || oldRows.length === 0) {
        return res.status(404).json({ message: `Grup dengan ID ${id} tidak ditemukan.` });
      }
      
      const oldRow = oldRows[0];
      const oldName = oldRow.name;
      let oldMembers = [];
      try {
        oldMembers = oldRow.members ? JSON.parse(oldRow.members) : [];
      } catch (e) {
        oldMembers = [];
      }

      const membersJson = newMembers.length > 0 ? JSON.stringify(newMembers) : null;
      const result = await dbRun("UPDATE groups SET name = ?, members = ? WHERE id = ?", [
        newName,
        membersJson,
        id,
      ]);

      // Synchronize contacts
      const oldSet = new Set(oldMembers.map(String));
      const newSet = new Set(newMembers.map(String));

      // Removed members: remove oldName from their contacts
      for (const number of oldMembers) {
        if (!newSet.has(String(number))) {
          await updateContactGroup(String(number), oldName, "remove");
        }
      }

      // Added members: add newName to their contacts
      for (const number of newMembers) {
        if (!oldSet.has(String(number))) {
          await updateContactGroup(String(number), newName, "add");
        }
      }

      // If group name changed, update all contacts
      if (oldName !== newName) {
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

          if (cGroups.includes(oldName)) {
            const replaced = cGroups.map((g) => (g === oldName ? newName : g));
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
      console.error("Update group error:", err);
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

      // Remove group from all member contacts
      for (const number of members) {
        await updateContactGroup(String(number), groupName, "remove");
      }

      // Safety: check all contacts for this group name
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
      console.error("Delete group error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createGroupsRouter;

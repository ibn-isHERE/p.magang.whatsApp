// routes/groups.js

const express = require('express');
const util = require('util');

function createGroupsRouter(db) {
    const router = express.Router();

    // Promisify db.all (ini sudah benar)
    const dbAll = util.promisify(db.all).bind(db);

    // Buat Promise wrapper manual untuk db.run agar bisa mendapatkan `this.lastID`
    const dbRun = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database run error:', err.message);
                    reject(err);
                } else {
                    // Resolve dengan konteks 'this' yang berisi lastID dan changes
                    resolve(this);
                }
            });
        });
    };

    /**
     * Helper function to manage a single contact's group membership.
     */
    async function updateContactGroup(contactNumber, groupName, action) {
        try {
            const row = await dbAll("SELECT grup FROM contacts WHERE number = ?", [contactNumber]);
            if (row.length === 0) return;

            let currentGroups = row[0].grup ? JSON.parse(row[0].grup) : [];
            if (!Array.isArray(currentGroups)) currentGroups = [];
            currentGroups = currentGroups.filter(g => g && g !== 'null');

            const index = currentGroups.indexOf(groupName);

            if (action === 'add' && index === -1) {
                currentGroups.push(groupName);
            } else if (action === 'remove' && index > -1) {
                currentGroups.splice(index, 1);
            }
            
            const newGroupsJson = currentGroups.length > 0 ? JSON.stringify([...new Set(currentGroups)]) : null;
            
            await dbRun("UPDATE contacts SET grup = ? WHERE number = ?", [newGroupsJson, contactNumber]);

        } catch (error) {
            console.error(`Error updating group membership for contact ${contactNumber}:`, error);
        }
    }

    // GET: Mendapatkan semua grup (diubah ke async/await)
    router.get('/', async (req, res) => {
        try {
            const sql = "SELECT * FROM groups ORDER BY name ASC";
            const rows = await dbAll(sql, []);
            res.json({ message: 'success', data: rows });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST: Menambahkan grup baru (sekarang berfungsi dengan benar)
    router.post('/', async (req, res) => {
        const { name, contactNumbers } = req.body;
        const groupName = name ? name.trim() : '';
        
        if (!groupName) {
            return res.status(400).json({ error: "Nama grup wajib diisi." });
        }
        
        const numbers = JSON.parse(contactNumbers || '[]');
        if (!Array.isArray(numbers)) {
            return res.status(400).json({ error: "Daftar kontak tidak valid." });
        }

        try {
            const result = await dbRun('INSERT INTO groups (name, members) VALUES (?, ?)', [groupName, JSON.stringify(numbers)]);

            for (const number of numbers) {
                await updateContactGroup(number, groupName, 'add');
            }
            
            res.status(201).json({
                message: 'Grup berhasil dibuat, dan kontak berhasil diperbarui.',
                data: { id: result.lastID, name: groupName, members: numbers } // result.lastID sekarang ada nilainya
            });
        } catch (err) {
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: `Grup "${groupName}" sudah ada.` });
            }
            res.status(500).json({ error: err.message });
        }
    });

    // PUT: Mengupdate grup (sekarang berfungsi dengan benar)
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name: newName, contactNumbers } = req.body;
        const newNameTrimmed = newName ? newName.trim() : '';
        
        if (!newNameTrimmed) {
            return res.status(400).json({ error: "Nama grup wajib diisi." });
        }
        
        const newNumbers = JSON.parse(contactNumbers || '[]');

        try {
            const oldGroupRows = await dbAll("SELECT name, members FROM groups WHERE id = ?", [id]);
            if (oldGroupRows.length === 0) {
                return res.status(404).json({ message: `Grup dengan ID ${id} tidak ditemukan.` });
            }
            const oldGroup = oldGroupRows[0];
            const oldName = oldGroup.name;
            const oldNumbers = JSON.parse(oldGroup.members || '[]');

            if (oldName !== newNameTrimmed) {
                const existingGroup = await dbAll("SELECT id FROM groups WHERE name = ? AND id != ?", [newNameTrimmed, id]);
                if (existingGroup.length > 0) {
                    return res.status(409).json({ error: `Grup "${newNameTrimmed}" sudah ada.` });
                }
            }
            
            await dbRun('UPDATE groups SET name = ?, members = ? WHERE id = ?', [newNameTrimmed, JSON.stringify(newNumbers), id]);

            const removedNumbers = oldNumbers.filter(n => !newNumbers.includes(n));
            for (const number of removedNumbers) {
                await updateContactGroup(number, oldName, 'remove');
            }

            for (const number of newNumbers) {
                if (oldName !== newNameTrimmed) {
                    await updateContactGroup(number, oldName, 'remove');
                }
                await updateContactGroup(number, newNameTrimmed, 'add');
            }
            
            res.json({ message: `Grup ${id} berhasil diperbarui, dan kontak berhasil disinkronkan.` });

        } catch (err) {
            console.error('Error updating group:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE: Menghapus grup berdasarkan ID (sekarang berfungsi dengan benar)
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const oldGroupRows = await dbAll("SELECT name, members FROM groups WHERE id = ?", [id]);
            if (oldGroupRows.length === 0) {
                return res.status(404).json({ message: `Grup dengan ID ${id} tidak ditemukan.` });
            }
            const oldGroupName = oldGroupRows[0].name;
            const oldMembers = JSON.parse(oldGroupRows[0].members || '[]');

            for (const number of oldMembers) {
                await updateContactGroup(number, oldGroupName, 'remove');
            }
            
            const result = await dbRun('DELETE FROM groups WHERE id = ?', [id]);
            
            if (result.changes === 0) { // result.changes sekarang ada nilainya
                return res.status(404).json({ message: `Grup dengan ID ${id} tidak ditemukan.` });
            }

            res.json({ 
                message: `Grup berhasil dihapus, dan kontak berhasil disinkronkan.`, 
                changes: result.changes 
            });

        } catch (err) {
            console.error('Error deleting group:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

module.exports = createGroupsRouter;
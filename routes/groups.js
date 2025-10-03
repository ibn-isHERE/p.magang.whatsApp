// routes/groups.js

const express = require('express');
const util = require('util');

function createGroupsRouter(db) {
    const router = express.Router();

    // Promisify db methods for async/await usage
    const dbAll = util.promisify(db.all).bind(db);
    const dbRun = util.promisify(db.run).bind(db);

    /**
     * Helper function to manage a single contact's group membership.
     * Updates the 'grup' column (stored as JSON array string) in the contacts table.
     * @param {string} contactNumber - Nomor unik kontak.
     * @param {string} groupName - Nama grup yang akan ditambah atau dihapus.
     * @param {'add' | 'remove'} action - Aksi yang dilakukan.
     */
    async function updateContactGroup(contactNumber, groupName, action) {
        try {
            // 1. Ambil grup kontak saat ini
            const rows = await dbAll("SELECT grup FROM contacts WHERE number = ?", [contactNumber]);
            if (rows.length === 0) return;

            let currentGroups = rows[0].grup ? JSON.parse(rows[0].grup) : [];
            if (!Array.isArray(currentGroups)) currentGroups = [];
            currentGroups = currentGroups.filter(g => g && g !== 'null'); 

            const index = currentGroups.indexOf(groupName);

            if (action === 'add' && index === -1) {
                currentGroups.push(groupName);
            } else if (action === 'remove' && index > -1) {
                currentGroups.splice(index, 1);
            }
            
            // Bersihkan duplikat dan entri kosong
            currentGroups = [...new Set(currentGroups.filter(g => g))];

            // Jika array kosong, set ke NULL. Jika tidak, simpan sebagai JSON string.
            const newGroupsJson = currentGroups.length > 0 ? JSON.stringify(currentGroups) : null;
            
            await dbRun("UPDATE contacts SET grup = ? WHERE number = ?", [newGroupsJson, contactNumber]);

        } catch (error) {
            console.error(`Error updating group membership for contact ${contactNumber}:`, error);
        }
    }

    // GET: Mendapatkan semua grup
    router.get('/', (req, res) => {
        const sql = "SELECT * FROM groups ORDER BY name ASC";
        db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'success', data: rows });
        });
    });

    // POST: Menambahkan grup baru
    router.post('/', async (req, res) => {
        // contactNumbers adalah JSON string dari array of numbers yang dikirim frontend
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
            // 1. Masukkan data grup
            const result = await dbRun('INSERT INTO groups (name, members) VALUES (?, ?)', [groupName, JSON.stringify(numbers)]);

            // 2. Perbarui Kontak
            for (const number of numbers) {
                await updateContactGroup(number, groupName, 'add');
            }
            
            res.status(201).json({
                message: 'Grup berhasil dibuat, dan kontak berhasil diperbarui.',
                data: { id: result.lastID, name: groupName, members: numbers }
            });
        } catch (err) {
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: `Grup "${groupName}" sudah ada.` });
            }
            res.status(500).json({ error: err.message });
        }
    });

    // PUT: Mengupdate grup
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name: newName, contactNumbers } = req.body;
        const newNameTrimmed = newName ? newName.trim() : '';
        
        if (!newNameTrimmed) {
            return res.status(400).json({ error: "Nama grup wajib diisi." });
        }
        
        const newNumbers = JSON.parse(contactNumbers || '[]');

        try {
            // 1. Ambil Data Grup Lama
            const oldGroupRows = await dbAll("SELECT name, members FROM groups WHERE id = ?", [id]);
            if (oldGroupRows.length === 0) {
                return res.status(404).json({ message: `Grup dengan ID ${id} tidak ditemukan.` });
            }
            const oldGroup = oldGroupRows[0];
            const oldName = oldGroup.name;
            const oldNumbers = JSON.parse(oldGroup.members || '[]');

            // Cek konflik nama baru
             if (oldName !== newNameTrimmed) {
                const existingGroup = await dbAll("SELECT id FROM groups WHERE name = ? AND id != ?", [newNameTrimmed, id]);
                if (existingGroup.length > 0) {
                     return res.status(409).json({ error: `Grup "${newNameTrimmed}" sudah ada.` });
                }
            }
            
            // 2. Perbarui Grup
            await dbRun('UPDATE groups SET name = ?, members = ? WHERE id = ?', [newNameTrimmed, JSON.stringify(newNumbers), id]);

            // 3. Sinkronisasi Kontak
            
            // a) Kontak yang DIHAPUS dari grup: hapus nama grup lama
            const removedNumbers = oldNumbers.filter(n => !newNumbers.includes(n));
            for (const number of removedNumbers) {
                await updateContactGroup(number, oldName, 'remove');
            }

            // b) Kontak yang DITAMBAH atau anggota lama (butuh update nama grup jika nama grup berubah)
            for (const number of newNumbers) {
                // Hapus nama lama (penting jika nama grup berubah)
                if (oldName !== newNameTrimmed || oldNumbers.includes(number)) {
                    await updateContactGroup(number, oldName, 'remove');
                }
                
                // Tambahkan nama baru
                await updateContactGroup(number, newNameTrimmed, 'add');
            }
            
            // c) Handle sisa kontak yang mungkin memiliki nama grup lama (khusus jika nama grup berubah)
            if (oldName !== newNameTrimmed) {
                const allContacts = await dbAll("SELECT number, grup FROM contacts");
                for (const contact of allContacts) {
                    let groups = contact.grup ? JSON.parse(contact.grup) : [];
                    if (groups.includes(oldName) && !newNumbers.includes(contact.number)) {
                         // Kontak ini punya nama grup lama tapi tidak termasuk anggota grup baru, hapus saja nama lama
                         await updateContactGroup(contact.number, oldName, 'remove');
                         await updateContactGroup(contact.number, newNameTrimmed, 'add'); // Tambahkan nama baru
                    }
                }
            }

            res.json({ message: `Grup ${id} berhasil diperbarui, dan kontak berhasil disinkronkan.` });

        } catch (err) {
            console.error('Error updating group:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE: Menghapus grup berdasarkan ID
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            // 1. Ambil Nama Grup dan Anggota
            const oldGroupRows = await dbAll("SELECT name, members FROM groups WHERE id = ?", [id]);
            if (oldGroupRows.length === 0) {
                return res.status(404).json({ message: `Grup dengan ID ${id} tidak ditemukan.` });
            }
            const oldGroupName = oldGroupRows[0].name;
            const oldMembers = JSON.parse(oldGroupRows[0].members || '[]');

            // 2. Perbarui Kontak (Hapus nama grup dari semua anggota)
            for (const number of oldMembers) {
                await updateContactGroup(number, oldGroupName, 'remove');
            }
            
            // 3. Hapus Grup
            const result = await dbRun('DELETE FROM groups WHERE id = ?', [id]);
            
            if (result.changes === 0) {
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

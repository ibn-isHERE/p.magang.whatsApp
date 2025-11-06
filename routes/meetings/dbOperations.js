let db = null;

function setDatabase(database) {
    db = database;
    console.log("✅ Meetings database operations initialized");
}

function getDatabase() {
    return db;
}

function updateMeetingStatus(meetingId, status, message = null) {
    if (!db) {
        console.error("Database not available");
        return;
    }

    db.run(
        `UPDATE meetings SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, meetingId],
        (err) => {
            if (err) {
                console.error(`Gagal update status meeting ${meetingId}:`, err.message);
            } else {
                console.log(`Status meeting ${meetingId} diupdate ke '${status}'`);
                
                if (global.emitMeetingStatusUpdate) {
                    global.emitMeetingStatusUpdate(
                        meetingId, 
                        status, 
                        message || `Meeting status updated to ${status}`
                    );
                }
            }
        }
    );
}

function updateExpiredMeetings() {
    return new Promise((resolve) => {
        if (!db) return resolve();
        
        const now = new Date().getTime();
        db.all(
            `SELECT id, end_epoch, date, endTime, filesData, meetingTitle FROM meetings WHERE status IN ('terjadwal', 'terkirim')`, 
            [], 
            (err, rows) => {
                if (err || rows.length === 0) return resolve();
                
                let completed = 0;
                let updatedCount = 0;
                
                rows.forEach((meeting) => {
                    const endEpoch = meeting.end_epoch;
                    
                    if (now > endEpoch) {
                        db.run(
                            `UPDATE meetings SET status = 'selesai' WHERE id = ?`, 
                            [meeting.id], 
                            (updateErr) => {
                                if (!updateErr) {
                                    updatedCount++;
                                    console.log(`✅ Auto-finished meeting: ${meeting.id} - ${meeting.meetingTitle}`);
                                    
                                    if (global.emitMeetingStatusUpdate) {
                                        global.emitMeetingStatusUpdate(
                                            meeting.id, 
                                            'selesai', 
                                            `Rapat "${meeting.meetingTitle}" telah selesai secara otomatis`
                                        );
                                    }
                                }
                                
                                if (++completed === rows.length) {
                                    if (updatedCount > 0) {
                                        console.log(`📊 Auto-updated ${updatedCount} expired meetings to 'selesai'`);
                                    }
                                    resolve();
                                }
                            }
                        );
                    } else {
                        if (++completed === rows.length) {
                            resolve();
                        }
                    }
                });
            }
        );
    });
}

function getMeetingById(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        db.get("SELECT * FROM meetings WHERE id = ?", [id], (err, row) => {
            if (err) {
                console.error("Error getting meeting:", err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * Insert new meeting
 * ✅ FIXED: Include selectedGroups AND groupInfo
 */
function insertMeeting(meetingData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        const { 
            id, 
            meetingTitle, 
            numbers, 
            meetingRoom, 
            date, 
            startTime, 
            endTime, 
            start_epoch, 
            end_epoch, 
            filesData, 
            selectedGroups,  // ✅ Nama grup yang dipilih
            groupInfo        // ✅ Detail grup dengan members
        } = meetingData;

        console.log("📝 Inserting meeting:", {
            id,
            meetingTitle,
            numbersCount: numbers ? JSON.parse(numbers).length : 0,
            hasSelectedGroups: !!selectedGroups,
            hasGroupInfo: !!groupInfo,
            hasFiles: !!filesData
        });

        // ✅ Query dengan selectedGroups DAN groupInfo
        const query = `
            INSERT INTO meetings (
                id, meetingTitle, numbers, meetingRoom, date, startTime, endTime, 
                start_epoch, end_epoch, status, filesData, selectedGroups, groupInfo,
                createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        const params = [
            id, 
            meetingTitle, 
            numbers, 
            meetingRoom, 
            date, 
            startTime, 
            endTime, 
            start_epoch, 
            end_epoch, 
            "terjadwal", 
            filesData || null,
            selectedGroups || null,  // ✅ Bisa null atau JSON string
            groupInfo || null         // ✅ Bisa null atau JSON string
        ];

        db.run(query, params, function (err) {
            if (err) {
                console.error("❌ Error inserting meeting:", err.message);
                console.error("   Query:", query);
                console.error("   Params:", params.map((p, i) => `${i}: ${typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p}`));
                reject(err);
            } else {
                console.log(`✅ Meeting ${id} inserted successfully`);
                console.log(`   Rows affected: ${this.changes}`);
                resolve(this);
            }
        });
    });
}

/**
 * Update meeting
 * ✅ FIXED: Include selectedGroups AND groupInfo
 */
function updateMeeting(id, meetingData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        const { 
            meetingTitle, 
            numbers, 
            meetingRoom, 
            date, 
            startTime, 
            endTime, 
            start_epoch, 
            end_epoch, 
            filesData, 
            selectedGroups,  // ✅ Preserve selectedGroups
            groupInfo        // ✅ Preserve groupInfo
        } = meetingData;

        console.log("📝 Updating meeting:", {
            id,
            meetingTitle,
            hasSelectedGroups: !!selectedGroups,
            hasGroupInfo: !!groupInfo,
            hasFiles: !!filesData
        });

        // ✅ Query dengan selectedGroups DAN groupInfo
        const query = `
            UPDATE meetings SET 
                meetingTitle = ?, 
                numbers = ?, 
                meetingRoom = ?, 
                date = ?, 
                startTime = ?, 
                endTime = ?, 
                start_epoch = ?, 
                end_epoch = ?, 
                filesData = ?, 
                selectedGroups = ?,
                groupInfo = ?,
                updatedAt = CURRENT_TIMESTAMP, 
                status = 'terjadwal' 
            WHERE id = ?
        `;
        
        const params = [
            meetingTitle, 
            numbers, 
            meetingRoom, 
            date, 
            startTime, 
            endTime, 
            start_epoch, 
            end_epoch, 
            filesData || null,
            selectedGroups || null,  // ✅ Bisa null atau JSON string
            groupInfo || null,        // ✅ Bisa null atau JSON string
            id
        ];

        db.run(query, params, function(err) {
            if (err) {
                console.error("❌ Error updating meeting:", err.message);
                reject(err);
            } else {
                console.log(`✅ Meeting ${id} updated successfully`);
                console.log(`   Rows affected: ${this.changes}`);
                resolve(this);
            }
        });
    });
}

function deleteMeeting(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        db.run("DELETE FROM meetings WHERE id = ?", [id], function (err) {
            if (err) {
                console.error("Error deleting meeting:", err.message);
                reject(err);
            } else {
                console.log(`✅ Meeting ${id} deleted successfully`);
                resolve(this);
            }
        });
    });
}

function getAllMeetings(whereClause = '', params = []) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        const query = `SELECT * FROM meetings ${whereClause} ORDER BY start_epoch DESC`;
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error("Error getting all meetings:", err.message);
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
}

module.exports = {
    setDatabase,
    getDatabase,
    updateMeetingStatus,
    updateExpiredMeetings,
    getMeetingById,
    insertMeeting,
    updateMeeting,
    deleteMeeting,
    getAllMeetings,
};
// dbOperations.js - Database Operations for Meetings
// ✅ FIXED: Emit socket events untuk auto update status

let db = null;

/**
 * Set database instance dari luar
 */
function setDatabase(database) {
    db = database;
    console.log("✅ Meetings database operations initialized");
}

/**
 * Get database instance
 */
function getDatabase() {
    return db;
}

/**
 * Update meeting status
 * ✅ IMPROVED: Emit socket event setelah update
 */
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
                
                // ✅ EMIT SOCKET EVENT
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

/**
 * Update expired meetings
 * ✅ FIXED: Emit socket event untuk setiap meeting yang berubah status
 */
function updateExpiredMeetings() {
    return new Promise((resolve) => {
        if (!db) return resolve();
        
        const { dateTimeToEpoch } = require('./helpers');
        const { deleteFilesFromData } = require('./fileHandler');
        
        const now = new Date().getTime();
        db.all(
            `SELECT id, end_epoch, date, endTime, filesData, meetingTitle FROM meetings WHERE status IN ('terjadwal', 'terkirim')`, 
            [], 
            (err, rows) => {
                if (err || rows.length === 0) return resolve();
                
                let completed = 0;
                let updatedCount = 0;
                
                rows.forEach((meeting) => {
                    const endEpoch = meeting.end_epoch || dateTimeToEpoch(meeting.date, meeting.endTime);
                    
                    if (now > endEpoch) {
                        // ✅ Meeting sudah expired, update status
                        db.run(
                            `UPDATE meetings SET status = 'selesai' WHERE id = ?`, 
                            [meeting.id], 
                            (updateErr) => {
                                if (!updateErr) {
                                    updatedCount++;
                                    console.log(`✅ Auto-finished meeting: ${meeting.id} - ${meeting.meetingTitle}`);
                                    
                                    // ✅ EMIT SOCKET EVENT - INI YANG PENTING!
                                    if (global.emitMeetingStatusUpdate) {
                                        global.emitMeetingStatusUpdate(
                                            meeting.id, 
                                            'selesai', 
                                            `Rapat "${meeting.meetingTitle}" telah selesai secara otomatis`
                                        );
                                    }
                                    
                                    // Delete files when meeting is finished
                                    if (meeting.filesData) {
                                        deleteFilesFromData(meeting.filesData);
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
                        // Meeting belum expired
                        if (++completed === rows.length) {
                            resolve();
                        }
                    }
                });
            }
        );
    });
}

/**
 * Get meeting by ID
 */
function getMeetingById(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        db.get("SELECT * FROM meetings WHERE id = ?", [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * Insert new meeting
 */
function insertMeeting(meetingData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        const { id, meetingTitle, numbers, meetingRoom, date, startTime, endTime, start_epoch, end_epoch, filesData } = meetingData;

        db.run(
            `INSERT INTO meetings (id, meetingTitle, numbers, meetingRoom, date, startTime, endTime, start_epoch, end_epoch, status, filesData, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [id, meetingTitle, numbers, meetingRoom, date, startTime, endTime, start_epoch, end_epoch, "terjadwal", filesData],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            }
        );
    });
}

/**
 * Update meeting
 */
function updateMeeting(id, meetingData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        const { meetingTitle, numbers, meetingRoom, date, startTime, endTime, start_epoch, end_epoch, filesData } = meetingData;

        const query = `
            UPDATE meetings SET 
                meetingTitle = ?, numbers = ?, meetingRoom = ?, date = ?, startTime = ?, endTime = ?, 
                start_epoch = ?, end_epoch = ?, filesData = ?, updatedAt = CURRENT_TIMESTAMP, status = 'terjadwal' 
            WHERE id = ?`;
        
        const params = [meetingTitle, numbers, meetingRoom, date, startTime, endTime, start_epoch, end_epoch, filesData, id];

        db.run(query, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

/**
 * Delete meeting
 */
function deleteMeeting(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        db.run("DELETE FROM meetings WHERE id = ?", [id], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

/**
 * Get all meetings
 */
function getAllMeetings(whereClause = '', params = []) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        const query = `SELECT * FROM meetings ${whereClause} ORDER BY start_epoch DESC`;
        
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
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
// fileHandler.js - File Handling Module for Meetings

const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Upload directory
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage: storage });

/**
 * Delete file if exists
 */
function deleteFileIfExists(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) console.error(`Gagal menghapus file: ${filePath}`, err);
            else console.log(`File usang dihapus: ${filePath}`);
        });
    }
}

/**
 * Process uploaded files
 */
function processUploadedFiles(files) {
    if (!files || files.length === 0) {
        return { filesData: null, filesArray: [] };
    }

    const filesArray = files.map(file => ({
        path: file.path,
        name: file.originalname,
        mimetype: file.mimetype
    }));

    return {
        filesData: JSON.stringify(filesArray),
        filesArray: filesArray
    };
}

/**
 * Cleanup uploaded files
 */
function cleanupUploadedFiles(files) {
    if (files && Array.isArray(files)) {
        files.forEach(file => {
            if (file.path) {
                deleteFileIfExists(file.path);
            }
        });
    }
}

/**
 * Delete files from filesData JSON
 */
function deleteFilesFromData(filesData) {
    if (!filesData) return;
    
    try {
        const files = JSON.parse(filesData);
        if (Array.isArray(files)) {
            files.forEach(file => deleteFileIfExists(file.path));
        }
    } catch (e) {
        console.error("Error deleting files from data:", e);
    }
}

/**
 * Merge old and new files for edit operation
 */
function mergeFilesForEdit(oldFilesData, newFiles, keepExistingNames, deletedNames) {
    const oldFiles = oldFilesData ? JSON.parse(oldFilesData) : [];
    let finalFilesArray = [];

    // 1. Keep existing files that are not deleted
    if (keepExistingNames.length > 0) {
        const keptFiles = oldFiles.filter(f => {
            const name = f.name || f.filename || f;
            return keepExistingNames.includes(name);
        });
        finalFilesArray.push(...keptFiles);
        console.log(`Kept ${keptFiles.length} existing files:`, keptFiles.map(f => f.name));
    } else if (deletedNames.length === 0 && (!newFiles || newFiles.length === 0)) {
        // No changes, keep all old files
        finalFilesArray.push(...oldFiles);
    }

    // 2. Add new uploaded files
    if (newFiles && newFiles.length > 0) {
        const newFilesData = newFiles.map(f => ({
            path: f.path,
            name: f.originalname,
            mimetype: f.mimetype
        }));
        finalFilesArray.push(...newFilesData);
        console.log(`Added ${newFiles.length} new files:`, newFilesData.map(f => f.name));
    }

    // 3. Delete files marked for deletion
    if (deletedNames.length > 0) {
        const toDelete = oldFiles.filter(f => {
            const name = f.name || f.filename || f;
            return deletedNames.includes(name);
        });
        toDelete.forEach((file) => {
            deleteFileIfExists(file.path);
            console.log(`Deleted file: ${file.name || file.filename}`);
        });
    }

    // 4. Delete old files that are not kept
    if (keepExistingNames.length > 0) {
        const filesToDelete = oldFiles.filter(f => {
            const name = f.name || f.filename || f;
            return !keepExistingNames.includes(name) && !deletedNames.includes(name);
        });
        filesToDelete.forEach((file) => {
            deleteFileIfExists(file.path);
            console.log(`Deleted old file not kept: ${file.name || file.filename}`);
        });
    }

    return {
        finalFilesArray,
        finalFilesData: finalFilesArray.length > 0 ? JSON.stringify(finalFilesArray) : null
    };
}

module.exports = {
    upload,
    uploadDir,
    deleteFileIfExists,
    processUploadedFiles,
    cleanupUploadedFiles,
    deleteFilesFromData,
    mergeFilesForEdit,
};
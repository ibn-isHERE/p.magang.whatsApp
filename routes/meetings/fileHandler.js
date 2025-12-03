// fileHandler.js - Modul Pengelolaan File untuk Meetings

const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Direktori upload
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

/**
 * Konfigurasi penyimpanan Multer
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage: storage });

/**
 * Menghapus file jika ada
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
 * Memproses file yang diupload
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
 * Membersihkan file yang diupload
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
 * Menghapus file dari data JSON filesData
 */
function deleteFilesFromData(filesData) {
    if (!filesData) return;
    
    try {
        const files = JSON.parse(filesData);
        if (Array.isArray(files)) {
            files.forEach(file => deleteFileIfExists(file.path));
        }
    } catch (e) {
        console.error("Error saat menghapus file dari data:", e);
    }
}

/**
 * Menggabungkan file lama dan baru untuk operasi edit
 */
function mergeFilesForEdit(oldFilesData, newFiles, keepExistingNames, deletedNames) {
    const oldFiles = oldFilesData ? JSON.parse(oldFilesData) : [];
    let finalFilesArray = [];

    // 1. Pertahankan file yang ada dan tidak dihapus
    if (keepExistingNames.length > 0) {
        const keptFiles = oldFiles.filter(f => {
            const name = f.name || f.filename || f;
            return keepExistingNames.includes(name);
        });
        finalFilesArray.push(...keptFiles);
        console.log(`Mempertahankan ${keptFiles.length} file yang ada:`, keptFiles.map(f => f.name));
    } else if (deletedNames.length === 0 && (!newFiles || newFiles.length === 0)) {
        // Tidak ada perubahan, pertahankan semua file lama
        finalFilesArray.push(...oldFiles);
    }

    // 2. Tambahkan file baru yang diupload
    if (newFiles && newFiles.length > 0) {
        const newFilesData = newFiles.map(f => ({
            path: f.path,
            name: f.originalname,
            mimetype: f.mimetype
        }));
        finalFilesArray.push(...newFilesData);
        console.log(`Menambahkan ${newFiles.length} file baru:`, newFilesData.map(f => f.name));
    }

    // 3. Hapus file yang ditandai untuk dihapus
    if (deletedNames.length > 0) {
        const toDelete = oldFiles.filter(f => {
            const name = f.name || f.filename || f;
            return deletedNames.includes(name);
        });
        toDelete.forEach((file) => {
            deleteFileIfExists(file.path);
            console.log(`File dihapus: ${file.name || file.filename}`);
        });
    }

    // 4. Hapus file lama yang tidak dipertahankan
    if (keepExistingNames.length > 0) {
        const filesToDelete = oldFiles.filter(f => {
            const name = f.name || f.filename || f;
            return !keepExistingNames.includes(name) && !deletedNames.includes(name);
        });
        filesToDelete.forEach((file) => {
            deleteFileIfExists(file.path);
            console.log(`File lama yang tidak dipertahankan dihapus: ${file.name || file.filename}`);
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
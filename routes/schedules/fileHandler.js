// fileHandler.js - File Handling Module for Schedules

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/**
 * Konfigurasi Multer untuk Upload File
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, "_"));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "video/webm",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Tipe file tidak didukung! Hanya gambar, video, PDF, dan dokumen yang diperbolehkan."
        )
      );
    }
  },
}).array("files", 10);

/**
 * Hapus file jika ada
 * @param {string} filePath - Path file yang akan dihapus
 */
function deleteFileIfExists(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr)
        console.error(`Gagal menghapus file ${filePath}:`, unlinkErr);
      else console.log(`Berhasil menghapus file: ${filePath}`);
    });
  }
}

/**
 * Persiapkan data file untuk disimpan
 * @param {Array} uploadedFiles - File yang diupload
 * @returns {string|null} - JSON string atau null
 */
function prepareFilesData(uploadedFiles) {
  if (!uploadedFiles || uploadedFiles.length === 0) {
    return null;
  }

  return JSON.stringify(
    uploadedFiles.map((file) => ({
      path: file.path,
      name: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }))
  );
}

/**
 * Cleanup uploaded files
 * @param {Array} files - Array of files
 */
function cleanupUploadedFiles(files) {
  if (files && Array.isArray(files)) {
    files.forEach((file) => {
      if (file.path) {
        deleteFileIfExists(file.path);
      }
    });
  }
}

/**
 * Cleanup files dari filesData JSON
 * @param {string} filesData - JSON string berisi data file
 */
function cleanupFiles(filesData) {
  if (filesData) {
    try {
      const files = JSON.parse(filesData);
      if (Array.isArray(files)) {
        files.forEach((file) => {
          if (file.path) {
            deleteFileIfExists(file.path);
          }
        });
      }
    } catch (parseErr) {
      console.error("Gagal mengurai filesData untuk penghapusan:", parseErr);
    }
  }
}

module.exports = {
  upload,
  uploadDir,
  deleteFileIfExists,
  prepareFilesData,
  cleanupUploadedFiles,
  cleanupFiles,
};
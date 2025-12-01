// auth-routes.js - Simplified Session (No Last Login Tracking)
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// ⚙️ Session Configuration
const SESSION_CONFIG = {
  TOKEN_EXPIRY: "7d" // Token JWT 7 hari
};

// Middleware untuk verifikasi token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Token tidak ditemukan" 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: "Token tidak valid atau expired" 
      });
    }
    req.user = user;
    next();
  });
};

// Middleware untuk cek role admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Hanya admin yang dapat mengakses.",
    });
  }
  next();
};

// ==================== AUTHENTICATION ROUTES ====================

// Login route
router.post("/login", async (req, res) => {
  console.log('🔵 Login attempt');
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password harus diisi",
      });
    }

    // Cari user berdasarkan email
    const query = "SELECT * FROM users WHERE email = ? AND is_active = 1";
    db.get(query, [email], async (err, user) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Terjadi kesalahan server",
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Email atau password salah",
        });
      }

      // Verifikasi password
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: "Email atau password salah",
        });
      }

      console.log('✅ Login successful:', user.email);

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: SESSION_CONFIG.TOKEN_EXPIRY }
      );

      // Return user data (exclude password)
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
      };

      res.json({
        success: true,
        message: "Login berhasil",
        token: token,
        user: userData
      });
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
});

// Logout route
router.post("/logout", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Logout berhasil",
  });
});

// Verify Token - Check if token is still valid
router.get("/verify", authenticateToken, (req, res) => {
  // Cek apakah user masih aktif di database
  db.get(
    'SELECT is_active FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err || !user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Session tidak valid'
        });
      }

      res.json({
        success: true,
        user: req.user
      });
    }
  );
});

// ==================== USER MANAGEMENT ROUTES ====================

// Get all users (Admin only)
router.get("/users", authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT id, email, name, role, is_active, created_at 
    FROM users 
    ORDER BY created_at DESC
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server",
      });
    }

    res.json({
      success: true,
      users: results,
    });
  });
});

// Create new user (Admin only)
router.post("/users", authenticateToken, requireAdmin, async (req, res) => {
  console.log("🔵 POST /users - Creating new user");
  console.log("📦 Request body:", req.body);
  
  try {
    const { email, password, name, role, is_active } = req.body;

    // Validation
    if (!email || !password || !name || !role) {
      console.log("⚠️ Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Semua field harus diisi",
      });
    }

    if (!["admin", "operator"].includes(role)) {
      console.log("⚠️ Invalid role:", role);
      return res.status(400).json({
        success: false,
        message: "Role tidak valid",
      });
    }

    // Cek apakah email sudah ada
    const checkQuery = "SELECT id FROM users WHERE email = ?";
    db.get(checkQuery, [email], async (err, result) => {
      if (err) {
        console.error("❌ Database error (check email):", err);
        return res.status(500).json({
          success: false,
          message: "Terjadi kesalahan server",
          error: err.message
        });
      }

      if (result) {
        console.log("⚠️ Email already exists:", email);
        return res.status(400).json({
          success: false,
          message: "Email sudah terdaftar",
        });
      }

      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("✅ Password hashed");

        const isActiveValue = is_active !== undefined ? (is_active ? 1 : 0) : 1;
        console.log("📝 is_active value:", isActiveValue);

        // Insert user baru
        const insertQuery = `
          INSERT INTO users (email, password, name, role, is_active, created_at) 
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `;

        db.run(insertQuery, [email, hashedPassword, name, role, isActiveValue], function (err) {
          if (err) {
            console.error("❌ Database error (insert):", err);
            
            if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('email')) {
              return res.status(400).json({
                success: false,
                message: "Email sudah terdaftar",
              });
            }
            
            return res.status(500).json({
              success: false,
              message: "Gagal membuat user",
              error: err.message
            });
          }

          console.log("✅ User created successfully, ID:", this.lastID);

          res.json({
            success: true,
            message: "User berhasil dibuat",
            userId: this.lastID,
          });
        });
      } catch (hashError) {
        console.error("❌ Password hashing error:", hashError);
        return res.status(500).json({
          success: false,
          message: "Gagal memproses password",
          error: hashError.message
        });
      }
    });
  } catch (error) {
    console.error("❌ Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
});

// Update user (Admin only)
router.put("/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, name, role, is_active, password } = req.body;

    if (!email || !name || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, nama, dan role harus diisi",
      });
    }

    if (!["admin", "operator"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role tidak valid",
      });
    }

    // Cek apakah email sudah dipakai user lain
    const checkQuery = "SELECT id FROM users WHERE email = ? AND id != ?";
    db.get(checkQuery, [email, userId], async (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Terjadi kesalahan server",
        });
      }

      if (result) {
        return res.status(400).json({
          success: false,
          message: "Email sudah digunakan user lain",
        });
      }

      let updateQuery = `
        UPDATE users 
        SET email = ?, name = ?, role = ?, is_active = ?
      `;
      let params = [email, name, role, is_active ? 1 : 0];

      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateQuery += ", password = ?";
        params.push(hashedPassword);
      }

      updateQuery += " WHERE id = ?";
      params.push(userId);

      db.run(updateQuery, params, function (err) {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Gagal mengupdate user",
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: "User tidak ditemukan",
          });
        }

        res.json({
          success: true,
          message: "User berhasil diupdate",
        });
      });
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
});

// Delete user (Admin only)
router.delete("/users/:id", authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.id;

  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "Tidak dapat menghapus akun sendiri",
    });
  }

  const query = "DELETE FROM users WHERE id = ?";
  db.run(query, [userId], function (err) {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Gagal menghapus user",
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "User berhasil dihapus",
    });
  });
});

// Change own password
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Password lama dan baru harus diisi",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter",
      });
    }

    const query = "SELECT password FROM users WHERE id = ?";
    db.get(query, [req.user.id], async (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Terjadi kesalahan server",
        });
      }

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, result.password);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: "Password lama salah",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const updateQuery = "UPDATE users SET password = ? WHERE id = ?";
      db.run(updateQuery, [hashedPassword, req.user.id], function (err) {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Gagal mengubah password",
          });
        }

        res.json({
          success: true,
          message: "Password berhasil diubah",
        });
      });
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
});

module.exports = { router, authenticateToken, requireAdmin };
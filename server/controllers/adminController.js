export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Check if fields are actually sent
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const VALID_ADMIN_USER = "Shopnest@123";
    const VALID_ADMIN_PASS = "admin@123";

    // 2. Compare credentials
    if (username === VALID_ADMIN_USER && password === VALID_ADMIN_PASS) {
      const token = jwt.sign(
        { id: "admin_root_01", isAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.status(200).json({
        token,
        user: { name: "Admin Master", isAdmin: true }
      });
    }

    // 3. Wrong credentials
    return res.status(401).json({ message: "Invalid Admin Credentials" });

  } catch (error) {
    console.error("Admin Login Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
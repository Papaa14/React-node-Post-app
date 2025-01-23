import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'


dotenv.config();

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});

export async function getNotes() {
    const [rows] = await pool.query('SELECT * FROM notes');
    return rows;
}

export async function getNoteById(id) {
    const [[note]] = await pool.query('SELECT * FROM notes WHERE id = ?', [id]);
    return note;
}

export async function getUserById(id) {
    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return user;
}
export async function getUser() {
    const [users] = await pool.query('SELECT * FROM users');
    return users;
}

export async function createNote(title, contents) {
    const [result] = await pool.query('INSERT INTO notes (title, contents) VALUES (?, ?)', [title, contents]);
    return getNoteById(result.insertId);
}

export async function register(name, username, email, phone, password, address) {
    try {
        const saltRounds = 10;
        const type = "user";
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const [result] = await pool.query('INSERT INTO users (name, username, email, phone, password, address, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, username, email, phone, hashedPassword, address, type]);   
        const user = await getUser(result.insertId);

        return {
            success: true,
            signedup:true,
            message: "Signed up successfully",
            user,
        };
    } catch (error) {
        // Handle errors (e.g., unique constraint violations)
        console.error("Error during registration:", error);
        return {
            success: false,
            message: "Registration failed. Please try again.",
        };
    }
}
export async function login(email, password) {
    try {
      // First, retrieve the user by email
      const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      
      // Check if user exists
      if (users.length === 0) {
        return {
          success: false,
          message: "User not found. Please check your email."
        };
      }
      
      // Get the first (and should be only) user
      const user = users[0];
      
      // Compare the provided password with the stored hashed password
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      
      // Check if password is correct
      if (!isPasswordCorrect) {
        return {
          success: false,
          message: "Incorrect password. Please try again."
        };
      }

       // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: user.type
      }, 
      process.env.JWT_SECRET_KEY, 
      { 
        expiresIn: '24h' // Token expires in 24 hours
      }
    );
    
      
      // Login successful
      return {
        success: true,
        message: "Login successful",
        loggedin:true,
        token: token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          type: user.type
        }
      };
    } catch (error) {
      // Handle any unexpected errors
      console.error("Error during login:", error);
      return {
        success: false,
        message: "Login failed. Please try again."
      };
    }
  }
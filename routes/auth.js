const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

const router = express.Router();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });

    user = new User({
      name,
      email,
      password,
      role,
      verificationToken,
    });
    await user.save();

    // const verificationUrl = `http://192.168.159.246:3000/auth/verify/${verificationToken}`;
    const verificationUrl = `https://lms-backend-f2fk.onrender.com/auth/verify/${verificationToken}`;
    await transporter.sendMail({
      from: `"LMS Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your LMS Account',
      html: `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to LMS Platform!</h2>
        <p>Thank you for registering. To activate your account, please verify your email address by clicking the button below:</p>
        <p>
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>If you didn’t register, please ignore this email.</p>
        <p>Best regards,<br>The LMS Team</p>
      </body>
    </html>
  `,
    });

    // In the register route
    res.status(201).json({ message: 'Please verify your email by clicking the link sent to your inbox.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify email
router.get('/verify/:token', async (req, res) => {
  try {
    const { email } = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findOne({ email, verificationToken: req.params.token });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(400).json({ message: 'Please verify your email first' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
import nodemailer from 'nodemailer';
import { HOSPITAL } from '../utils/constants.js';

const getTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials are not configured. Email will be logged only.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

export const sendMail = async ({ to, subject, html, attachments = [] }) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`Email skipped: ${subject} -> ${to}`);
    return;
  }

  await transporter.sendMail({
    from: `"${HOSPITAL.name}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments
  });
};

export const sendOtpEmail = (to, otp, purpose = 'verification') =>
  sendMail({
    to,
    subject: `JK Hospital ${purpose} OTP`,
    html: `<h2>JK Hospital</h2><p>Your ${purpose} OTP is:</p><h1 style="letter-spacing:4px">${otp}</h1><p>This code expires in 10 minutes.</p>`
  });

export const sendAppointmentEmail = (to, appointment) =>
  sendMail({
    to,
    subject: 'JK Hospital Appointment Confirmed',
    html: `<h2>Appointment confirmed</h2><p>Your token number is <strong>${appointment.tokenNumber}</strong>.</p><p>Emergency contact: ${HOSPITAL.emergency}</p>`
  });

export const sendStatusEmail = (to, subject, message) =>
  sendMail({
    to,
    subject,
    html: `<h2>JK Hospital</h2><p>${message}</p><p>Emergency contact: ${HOSPITAL.emergency}</p>`
  });


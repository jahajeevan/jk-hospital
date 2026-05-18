import PDFDocument from 'pdfkit';
import { HOSPITAL } from '../utils/constants.js';

export const createInvoiceBuffer = (appointment, payment) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).text(HOSPITAL.name, { align: 'center' });
    doc.fontSize(10).text(`Emergency: ${HOSPITAL.emergency}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('Appointment Invoice');
    doc.moveDown(0.5);
    doc.fontSize(11);

    const doctor = appointment.doctor;
    const patient = appointment.patientDetails;
    const paymentMethodLabel = payment.method === 'razorpay' ? 'Razorpay' : payment.method === 'stripe' ? 'Stripe' : 'UPI';
    const rows = [
      ['Invoice Number', appointment.invoiceNumber],
      ['Patient Name', patient.name],
      ['Patient Email', patient.email],
      ['Doctor', `${doctor.name} - ${doctor.specialty}`],
      ['Date', new Date(appointment.appointmentDate).toLocaleDateString('en-IN')],
      ['Slot', appointment.slotLabel],
      ['Token Number', appointment.tokenNumber],
      ['Queue Position', appointment.queuePosition],
      ['Booking Status', appointment.status],
      ['Consultation Fee', `INR ${payment.amount}`],
      ['Payment Method', paymentMethodLabel],
      ['UPI ID', payment.upiId || 'N/A'],
      ['Transaction ID', payment.transactionId]
    ];

    rows.forEach(([label, value]) => {
      doc.text(`${label}: `, { continued: true }).font('Helvetica-Bold').text(String(value || '-')).font('Helvetica');
    });

    doc.moveDown();
    doc.text('Thank you for choosing JK Hospital. Please arrive 10 minutes before your slot.');
    doc.end();
  });

import { FIXED_CONSULTATION_FEE } from './paymentRules.js';

export async function downloadInvoice(appointment) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const payment = appointment.payment || {};
  const doctor = appointment.doctor || {};
  const patient = appointment.patientDetails || {};
  const paymentMethodLabel =
    payment.method === 'razorpay' ? 'Razorpay (Verified)' : payment.method === 'stripe' ? 'Stripe' : 'Online';

  const pageW = doc.internal.pageSize.getWidth();
  const brand = [13, 99, 173];
  const mint = [16, 185, 129];

  // Header band
  doc.setFillColor(...brand);
  doc.rect(0, 0, pageW, 42, 'F');
  doc.setFillColor(...mint);
  doc.rect(pageW - 55, 0, 55, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('JK Hospital', 16, 18);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Modern OP tokens · Verified online payments', 16, 26);
  doc.text('Emergency: 7845265507', 16, 33);

  doc.setFontSize(9);
  doc.text('OFFICIAL RECEIPT', pageW - 16, 16, { align: 'right' });
  doc.setFontSize(8);
  doc.text(new Date().toLocaleString(), pageW - 16, 22, { align: 'right' });

  // Token highlight
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(14, 50, pageW - 28, 32, 4, 4, 'F');
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, 50, pageW - 28, 32, 4, 4, 'S');

  doc.setTextColor(...brand);
  doc.setFontSize(11);
  doc.text('YOUR TOKEN NUMBER', 20, 60);
  doc.setFontSize(28);
  doc.setFont(undefined, 'bold');
  doc.text(`#${appointment.tokenNumber ?? '—'}`, 20, 74);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${doctor.name || 'Doctor'} · ${appointment.slotLabel || 'Slot'} · ${new Date(appointment.appointmentDate).toLocaleDateString()}`,
    pageW / 2 + 10,
    68
  );
  doc.text(`Queue position: ${appointment.queuePosition ?? '—'}`, pageW / 2 + 10, 76);

  // Details table
  const rows = [
    ['Invoice', appointment.invoiceNumber],
    ['Patient name', patient.name],
    ['Patient phone', patient.phone || '—'],
    ['Doctor', `${doctor.name || '—'} (${doctor.specialty || 'Specialist'})`],
    ['Appointment date', new Date(appointment.appointmentDate).toLocaleDateString()],
    ['OP slot', appointment.slotLabel],
    ['Status', String(appointment.status || 'approved').replace(/_/g, ' ')],
    ['Consultation fee', `INR ${payment.amount || FIXED_CONSULTATION_FEE}`],
    ['Payment', paymentMethodLabel],
    ['Transaction ID', payment.transactionId || '—']
  ];

  let y = 92;
  doc.setFontSize(12);
  doc.setTextColor(...brand);
  doc.setFont(undefined, 'bold');
  doc.text('Appointment details', 16, y);
  y += 8;

  rows.forEach(([label, value], index) => {
    const rowY = y + index * 9;
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, rowY - 5, pageW - 28, 8, 'F');
    }
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont(undefined, 'bold');
    doc.text(label, 18, rowY);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(String(value || '—'), pageW - 78);
    doc.text(lines, 62, rowY);
  });

  y += rows.length * 9 + 8;

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageW - 14, y);
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Please arrive 15 minutes before your slot with this invoice or token screenshot.', 16, y);
  doc.text('JK Hospital · Main Road, Tamil Nadu · care@jkhospital.local', 16, y + 5);
  doc.setTextColor(...mint);
  doc.text('Thank you for choosing JK Hospital', pageW / 2, 285, { align: 'center' });

  doc.save(`${appointment.invoiceNumber || 'jk-hospital-receipt'}.pdf`);
}

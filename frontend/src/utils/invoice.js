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
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 10, 18, 18, 4, 4, 'F');
  doc.setFillColor(...brand);
  doc.triangle(23, 13, 16, 16, 30, 16, 'F');
  doc.roundedRect(17, 15, 12, 10, 2, 2, 'F');
  doc.setFillColor(...mint);
  doc.triangle(27, 18, 32, 14, 29, 25, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(21, 15.5, 4, 10, 'F');
  doc.rect(18, 18.5, 10, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('JK Hospital', 38, 18);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Modern OP tokens · Verified online payments', 38, 26);
  doc.text('Emergency: 7845265507', 38, 33);

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

const writeHeader = (doc, title) => {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(13, 99, 173);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('JK Hospital', 16, 15);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Professional medical record · Emergency: 7845265507', 16, 23);
  doc.text(title, pageW - 16, 18, { align: 'right' });
};

export async function downloadPrescriptionPdf(appointment) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const rx = appointment.prescription || {};
  const patient = appointment.patientDetails || {};
  const doctor = appointment.doctor || {};
  writeHeader(doc, 'PRESCRIPTION');

  let y = 48;
  const rows = [
    ['Doctor', `${doctor.name || rx.doctorName || 'Doctor'} · ${doctor.specialization || doctor.specialty || 'Specialist'}`],
    ['Patient', `${patient.name || appointment.patientName || 'Patient'} · ${patient.age || '—'} yrs · ${patient.gender || '—'}`],
    ['Token/date', `#${appointment.tokenNumber || '—'} · ${new Date(appointment.appointmentDate || Date.now()).toLocaleDateString()}`],
    ['Symptoms', rx.symptoms || '—'],
    ['Diagnosis', rx.diagnosis || '—']
  ];
  rows.forEach(([label, value]) => {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont(undefined, 'bold');
    doc.text(label, 16, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'normal');
    doc.text(doc.splitTextToSize(String(value), 130), 52, y);
    y += 10;
  });

  doc.setTextColor(13, 99, 173);
  doc.setFont(undefined, 'bold');
  doc.text('Medicines', 16, y + 4);
  y += 12;
  (rx.medicines || []).forEach((item, index) => {
    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'normal');
    doc.text(`${index + 1}. ${item.name} · M:${item.morning || '-'} A:${item.afternoon || '-'} N:${item.night || '-'} · ${item.days || '-'} days`, 18, y);
    y += 8;
  });
  doc.text(doc.splitTextToSize(`Advice: ${rx.advice || rx.remarks || '—'}`, 170), 16, y + 8);
  doc.text(`Follow-up: ${rx.followUpRequired ? `${rx.followUpDate || ''} ${rx.followUpNotes || ''}` : 'Not required'}`, 16, y + 24);
  doc.line(135, 255, 190, 255);
  doc.text('Doctor signature', 148, 262);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('JK Hospital · Main Road, Tamil Nadu · care@jkhospital.local', 16, 286);
  doc.save(`JKH-prescription-${appointment.tokenNumber || Date.now()}.pdf`);
}

export async function downloadVisitSummaryPdf(record) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  writeHeader(doc, record.pdfReady ? 'PRESCRIPTION + BILL' : 'VISIT SUMMARY');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(record.title || 'Medical record summary', 16, 48);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(new Date(record.createdAt || Date.now()).toLocaleString(), 16, 56);
  doc.setTextColor(15, 23, 42);
  let y = 70;
  const appointment = record.appointment || {};
  if (record.prescription || record.pharmacyBill) {
    const patient = appointment.patientDetails || {};
    const doctor = appointment.doctor || {};
    [
      ['Patient', patient.name || appointment.patientName || 'Patient'],
      ['Doctor', doctor.name || record.prescription?.doctorName || 'Doctor'],
      ['Token/date', `#${appointment.tokenNumber || '—'} · ${new Date(appointment.appointmentDate || record.createdAt || Date.now()).toLocaleDateString()}`],
      ['Symptoms', record.prescription?.symptoms || '—']
    ].forEach(([label, value]) => {
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'bold');
      doc.text(label, 16, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont(undefined, 'normal');
      doc.text(doc.splitTextToSize(String(value), 132), 52, y);
      y += 9;
    });
    doc.setTextColor(13, 99, 173);
    doc.setFont(undefined, 'bold');
    doc.text('Prescription', 16, y + 3);
    y += 11;
    (record.prescription?.medicines || []).forEach((item, index) => {
      doc.setTextColor(15, 23, 42);
      doc.setFont(undefined, 'normal');
      doc.text(doc.splitTextToSize(`${index + 1}. ${item.name} · M:${item.morning || '-'} A:${item.afternoon || '-'} N:${item.night || '-'} · ${item.days || '-'} days`, 170), 18, y);
      y += 8;
    });
    doc.setTextColor(13, 99, 173);
    doc.setFont(undefined, 'bold');
    doc.text('Bill', 16, y + 4);
    y += 12;
    (record.pharmacyBill?.items || []).forEach((item) => {
      doc.setTextColor(15, 23, 42);
      doc.setFont(undefined, 'normal');
      doc.text(`${item.name} x${item.quantity}`, 18, y);
      doc.text(`INR ${Number(item.total || 0).toFixed(2)}`, 180, y, { align: 'right' });
      y += 8;
    });
    doc.setFont(undefined, 'bold');
    doc.text('Total', 18, y + 3);
    doc.text(`INR ${Number(record.pharmacyBill?.totalAmount || 0).toFixed(2)}`, 180, y + 3, { align: 'right' });
  } else {
    doc.text(doc.splitTextToSize(record.aiSummary || record.sourceText || 'No details saved.', 178), 16, y);
  }
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('JK Hospital · Main Road, Tamil Nadu · care@jkhospital.local', 16, 286);
  doc.save(`${record.title || 'jk-hospital-visit-summary'}.pdf`);
}

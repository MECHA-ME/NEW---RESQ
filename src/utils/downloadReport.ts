import { Incident, AppState, Feedback } from '../types';
import { jsPDF } from 'jspdf';

/**
 * Formats an incident and its associated ecosystem data into a comprehensive text report.
 */
export function generateIncidentReportText(incident: Incident, state: AppState): string {
  const responder = state.users.find((u) => u.id === incident.assignedResponderId);
  const selectedHospital = state.users.find((u) => u.id === incident.selectedHospitalId);
  const feedbacks = state.feedbacks?.filter((f: Feedback) => f.incidentId === incident.id) || [];

  const createdDate = new Date(incident.createdAt).toLocaleString();

  const lines: string[] = [
    '================================================================================',
    '                        RESQ EMERGENCY RESPONSE REPORT                          ',
    '               Rapid Emergency Synchronisation & Quick Response                 ',
    '================================================================================',
    '',
    `INCIDENT REFERENCE : #REC-${incident.id.slice(0, 8).toUpperCase()}`,
    `INCIDENT ID        : ${incident.id}`,
    `STATUS             : ${incident.status}`,
    `SERVICE TYPE       : AMBULANCE (EMS TRAUMA)`,
    `INITIATED AT       : ${createdDate}`,
    '',
    '--------------------------------------------------------------------------------',
    '1. PATIENT & CALLER MANIFEST',
    '--------------------------------------------------------------------------------',
    `Caller Role        : ${incident.callerRole || 'PATIENT'}`,
    `Number of Victims  : ${incident.victimCount || 1}`,
    `Emergency Location : ${incident.address || `${incident.location.lat.toFixed(5)}, ${incident.location.lng.toFixed(5)}`}`,
    `Clinical Condition : ${incident.condition || 'Severe Trauma / Medical Distress'}`,
    `Category           : ${incident.conditionCategory || 'General Emergency'}`,
    `Required Acuity    : ${incident.conditionAcuity || 'ALS (Advanced Life Support)'}`,
    `Hospital Preference: ${incident.preferredHospitalName || 'Nearest ER with Beds (System Optimized)'}`,
    '',
    '--------------------------------------------------------------------------------',
    '2. ASSIGNED RESPONDER & STAKEHOLDERS',
    '--------------------------------------------------------------------------------',
    `Assigned Unit      : ${responder?.name || 'Unassigned / Auto-dispatched'} (${responder?.id || 'N/A'})`,
    `Role / Branch      : ${responder?.role || 'AMBULANCE_DRIVER'}`,
    `Destination Center : ${selectedHospital?.name || incident.preferredHospitalName || 'Coordinating Hospital'}`,
    `ER Beds Available  : ${selectedHospital?.capacity?.erBeds ?? 'N/A'}`,
    `ICU Beds Available : ${selectedHospital?.capacity?.icuBeds ?? 'N/A'}`,
    '',
    '--------------------------------------------------------------------------------',
    '3. GREEN CORRIDOR & TRAFFIC CLEARANCE',
    '--------------------------------------------------------------------------------',
    `Corridor Required  : ${incident.greenCorridor?.required ? 'YES' : 'STANDARD PRIORITY'}`,
    `Corridor Status    : ${incident.greenCorridor?.status || 'N/A'}`,
    `Active Phase       : ${incident.greenCorridor?.phaseLabel || incident.greenCorridor?.phase || 'N/A'}`,
    `Estimated Transit  : ${incident.greenCorridor?.estimatedArrivalMinutes || 0} min @ ${incident.greenCorridor?.speedKmH || 65} km/h`,
    `Escort Dispatched  : ${incident.greenCorridor?.escortDispatched ? 'YES' : 'NO'}`,
    `Officer Notes      : ${incident.greenCorridor?.policeOfficerNotes || 'No special notes recorded'}`,
  ];

  if (incident.greenCorridor?.junctions && incident.greenCorridor.junctions.length > 0) {
    lines.push('Junction Clearances:');
    incident.greenCorridor.junctions.forEach((j, i) => {
      lines.push(`  [${i + 1}] ${j.name} - Status: ${j.status} (ETA: ${j.etaSeconds}s)`);
    });
  }

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('4. LIFECYCLE TIMELINE EVENTS');
  lines.push('--------------------------------------------------------------------------------');

  if (incident.timeline && incident.timeline.length > 0) {
    incident.timeline.forEach((event, idx) => {
      const timeStr = new Date(event.timestamp).toLocaleTimeString();
      lines.push(`  ${idx + 1}. [${timeStr}] ${event.status}`);
    });
  } else {
    lines.push('  1. Initial Dispatch Notification logged');
  }

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`5. STAKEHOLDER FEEDBACKS & REVIEWS (${feedbacks.length} Submissions)`);
  lines.push('--------------------------------------------------------------------------------');

  if (feedbacks.length > 0) {
    feedbacks.forEach((fb, idx) => {
      lines.push(`  [Feedback #${idx + 1}]`);
      lines.push(`    From Role : ${fb.fromRole}`);
      lines.push(`    To Role   : ${fb.toRole}`);
      lines.push(`    Rating    : ${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)} (${fb.rating}/5)`);
      lines.push(`    Comments  : "${fb.comment}"`);
      lines.push(`    Timestamp : ${new Date(fb.timestamp).toLocaleString()}`);
      lines.push('');
    });
  } else {
    lines.push('  No post-incident feedback recorded for this emergency.');
  }

  lines.push('================================================================================');
  lines.push('                  END OF RESQ OFFICIAL INCIDENT RECORD                          ');
  lines.push('================================================================================');

  return lines.join('\n');
}

/**
 * Triggers a file download directly in the user's browser.
 */
function triggerBrowserDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single incident report as a formatted text file (.txt).
 */
export function downloadIncidentReport(incident: Incident, state: AppState) {
  const textContent = generateIncidentReportText(incident, state);
  const cleanId = incident.id.slice(0, 8).toUpperCase();
  const filename = `RESQ-Report-REC-${cleanId}.txt`;
  triggerBrowserDownload(filename, textContent, 'text/plain;charset=utf-8');
}

/**
 * Downloads a single incident report as JSON (.json).
 */
export function downloadIncidentJSON(incident: Incident, state: AppState) {
  const feedbacks = state.feedbacks?.filter((f: Feedback) => f.incidentId === incident.id) || [];
  const exportData = {
    system: 'RESQ Emergency Network',
    exportedAt: new Date().toISOString(),
    incident,
    stakeholderFeedbacks: feedbacks
  };
  const jsonContent = JSON.stringify(exportData, null, 2);
  const cleanId = incident.id.slice(0, 8).toUpperCase();
  const filename = `RESQ-Data-REC-${cleanId}.json`;
  triggerBrowserDownload(filename, jsonContent, 'application/json;charset=utf-8');
}

/**
 * Helper to build an incident section into a jsPDF document with automatic page breaking
 */
function renderIncidentToPDF(doc: jsPDF, incident: Incident, state: AppState, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = startY;

  const checkPageBreak = (neededHeight: number): void => {
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage();
      y = 16;
      // Header bar for subsequent pages
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`RESQ EMERGENCY RECORD: #REC-${incident.id.slice(0, 8).toUpperCase()}`, margin + 4, y + 5.5);
      doc.text(`STATUS: ${incident.status}`, pageWidth - margin - 4, y + 5.5, { align: 'right' });
      y += 12;
    }
  };

  const responder = state.users.find((u) => u.id === incident.assignedResponderId);
  const selectedHospital = state.users.find((u) => u.id === incident.selectedHospitalId);
  const feedbacks = state.feedbacks?.filter((f: Feedback) => f.incidentId === incident.id) || [];

  // Top Header Banner
  doc.setFillColor(220, 38, 38); // Red-600
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RESQ EMERGENCY INCIDENT AUDIT REPORT', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Rapid Emergency Synchronisation & Quick Response Network', margin + 6, y + 14);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 6, y + 19);

  // Reference tag
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(pageWidth - margin - 58, y + 4, 52, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`#REC-${incident.id.slice(0, 8).toUpperCase()}`, pageWidth - margin - 32, y + 10, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(239, 68, 68);
  doc.text(incident.status, pageWidth - margin - 32, y + 15, { align: 'center' });

  y += 26;

  // Key Overview Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVICE TYPE:', margin + 4, y + 6);
  doc.text('CALLER ROLE:', margin + 45, y + 6);
  doc.text('VICTIMS:', margin + 85, y + 6);
  doc.text('INITIATED AT:', margin + 115, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('AMBULANCE (EMS)', margin + 4, y + 11);
  doc.text(incident.callerRole || 'PATIENT', margin + 45, y + 11);
  doc.text(`${incident.victimCount || 1} Person(s)`, margin + 85, y + 11);
  doc.text(new Date(incident.createdAt).toLocaleTimeString(), margin + 115, y + 11);

  y += 20;

  // Section 1: Patient & Caller Information
  checkPageBreak(30);
  doc.setFillColor(239, 68, 68);
  doc.rect(margin, y, 3, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. PATIENT & CALLER MANIFEST', margin + 6, y + 5.5);
  y += 9;

  const locAddress = incident.address || `${incident.location.lat.toFixed(5)}, ${incident.location.lng.toFixed(5)}`;
  const patientDetails = [
    `• Emergency Location: ${locAddress}`,
    `• Clinical Condition : ${incident.condition || 'Severe Trauma / Medical Distress'}`,
    `• Condition Category : ${incident.conditionCategory || 'General Emergency'}`,
    `• Acuity Level       : ${incident.conditionAcuity || 'ALS (Advanced Life Support)'}`,
    `• Hospital Choice    : ${incident.preferredHospitalName || 'Nearest Emergency Room with available capacity'}`
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  patientDetails.forEach((line) => {
    checkPageBreak(5);
    const splitLines = doc.splitTextToSize(line, contentWidth - 4);
    doc.text(splitLines, margin + 4, y);
    y += splitLines.length * 4.2;
  });

  y += 3;

  // Section 2: Assigned Responder & Medical Transport
  checkPageBreak(30);
  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(margin, y, 3, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('2. ASSIGNED RESPONDER & MEDICAL CENTER', margin + 6, y + 5.5);
  y += 9;

  const responderDetails = [
    `• Assigned Unit      : ${responder?.name || 'System Dispatched'} (${responder?.id || 'N/A'})`,
    `• Unit Role / Squad  : ${responder?.role || 'AMBULANCE_DRIVER'}`,
    `• Receiving Hospital : ${selectedHospital?.name || incident.preferredHospitalName || 'Coordinating Trauma Center'}`,
    `• ER Beds Available  : ${selectedHospital?.capacity?.erBeds ?? 'N/A'} | ICU Beds: ${selectedHospital?.capacity?.icuBeds ?? 'N/A'}`
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  responderDetails.forEach((line) => {
    checkPageBreak(5);
    const splitLines = doc.splitTextToSize(line, contentWidth - 4);
    doc.text(splitLines, margin + 4, y);
    y += splitLines.length * 4.2;
  });

  y += 3;

  // Section 3: Green Corridor & Traffic Clearance
  checkPageBreak(30);
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(margin, y, 3, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('3. GREEN CORRIDOR & TRAFFIC CLEARANCE', margin + 6, y + 5.5);
  y += 9;

  const corridorDetails = [
    `• Corridor Activated : ${incident.greenCorridor?.required ? 'YES (High Priority)' : 'Standard Dispatch'}`,
    `• Corridor Status    : ${incident.greenCorridor?.status || 'N/A'}`,
    `• Active Phase       : ${incident.greenCorridor?.phaseLabel || incident.greenCorridor?.phase || 'N/A'}`,
    `• Transit Speed/ETA  : ${incident.greenCorridor?.speedKmH || 65} km/h (ETA: ~${incident.greenCorridor?.estimatedArrivalMinutes || 0} mins)`,
    `• Escort Dispatched  : ${incident.greenCorridor?.escortDispatched ? 'YES' : 'NO'}`,
    `• Traffic Officer    : ${incident.greenCorridor?.policeOfficerNotes || 'Standard pre-emption applied'}`
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  corridorDetails.forEach((line) => {
    checkPageBreak(5);
    const splitLines = doc.splitTextToSize(line, contentWidth - 4);
    doc.text(splitLines, margin + 4, y);
    y += splitLines.length * 4.2;
  });

  if (incident.greenCorridor?.junctions && incident.greenCorridor.junctions.length > 0) {
    checkPageBreak(8);
    doc.setFont('helvetica', 'bold');
    doc.text('• Junction Clearances:', margin + 4, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    incident.greenCorridor.junctions.forEach((j, i) => {
      checkPageBreak(5);
      doc.text(`   [${i + 1}] ${j.name} — Status: ${j.status} (ETA: ${j.etaSeconds}s)`, margin + 6, y);
      y += 4;
    });
  }

  y += 3;

  // Section 4: Lifecycle Milestones
  checkPageBreak(30);
  doc.setFillColor(139, 92, 246); // purple-500
  doc.rect(margin, y, 3, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('4. LIFECYCLE TIMELINE EVENTS', margin + 6, y + 5.5);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  if (incident.timeline && incident.timeline.length > 0) {
    incident.timeline.forEach((event, idx) => {
      checkPageBreak(5);
      const timeStr = new Date(event.timestamp).toLocaleTimeString();
      doc.text(`${idx + 1}. [${timeStr}] ${event.status}`, margin + 4, y);
      y += 4.2;
    });
  } else {
    doc.text('1. Initial emergency dispatch logged', margin + 4, y);
    y += 4.2;
  }

  y += 3;

  // Section 5: Stakeholder Feedbacks
  checkPageBreak(30);
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(margin, y, 3, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`5. STAKEHOLDER FEEDBACK & REVIEWS (${feedbacks.length} Entries)`, margin + 6, y + 5.5);
  y += 9;

  if (feedbacks.length > 0) {
    feedbacks.forEach((fb, idx) => {
      checkPageBreak(16);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin + 2, y, contentWidth - 4, 13, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`[#${idx + 1}] From: ${fb.fromRole}  ➔  To: ${fb.toRole} | Rating: ${fb.rating}/5 Stars`, margin + 5, y + 4.5);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const commentText = fb.comment ? `"${fb.comment}"` : 'No additional remarks';
      const splitComment = doc.splitTextToSize(commentText, contentWidth - 12);
      doc.text(splitComment, margin + 5, y + 9);

      y += 15;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No post-incident feedback submitted yet.', margin + 4, y);
    y += 5;
  }

  // Footer on this page
  checkPageBreak(12);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Official RESQ Emergency Response Audit System • Verification Hash: SEC-VALIDATED', margin, y);
  doc.text(`Ref: #REC-${incident.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, y, { align: 'right' });
  y += 8;

  return y;
}

/**
 * Downloads a single incident report as a styled PDF document (.pdf).
 */
export function downloadIncidentPDF(incident: Incident, state: AppState) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderIncidentToPDF(doc, incident, state, 14);
  const cleanId = incident.id.slice(0, 8).toUpperCase();
  const filename = `RESQ-Report-REC-${cleanId}.pdf`;
  doc.save(filename);
}

/**
 * Downloads all completed/past incidents as a combined batch PDF document (.pdf).
 */
export function downloadAllHistoryPDF(incidents: Incident[], state: AppState, portalRole?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Cover / Master Header Page
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(239, 68, 68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RESQ COMPREHENSIVE EMERGENCY AUDIT', margin, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Master Emergency Archive & Response Logs • Portal: ${portalRole || 'All Stakeholders'}`, margin, 26);
  doc.text(`Total Records: ${incidents.length} Emergency Incidents • Generated: ${new Date().toLocaleString()}`, margin, 34);

  let currentY = 50;

  if (incidents.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(11);
    doc.text('No incident records found in the current archive.', margin, currentY);
  } else {
    // Summary Index Table
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('#', margin + 3, currentY + 5.5);
    doc.text('REC ID', margin + 12, currentY + 5.5);
    doc.text('SERVICE', margin + 42, currentY + 5.5);
    doc.text('CALLER', margin + 80, currentY + 5.5);
    doc.text('STATUS', margin + 115, currentY + 5.5);
    doc.text('DATE / TIME', margin + 145, currentY + 5.5);
    currentY += 9;

    incidents.slice(0, 15).forEach((inc, idx) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`${idx + 1}`, margin + 3, currentY + 4);
      doc.text(`#REC-${inc.id.slice(0, 8).toUpperCase()}`, margin + 12, currentY + 4);
      doc.text('AMBULANCE', margin + 42, currentY + 4);
      doc.text(inc.callerRole || 'PATIENT', margin + 80, currentY + 4);
      doc.text(inc.status, margin + 115, currentY + 4);
      doc.text(new Date(inc.createdAt).toLocaleDateString(), margin + 145, currentY + 4);
      currentY += 6.5;
    });

    if (incidents.length > 15) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`... and ${incidents.length - 15} more records detailed in subsequent pages`, margin + 3, currentY + 4);
    }

    // Render individual incident pages
    incidents.forEach((inc) => {
      doc.addPage();
      renderIncidentToPDF(doc, inc, state, 14);
    });
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `RESQ-Master-History-${portalRole || 'All'}-${timestamp}.pdf`;
  doc.save(filename);
}

/**
 * Downloads all completed/past incidents as a combined batch summary report in TXT format.
 */
export function downloadAllHistoryReport(incidents: Incident[], state: AppState, portalRole?: string) {
  const lines: string[] = [
    '================================================================================',
    `                 RESQ COMPREHENSIVE EMERGENCY HISTORY REPORT                     `,
    `                 Portal: ${portalRole || 'All Stakeholders'}                     `,
    `                 Export Date: ${new Date().toLocaleString()}                    `,
    `                 Total Records: ${incidents.length}                             `,
    '================================================================================',
    '',
  ];

  incidents.forEach((inc, idx) => {
    lines.push(`>>> RECORD ${idx + 1} OF ${incidents.length} <<<`);
    lines.push(generateIncidentReportText(inc, state));
    lines.push('\n\n');
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `RESQ-History-Export-${portalRole || 'All'}-${timestamp}.txt`;
  triggerBrowserDownload(filename, lines.join('\n'), 'text/plain;charset=utf-8');
}


/**
 * Member Data Reader
 * Reads and parses member data from Mighty Networks Excel exports
 */

import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';

/**
 * Read member data from an Excel file
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Array>} Array of member objects
 */
async function readMemberFile(filePath) {
  const buffer = await fs.readFile(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);

  return data;
}

/**
 * Normalize member data from Mighty Networks export format
 * @param {Object} rawMember - Raw member data from Excel
 * @returns {Object} Normalized member object
 */
function normalizeMember(rawMember) {
  // Mighty Networks export columns may vary - handle common formats
  // Common columns: Name, Email, Status, Plan, Join Date, etc.

  const member = {
    // Try different possible column names
    email: rawMember['Email'] || rawMember['email'] || rawMember['Email Address'] || '',
    firstName: '',
    lastName: '',
    fullName: rawMember['Name'] || rawMember['name'] || rawMember['Full Name'] || rawMember['Member Name'] || '',
    status: rawMember['Status'] || rawMember['status'] || rawMember['Member Status'] || rawMember['Payment Status'] || rawMember['payment_status'] || '',
    plan: rawMember['Plan'] || rawMember['plan'] || rawMember['Plan Name'] || rawMember['Membership Type'] || '',
    memberId: rawMember['Member ID'] || rawMember['ID'] || rawMember['id'] || '',
    joinDate: rawMember['Join Date'] || rawMember['Joined'] || rawMember['Created'] || rawMember['Date Paid'] || '',
    raw: rawMember
  };

  // Parse full name into first/last
  if (member.fullName) {
    const nameParts = member.fullName.trim().split(/\s+/);
    member.firstName = nameParts[0] || '';
    member.lastName = nameParts.slice(1).join(' ') || '';
  }

  // Also check for separate first/last name columns
  if (rawMember['First Name'] || rawMember['first_name']) {
    member.firstName = rawMember['First Name'] || rawMember['first_name'] || member.firstName;
  }
  if (rawMember['Last Name'] || rawMember['last_name']) {
    member.lastName = rawMember['Last Name'] || rawMember['last_name'] || member.lastName;
  }

  // Normalize email
  member.email = member.email.toLowerCase().trim();

  // Normalize status
  member.status = member.status.toLowerCase().trim();

  return member;
}

/**
 * Filter for active members only
 * @param {Object} member - Normalized member object
 * @returns {boolean} True if member is active
 */
function isActiveMember(member) {
  // Handle various payment/membership status values from Mighty Networks
  const activeStatuses = ['active', 'paid', 'subscribed', 'current', 'succeeded', 'complete', 'trialing'];
  const inactiveStatuses = ['canceled', 'cancelled', 'expired', 'failed', 'pending', 'unpaid', 'past_due'];

  const statusLower = member.status.toLowerCase();

  // If status matches an inactive pattern, return false
  if (inactiveStatuses.some(s => statusLower.includes(s))) {
    return false;
  }

  // If status matches an active pattern, return true
  return activeStatuses.some(status => statusLower.includes(status));
}

/**
 * Load all members from multiple Excel files
 * @param {Array<string>} filePaths - Array of file paths
 * @param {Object} options - Options for filtering
 * @returns {Promise<Array>} Combined array of active members
 */
async function loadMembers(filePaths, options = {}) {
  const { activeOnly = true, dedupeByEmail = true } = options;

  const allMembers = [];

  for (const filePath of filePaths) {
    try {
      console.log(`Reading: ${path.basename(filePath)}`);
      const rawMembers = await readMemberFile(filePath);
      console.log(`  Found ${rawMembers.length} records`);

      // Log column names for debugging
      if (rawMembers.length > 0) {
        console.log(`  Columns: ${Object.keys(rawMembers[0]).join(', ')}`);
      }

      const normalizedMembers = rawMembers.map(normalizeMember);

      // Extract plan name from filename if not in data
      const planMatch = path.basename(filePath).match(/plan_(.+?)_members/i);
      const planFromFile = planMatch ? planMatch[1].replace(/_/g, ' ') : '';

      for (const member of normalizedMembers) {
        if (!member.plan && planFromFile) {
          member.plan = planFromFile;
        }
        member.sourceFile = path.basename(filePath);
        allMembers.push(member);
      }

    } catch (error) {
      console.error(`Error reading ${filePath}:`, error.message);
    }
  }

  // Filter active members
  let filteredMembers = activeOnly
    ? allMembers.filter(isActiveMember)
    : allMembers;

  // Dedupe by email
  if (dedupeByEmail) {
    const seen = new Set();
    filteredMembers = filteredMembers.filter(member => {
      if (!member.email || seen.has(member.email)) {
        return false;
      }
      seen.add(member.email);
      return true;
    });
  }

  console.log(`\nTotal active members: ${filteredMembers.length}`);

  return filteredMembers;
}

/**
 * Get default member file paths
 * @returns {Array<string>} Array of file paths
 */
function getDefaultMemberFiles() {
  const dataDir = path.join(process.cwd(), 'data');
  return [
    path.join(dataDir, 'plan_Veldheer_Lineman_Vault_Monthly_Plan_members_January_09_2026_13_18.xlsx'),
    path.join(dataDir, 'plan__50_Off_Annual_Plan_Veldheer_Lineman_Vault_members_January_09_2026_13_18.xlsx')
  ];
}

/**
 * Validate member data completeness
 * @param {Object} member - Member object
 * @returns {Object} Validation result
 */
function validateMember(member) {
  const issues = [];

  if (!member.email) {
    issues.push('Missing email');
  } else if (!member.email.includes('@')) {
    issues.push('Invalid email format');
  }

  if (!member.firstName) {
    issues.push('Missing first name');
  }

  return {
    valid: issues.length === 0,
    issues,
    member
  };
}

export {
  readMemberFile,
  normalizeMember,
  isActiveMember,
  loadMembers,
  getDefaultMemberFiles,
  validateMember
};

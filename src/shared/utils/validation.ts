// List of known problematic notification IDs that should never be used as user IDs
const BLOCKED_NOTIFICATION_IDS = [
  'jd7514rayy58sj0twv09h2fk0h7h1pn1',
  'jd7batyfcsa260gfxsz218gr397gyz6c',
];

/**
 * Validates if a given ID is a valid user ID and not corrupted
 * @param id - The ID to validate
 * @returns true if the ID is valid for users table
 */
export function isValidUserId(id: any): id is string {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Check if it's a blocked notification ID
  if (BLOCKED_NOTIFICATION_IDS.includes(id)) {
    console.error('Blocked notification ID detected:', id);
    return false;
  }

  // Check if it looks like a notification ID (they often start with similar patterns)
  if (id.startsWith('jd7') && id.length > 30) {
    console.warn('Potentially suspicious ID pattern detected:', id);
    return false;
  }

  // General validation
  return (
    id.length > 20 &&
    !id.includes('notification') &&
    !id.includes('gameAction') // Block other potentially problematic table IDs
  );
}

/**
 * Cleans up corrupted user data from localStorage
 */
export function cleanupCorruptedUserData(): void {
  console.warn('Cleaning up corrupted user data from localStorage');
  localStorage.removeItem('poker-user');
  // Could add more specific cleanup here if needed
}

/**
 * Validates and cleans user data if corrupted
 * @param user - User object to validate
 * @returns true if user is valid, false if corrupted (and cleaned up)
 */
export function validateAndCleanUser(user: any): boolean {
  if (!user || !user._id) {
    return false;
  }

  if (!isValidUserId(user._id)) {
    console.error('Invalid user ID detected:', user._id);
    cleanupCorruptedUserData();
    return false;
  }

  return true;
}
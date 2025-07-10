/**
 * Validates if a given ID is a valid user ID and not corrupted
 * @param id - The ID to validate
 * @returns true if the ID is valid for users table
 */
export function isValidUserId(id: any): id is string {
  return (
    id &&
    typeof id === 'string' &&
    id.length > 20 &&
    !id.includes('notification') &&
    id !== 'jd7514rayy58sj0twv09h2fk0h7h1pn1' // Block the specific problematic ID
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
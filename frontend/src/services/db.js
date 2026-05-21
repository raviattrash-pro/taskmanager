import Dexie from 'dexie';

// Initialize Dexie local database
export const db = new Dexie('AscentDB');

// Define table schema
// The structure is: id (UUID key), title, completed, synced (0/1 or boolean), pendingAction, etc.
db.version(1).stores({
  tasks: 'id, title, completed, dueDate, synced, pendingAction, deleted, updatedAt'
});

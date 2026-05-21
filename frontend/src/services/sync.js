import { db } from './db';
import api from './api';
import {
  setSyncStart,
  setSyncSuccess,
  setSyncFail,
  setTasks
} from '../store/taskSlice';

// Helper to check if browser is online
export const isBrowserOnline = () => {
  return window.navigator.onLine;
};

// Sync runner
export const syncTasks = async (dispatch, getState) => {
  const { auth, tasks: taskState } = getState();
  
  // If user is not authenticated, we cannot sync
  if (!auth.isAuthenticated) return;
  
  // If we are already syncing or offline, skip
  if (taskState.syncing || !isBrowserOnline()) return;

  dispatch(setSyncStart());

  try {
    // 1. Get all unsynced changes from local Dexie DB
    const localUnsynced = await db.tasks
      .filter(task => task.synced === 0)
      .toArray();

    // Format local changes for the backend DTO
    const localChanges = localUnsynced.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed === 1 || task.completed === true,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 19) : null,
      deleted: task.deleted === 1 || task.deleted === true,
      updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString().slice(0, 19) : null
    }));

    // 2. Fetch last sync time
    const lastSyncTime = localStorage.getItem('lastSyncTime');
    
    // 3. Send payload to server
    const response = await api.post('/tasks/sync', {
      lastSyncTime: lastSyncTime ? new Date(lastSyncTime).toISOString().slice(0, 19) : null,
      localChanges
    });

    const { serverSyncTime, serverChanges } = response.data;

    // 4. Update local Dexie DB based on sync outcomes
    
    // First, mark all locally pushed items as synced.
    // If they were marked as deleted, we remove them from Dexie entirely.
    for (const localItem of localUnsynced) {
      if (localItem.deleted === 1) {
        await db.tasks.delete(localItem.id);
      } else {
        await db.tasks.update(localItem.id, {
          synced: 1,
          pendingAction: null
        });
      }
    }

    // Next, write server changes to Dexie.
    // If server says deleted: true, delete locally.
    // Else, upsert locally and mark as synced: 1
    for (const serverItem of serverChanges) {
      if (serverItem.deleted) {
        await db.tasks.delete(serverItem.id);
      } else {
        await db.tasks.put({
          id: serverItem.id,
          title: serverItem.title,
          description: serverItem.description,
          completed: serverItem.completed ? 1 : 0,
          dueDate: serverItem.dueDate,
          deleted: 0,
          synced: 1,
          pendingAction: null,
          updatedAt: serverItem.updatedAt
        });
      }
    }

    // 5. Update lastSyncTime and dispatch Redux success
    dispatch(setSyncSuccess(serverSyncTime));

    // 6. Reload tasks from Dexie to refresh Redux state
    const activeTasks = await db.tasks
      .filter(task => task.deleted === 0)
      .toArray();

    // Map Dexie task entities to plain Redux objects
    const mappedTasks = activeTasks
      .map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        completed: task.completed === 1,
        dueDate: task.dueDate,
        updatedAt: task.updatedAt,
        synced: task.synced,
        pendingAction: task.pendingAction
      }))
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

    dispatch(setTasks(mappedTasks));

  } catch (error) {
    console.error('Sync failed:', error);
    dispatch(setSyncFail(error.message || 'Sync failed'));
  }
};

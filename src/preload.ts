import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  getTaskById: (taskId) => ipcRenderer.invoke('get-task-by-id', taskId),
  getTaskLogs: (taskId) => ipcRenderer.invoke('get-task-logs', taskId),
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  logout: () => ipcRenderer.invoke('logout'),
  getUser: () => ipcRenderer.invoke('get-user'),
});
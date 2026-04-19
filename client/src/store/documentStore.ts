import { create } from 'zustand';
import api from '../services/api';

export interface Document {
  _id: string;
  title: string;
  ownerId: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface Operation {
  type: 'insert' | 'delete' | 'retain';
  pos: number;
  text?: string;
  length?: number;
}

interface DocumentState {
  documents: Document[];
  activeDoc: Document | null;
  content: string;
  version: number;
  operationQueue: Operation[];
  isSyncing: boolean;
  hasUnsavedChanges: boolean;
  isLoadingDoc: boolean;

  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<Document | null>;
  createDocument: (title: string) => Promise<Document>;
  openDocument: (doc: Document) => void;
  deleteDocument: (docId: string) => Promise<void>;
  setContent: (content: string) => void;
  setVersion: (v: number) => void;
  enqueueOperation: (op: Operation) => void;
  clearQueue: () => void;
  setSyncing: (v: boolean) => void;
  setUnsaved: (v: boolean) => void;
  updateDocTitle: (docId: string, title: string) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  activeDoc: null,
  content: '',
  version: 0,
  operationQueue: [],
  isSyncing: false,
  hasUnsavedChanges: false,
  isLoadingDoc: false,

  fetchDocuments: async () => {
    const { data } = await api.get('/docs');
    const all = [
      ...(data.data?.owned ?? []),
      ...(data.data?.collaborated ?? []),
    ];
    set({ documents: all });
  },

  fetchDocument: async (id) => {
    set({ isLoadingDoc: true });
    try {
      const { data } = await api.get(`/docs/${id}`);
      const doc: Document = data.data;
      const docContent: string = data.data?.content ?? '';
      set((s) => ({
        activeDoc: doc,
        content: docContent,
        version: doc.currentVersion,
        operationQueue: [],
        hasUnsavedChanges: false,
        isLoadingDoc: false,
        // also upsert into list if not already there
        documents: s.documents.some((d) => d._id === id)
          ? s.documents.map((d) => (d._id === id ? doc : d))
          : [doc, ...s.documents],
      }));
      return doc;
    } catch {
      set({ isLoadingDoc: false });
      return null;
    }
  },

  createDocument: async (title) => {
    const { data } = await api.post('/docs', { title });
    const doc = data.data;
    set((s) => ({ documents: [doc, ...s.documents] }));
    return doc;
  },

  openDocument: (doc) => {
    if (!doc) return;
    set({ activeDoc: doc, content: '', version: doc.currentVersion, operationQueue: [], hasUnsavedChanges: false });
  },

  deleteDocument: async (docId) => {
    await api.delete(`/docs/${docId}`);
    set((s) => ({
      documents: s.documents.filter((d) => d._id !== docId),
      activeDoc: s.activeDoc?._id === docId ? null : s.activeDoc,
    }));
  },

  setContent: (content) => set({ content, hasUnsavedChanges: true }),

  setVersion: (version) => set({ version }),

  enqueueOperation: (op) =>
    set((s) => ({ operationQueue: [...s.operationQueue, op] })),

  clearQueue: () => set({ operationQueue: [] }),

  setSyncing: (isSyncing) => set({ isSyncing }),

  setUnsaved: (hasUnsavedChanges) => set({ hasUnsavedChanges }),

  updateDocTitle: (docId, title) =>
    set((s) => ({
      documents: s.documents.map((d) => (d._id === docId ? { ...d, title } : d)),
      activeDoc: s.activeDoc?._id === docId ? { ...s.activeDoc, title } : s.activeDoc,
    })),
}));

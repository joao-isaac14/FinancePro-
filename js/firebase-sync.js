/**
 * firebase-sync.js - Gerenciador de Autenticação e Sincronização em Tempo Real com o Google Firebase
 */

class FirebaseSyncManager {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.unsubscribeFirestore = null;
    this.isSyncing = false;
    this.syncListeners = [];
    this.authListeners = [];

    // Chave de armazenamento da configuração personalizada
    this.CONFIG_STORAGE_KEY = 'finance_pro_firebase_config';

    this.init();
  }

  // Obter configuração do Firebase
  getFirebaseConfig() {
    const saved = localStorage.getItem(this.CONFIG_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler configuração salva do Firebase:', e);
      }
    }
    return null;
  }

  saveFirebaseConfig(config) {
    if (!config || !config.apiKey || !config.projectId) {
      throw new Error('Configuração inválida. Informe ao menos apiKey e projectId.');
    }
    localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(config));
    this.init();
  }

  init() {
    const config = this.getFirebaseConfig();
    if (!config || typeof firebase === 'undefined') {
      this.updateSyncStatus('unconfigured', 'Nuvem não configurada');
      return;
    }

    try {
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(config);
      } else {
        this.app = firebase.app();
      }

      this.auth = firebase.auth();
      this.db = firebase.firestore();

      // Habilitar persistência offline no Firestore
      try {
        this.db.enablePersistence({ synchronizeTabs: true }).catch(err => {
          if (err.code === 'failed-precondition') {
            console.warn('Persistência Firestore: Múltiplas abas abertas');
          } else if (err.code === 'unimplemented') {
            console.warn('Persistência Firestore não suportada neste navegador');
          }
        });
      } catch (e) {
        // Ignora se já estiver ativo
      }

      // Escutar mudanças no estado de autenticação
      this.auth.onAuthStateChanged(user => {
        this.currentUser = user;
        this.notifyAuthListeners(user);

        if (user) {
          this.updateSyncStatus('syncing', 'Sincronizando dados...');
          this.startRealtimeListener(user.uid);
        } else {
          if (this.unsubscribeFirestore) {
            this.unsubscribeFirestore();
            this.unsubscribeFirestore = null;
          }
          this.updateSyncStatus('offline', 'Desconectado');
        }
      });

    } catch (err) {
      console.error('Erro ao inicializar Firebase:', err);
      this.updateSyncStatus('error', 'Erro na conexão com Firebase');
    }
  }

  // --- Autenticação ---
  async loginWithEmail(email, password) {
    if (!this.auth) throw new Error('Firebase não configurado');
    return await this.auth.signInWithEmailAndPassword(email.trim(), password);
  }

  async registerWithEmail(email, password, displayName = '') {
    if (!this.auth) throw new Error('Firebase não configurado');
    const cred = await this.auth.createUserWithEmailAndPassword(email.trim(), password);
    if (displayName && cred.user) {
      await cred.user.updateProfile({ displayName: displayName.trim() });
    }
    return cred;
  }

  async loginWithGoogle() {
    if (!this.auth) throw new Error('Firebase não configurado');
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return await this.auth.signInWithPopup(provider);
  }

  async logout() {
    if (!this.auth) return;
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
    await this.auth.signOut();
  }

  async sendPasswordReset(email) {
    if (!this.auth) throw new Error('Firebase não configurado');
    return await this.auth.sendPasswordResetEmail(email.trim());
  }

  // --- Sincronização em Tempo Real (Firestore) ---
  startRealtimeListener(uid) {
    if (!this.db) return;

    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
    }

    const docRef = this.db.collection('finance_users').doc(uid);

    this.unsubscribeFirestore = docRef.onSnapshot((docSnapshot) => {
      if (docSnapshot.exists) {
        const cloudData = docSnapshot.data();
        if (cloudData && !this.isLocalSaving) {
          // Atualiza o estado local sem disparar loop de envio
          if (window.State && typeof window.State.loadFromCloud === 'function') {
            window.State.loadFromCloud(cloudData);
          }
          this.updateSyncStatus('synced', 'Sincronizado na Nuvem');
        }
      } else {
        // Primeiro login: envia os dados locais existentes para o Firestore
        if (window.State && window.State.data) {
          this.saveToCloud(window.State.data);
        }
      }
    }, (error) => {
      console.error('Erro no listener do Firestore:', error);
      this.updateSyncStatus('error', 'Erro ao sincronizar');
    });
  }

  async saveToCloud(data) {
    if (!this.db || !this.currentUser) return;

    try {
      this.isLocalSaving = true;
      this.updateSyncStatus('syncing', 'Salvando na nuvem...');

      const docRef = this.db.collection('finance_users').doc(this.currentUser.uid);
      
      const payload = {
        categories: data.categories || [],
        accounts: data.accounts || [],
        goals: data.goals || [],
        transactions: data.transactions || [],
        lastUpdated: new Date().toISOString(),
        userEmail: this.currentUser.email || ''
      };

      await docRef.set(payload, { merge: true });
      this.updateSyncStatus('synced', 'Sincronizado na Nuvem');
    } catch (err) {
      console.error('Erro ao salvar no Firestore:', err);
      this.updateSyncStatus('error', 'Erro ao salvar na nuvem');
    } finally {
      setTimeout(() => {
        this.isLocalSaving = false;
      }, 500);
    }
  }

  // --- Notificações e Listeners ---
  onAuthChange(callback) {
    this.authListeners.push(callback);
    if (this.currentUser !== undefined) {
      callback(this.currentUser);
    }
  }

  notifyAuthListeners(user) {
    this.authListeners.forEach(cb => {
      try { cb(user); } catch (e) { console.error(e); }
    });
  }

  onSyncStatusChange(callback) {
    this.syncListeners.push(callback);
  }

  updateSyncStatus(status, message) {
    this.syncStatus = { status, message };
    this.syncListeners.forEach(cb => {
      try { cb(status, message); } catch (e) { console.error(e); }
    });
  }
}

// Instância Global
window.FirebaseSync = new FirebaseSyncManager();

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBOGmGLZxrOrK5yJ2kjioDM2QUEKL9Y4Js",
  authDomain: "financepro-fdaff.firebaseapp.com",
  projectId: "financepro-fdaff",
  storageBucket: "financepro-fdaff.firebasestorage.app",
  messagingSenderId: "423055355623",
  appId: "1:423055355623:web:4ec9c7a2b78a9040bbbc42",
  measurementId: "G-SMG7Z5F50D"
};

class FirebaseSyncManager {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.unsubscribeFirestore = null;
    this.isSyncing = false;
    this.isLocalSaving = false;
    this.syncListeners = [];
    this.authListeners = [];
    this.familyListeners = [];

    // Cofre compartilhado / Família
    this.myFamilyCode = null;
    this.linkedSyncId = localStorage.getItem('finance_pro_family_sync_id') || null;
    this.linkedCode = localStorage.getItem('finance_pro_family_code_display') || null;

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
    return DEFAULT_FIREBASE_CONFIG;
  }

  saveFirebaseConfig(config) {
    if (!config || !config.apiKey || !config.projectId) {
      throw new Error('Configuração inválida. Informe ao menos apiKey e projectId.');
    }
    localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(config));
    this.init();
  }

  generateFamilyCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'FP-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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
      this.auth.onAuthStateChanged(async user => {
        this.currentUser = user;
        this.notifyAuthListeners(user);

        if (user) {
          this.updateSyncStatus('syncing', 'Sincronizando dados...');
          await this.loadUserProfile(user);
          const activeSyncId = this.getActiveSyncId();
          this.startRealtimeListener(activeSyncId);
        } else {
          if (this.unsubscribeFirestore) {
            this.unsubscribeFirestore();
            this.unsubscribeFirestore = null;
          }
          this.myFamilyCode = null;
          this.updateSyncStatus('offline', 'Desconectado');
          this.notifyFamilyListeners();
        }
      });

    } catch (err) {
      console.error('Erro ao inicializar Firebase:', err);
      this.updateSyncStatus('error', 'Erro na conexão com Firebase');
    }
  }

  // --- Perfil e Cofre de Família ---
  async loadUserProfile(user) {
    if (!this.db || !user) return;

    try {
      // 1. Verificar se o usuário já possui vínculo com cofre compartilhado no Firestore
      const profileDoc = await this.db.collection('finance_user_profiles').doc(user.uid).get();
      if (profileDoc.exists) {
        const data = profileDoc.data();
        if (data.linkedSyncId) {
          this.linkedSyncId = data.linkedSyncId;
          this.linkedCode = data.linkedCode || '';
          localStorage.setItem('finance_pro_family_sync_id', this.linkedSyncId);
          localStorage.setItem('finance_pro_family_code_display', this.linkedCode);
        }
      }

      // 2. Garantir que este usuário possua seu próprio código de família gerado
      const userDoc = await this.db.collection('finance_users').doc(user.uid).get();
      if (userDoc.exists && userDoc.data()?.familyCode) {
        this.myFamilyCode = userDoc.data().familyCode;
      } else {
        const newCode = this.generateFamilyCode();
        this.myFamilyCode = newCode;
        // Salva mapeamento público do código para o UID do usuário
        await this.db.collection('finance_family_shares').doc(newCode).set({
          targetUid: user.uid,
          ownerEmail: user.email || '',
          ownerName: user.displayName || '',
          createdAt: new Date().toISOString()
        }, { merge: true });
        // Registra o código no documento do usuário
        await this.db.collection('finance_users').doc(user.uid).set({
          familyCode: newCode
        }, { merge: true });
      }

      this.notifyFamilyListeners();
    } catch (err) {
      console.warn('Aviso ao carregar perfil de família:', err);
    }
  }

  getActiveSyncId() {
    const linked = localStorage.getItem('finance_pro_family_sync_id') || this.linkedSyncId;
    if (linked) return linked;
    return this.currentUser ? this.currentUser.uid : null;
  }

  isLinkedToFamily() {
    const active = this.getActiveSyncId();
    return Boolean(active && this.currentUser && active !== this.currentUser.uid);
  }

  getFamilyCodeDisplay() {
    if (this.isLinkedToFamily()) {
      return localStorage.getItem('finance_pro_family_code_display') || this.linkedCode || 'Cofre Compartilhado';
    }
    return this.myFamilyCode || '...';
  }

  getCurrentUserLabel() {
    if (!this.currentUser) return '';
    return this.currentUser.displayName || (this.currentUser.email ? this.currentUser.email.split('@')[0] : '');
  }

  async connectToFamilyCode(code) {
    if (!this.db || !this.currentUser) throw new Error('Você precisa estar conectado à sua conta.');
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) throw new Error('Por favor, digite o código da família.');

    let targetUid = null;

    // 1. Buscar no mapeamento de códigos de família
    try {
      const shareDoc = await this.db.collection('finance_family_shares').doc(cleanCode).get();
      if (shareDoc.exists && shareDoc.data()?.targetUid) {
        targetUid = shareDoc.data().targetUid;
      }
    } catch (e) {
      console.warn('Busca de código em finance_family_shares:', e);
    }

    // 2. Se não achou, tentar direto como UID
    if (!targetUid) {
      try {
        const userDoc = await this.db.collection('finance_users').doc(cleanCode).get();
        if (userDoc.exists) {
          targetUid = cleanCode;
        }
      } catch (e) {
        console.warn('Busca direta por UID:', e);
      }
    }

    if (!targetUid) {
      throw new Error('Código de família não encontrado. Verifique se o código foi digitado corretamente.');
    }

    if (targetUid === this.currentUser.uid) {
      throw new Error('Este código pertence à sua própria conta atual.');
    }

    this.linkedSyncId = targetUid;
    this.linkedCode = cleanCode;
    localStorage.setItem('finance_pro_family_sync_id', targetUid);
    localStorage.setItem('finance_pro_family_code_display', cleanCode);

    // Salvar no perfil para manter a persistência entre dispositivos
    try {
      await this.db.collection('finance_user_profiles').doc(this.currentUser.uid).set({
        linkedSyncId: targetUid,
        linkedCode: cleanCode,
        linkedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Erro ao salvar finance_user_profiles:', e);
    }

    // Reiniciar o listener em tempo real para o cofre compartilhado
    this.startRealtimeListener(targetUid);
    this.notifyFamilyListeners();
    return { success: true, targetUid, code: cleanCode };
  }

  async disconnectFromFamily() {
    if (!this.db || !this.currentUser) return;
    this.linkedSyncId = null;
    this.linkedCode = null;
    localStorage.removeItem('finance_pro_family_sync_id');
    localStorage.removeItem('finance_pro_family_code_display');

    try {
      await this.db.collection('finance_user_profiles').doc(this.currentUser.uid).delete();
    } catch (e) {
      console.warn('Erro ao limpar finance_user_profiles:', e);
    }

    // Voltar para o cofre individual do próprio usuário
    this.startRealtimeListener(this.currentUser.uid);
    this.notifyFamilyListeners();
    return { success: true };
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
    this.myFamilyCode = null;
    await this.auth.signOut();
  }

  async sendPasswordReset(email) {
    if (!this.auth) throw new Error('Firebase não configurado');
    return await this.auth.sendPasswordResetEmail(email.trim());
  }

  // --- Sincronização em Tempo Real (Firestore) ---
  startRealtimeListener(targetId) {
    if (!this.db || !targetId) return;

    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }

    const docRef = this.db.collection('finance_users').doc(targetId);

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
        // Primeiro login / cofre novo
        if (targetId === this.currentUser?.uid && window.State && window.State.data) {
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
    const targetId = this.getActiveSyncId();
    if (!targetId) return;

    try {
      this.isLocalSaving = true;
      this.updateSyncStatus('syncing', 'Salvando na nuvem...');

      const docRef = this.db.collection('finance_users').doc(targetId);
      
      const payload = {
        categories: data.categories || [],
        accounts: data.accounts || [],
        goals: data.goals || [],
        transactions: data.transactions || [],
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: this.getCurrentUserLabel() || this.currentUser.email || 'Membro'
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

  onFamilyChange(callback) {
    this.familyListeners.push(callback);
    if (this.currentUser) {
      callback();
    }
  }

  notifyFamilyListeners() {
    this.familyListeners.forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
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

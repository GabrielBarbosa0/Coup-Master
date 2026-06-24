// =======================================================
// === FIREBASE CONFIGURATION & INITIALIZATION ===
// =======================================================

/**
 * NOTA DE SEGURANÇA: As chaves do Firebase para Web são identificadores públicos.
 * A segurança deste projeto é garantida via Firebase Security Rules (RTDB),
 * impedindo acessos não autorizados mesmo com a chave exposta.
 */

const firebaseConfig = {
    apiKey: "AIzaSyAPlfxNJHgZ9rYW9qxC0uRxBkrjqLKefaM",
    authDomain: "coup-master.firebaseapp.com",
    databaseURL: "https://coup-master-default-rtdb.firebaseio.com",
    projectId: "coup-master",
    storageBucket: "coup-master.firebasestorage.app",
    messagingSenderId: "876117110623",
    appId: "1:876117110623:web:dbcf9de97d8287adb550ea",
    measurementId: "G-ZKYDKRFTE8"
};

// 1. Inicializa o Firebase apenas se não tiver sido inicializado ainda
if (!firebase.apps.length) {
    if (!firebaseConfig.apiKey) {
        console.error("Firebase config is missing!");
        alert("Erro: configuração do Firebase ausente.");
    } else {
        firebase.initializeApp(firebaseConfig);
    }
}

// 2. Disponibiliza o Banco de Dados e a Autenticação globalmente
// Usar 'window.' garante que os outros arquivos (lobby.js, gameState.js) consigam enxergar essas variáveis
window.db = firebase.database();
window.auth = firebase.auth();

console.log("🔥 Firebase inicializado com sucesso via firebase.js");
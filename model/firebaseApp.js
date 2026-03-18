import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// TODO: Replace the placeholder values with your Firebase project configuration.
const firebaseConfig = {
  apiKey: "AIzaSyCBpyWP-Y39VEpWU-Ny0C8fVvTCF0JD1ow",
  authDomain: "ecommercepcpecas.firebaseapp.com",
  projectId: "ecommercepcpecas",
  storageBucket: "ecommercepcpecas.firebasestorage.app",
  messagingSenderId: "1049535150588",
  appId: "1:1049535150588:web:abd5f095931427a55c9a79",
  measurementId: "G-36QE38R6MZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const dataconnectConfig = {
  projectId: firebaseConfig.projectId,
  location: "southamerica-east1",
  serviceId: "ecommercepcpecas-service",
  emulator: {
    enabled: false,
    host: "localhost:50001"
  }
};

const backendConfig = {
  baseUrl: "http://localhost:3000"
};

export { app, auth, firebaseConfig, dataconnectConfig, backendConfig };

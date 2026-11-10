// Cifra i documenti della squadra per la distinta: il sito è pubblico, quindi i numeri dei documenti
// stanno in assets/documenti.json solo cifrati (AES-GCM, chiave dalla parola d'ordine con PBKDF2).
// L'originale in chiaro NON va nel repository: tienilo fuori (es. nella cartella asset/, che è ignorata).
// Formato dell'originale: { "Cognome Nome": { "tipo": "C.I.", "numero": "..." }, ... } con cognome e nome
// scritti come nella rosa del sito (es. "Reis Brito Filipe").
// Uso: PAROLA='parola d ordine' node tools/cifra_documenti.mjs <originale.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const ITERAZIONI = 1000000; // lento apposta: rende costoso provare a indovinare la parola d'ordine
const [, , sorgente] = process.argv;
const parola = process.env.PAROLA;
if (!sorgente || !parola) {
  console.error("Uso: PAROLA='parola d ordine' node tools/cifra_documenti.mjs <originale.json>");
  process.exit(1);
}
const chiaro = JSON.stringify(JSON.parse(readFileSync(sorgente, 'utf8')));
const sale = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(parola), 'PBKDF2', false, ['deriveKey']);
const chiave = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt: sale, iterations: ITERAZIONI, hash: 'SHA-256' },
  base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const cifrato = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chiave, new TextEncoder().encode(chiaro));
const b64 = (b) => Buffer.from(b).toString('base64');
const uscita = new URL('../assets/documenti.json', import.meta.url);
writeFileSync(uscita, JSON.stringify({ iterazioni: ITERAZIONI, sale: b64(sale), iv: b64(iv), dati: b64(cifrato) }) + '\n');
console.log('scritto', uscita.pathname, '·', Object.keys(JSON.parse(chiaro)).length, 'persone');

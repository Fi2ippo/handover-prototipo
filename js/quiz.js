/* =========================================================
   HANDOVER — Momento 02 "Quale fa per me?": il quiz

   La pagina ha tre schermate e se ne vede una alla volta:
     inizio  → "Quale fa per me?" + pulsante Inizia
     quiz    → una domanda alla volta, con Indietro e Avanti
     risultati → le schede (le disegna js/risultati.js)

   Cosa resta salvato nel browser (localStorage):
     "handover-quiz"      → dove sei arrivato: schermata, numero della domanda, risposte date finora
     "handover-risposte"  → le risposte finali, quando hai finito il quiz (le legge la pagina dei risultati)
   Così, se ricarichi la pagina, riparti dalla domanda dove eri.
   ========================================================= */

const CHIAVE_AVANZAMENTO = "handover-quiz", CHIAVE_RISPOSTE = "handover-risposte";
let DATI = null;            // { mete, paesi, quiz } letti da /dati
let passo = 0;              // la domanda in cui sei (0 = la prima)
let bozza = {};             // le risposte date finora

// Salvare e leggere nel browser. Dentro try/catch: in una finestra privata o con i dati del sito bloccati
// localStorage può non funzionare, e in quel caso il quiz va avanti lo stesso (solo, non ricorda).
function salva(chiave, valore) { try { localStorage.setItem(chiave, JSON.stringify(valore)); } catch {} }
function leggi(chiave) { try { return JSON.parse(localStorage.getItem(chiave)); } catch { return null; } }
const ricordaDoveSei = schermata => salva(CHIAVE_AVANZAMENTO, { schermata, passo, risposte: bozza });

const ordine = () => DATI.quiz.ordine;
const domandaDi = k => DATI.quiz.domande[k];

// Una risposta è valida se esiste tra le opzioni di quiz.json (serve se i dati cambiano e il browser ricorda risposte vecchie)
function rispostaValida(k, v) {
  const op = domandaDi(k).opzioni;
  return domandaDi(k).multipla ? Array.isArray(v) && v.length > 0 && v.every(x => x in op) : typeof v === "string" && v in op;
}
const tutteValide = r => !!r && ordine().every(k => rispostaValida(k, r[k]));
// Tiene solo le risposte che esistono ancora
const pulisci = r => Object.fromEntries(ordine().filter(k => r && rispostaValida(k, r[k])).map(k => [k, r[k]]));


/* ——— Le tre schermate ——— */
function mostra(schermata, sposta = true) {
  ["inizio", "quiz", "risultati"].forEach(id => { $(id).hidden = id !== schermata; });
  if (!sposta) return;                                   // al primo caricamento non sposto né scorro niente
  scrollTo({ top: 0, behavior: "instant" });
  // Il cursore va sul titolo della schermata nuova: chi usa la tastiera o un lettore di schermo sa dov'è
  ({ inizio: () => $("t-inizio"), quiz: () => $("domanda").querySelector("legend"), risultati: () => $("t-risultati") })[schermata]().focus();
}

function vaiAllInizio(sposta) {
  const nomi = DATI.mete.mete, salvate = (leggiSalvato("handover-momento-01") || DATI.quiz.provaMomento01).meteSalvate;
  const citta = salvate.map(id => nomi.find(m => m.id === id)).filter(Boolean).map(m => m.citta);
  $("presenta").textContent = ordine().length + " domande su soldi, studio e tempo libero. " +
    (citta.length ? "Poi mettiamo a confronto con le tue risposte le mete che hai guardato: " + elenco(citta) + "." : "Poi ti mostriamo le mete più vicine a quello che cerchi.");
  ricordaDoveSei("inizio");
  mostra("inizio", sposta);
}

function vaiAllaDomanda(n, sposta = true) {
  passo = Math.max(0, Math.min(n, ordine().length - 1));
  disegnaDomanda();
  ricordaDoveSei("quiz");
  mostra("quiz", sposta);
}

function vaiAiRisultati(risposte, sposta = true) {
  disegnaRisultati(DATI, risposte);
  ricordaDoveSei("risultati");
  mostra("risultati", sposta);                         // prima la mostro…
  sistemaSchede();                                     // …poi pareggio le altezze e accorcio i nomi lunghi (servono schede visibili)
  $("modifica").addEventListener("click", () => {      // "Modifica risposte": riapro il quiz con le risposte già scelte
    bozza = { ...risposte };
    vaiAllaDomanda(0);
  });
}


/* ——— Una domanda ——— */
function disegnaDomanda() {
  const k = ordine()[passo], d = domandaDi(k), totale = ordine().length, ultima = passo === totale - 1;
  const tipo = d.multipla ? "checkbox" : "radio", scelte = [].concat(bozza[k] || []);
  $("contatore").textContent = "DOMANDA " + (passo + 1) + " DI " + totale;
  $("riempi").style.width = ((passo + 1) / totale * 100) + "%";
  $("domanda").innerHTML =
    '<legend tabindex="-1">' + d.domanda + '</legend>' +
    (d.aiuto ? '<p class="aiuto">' + d.aiuto + '</p>' : "") +
    '<div class="opzioni">' + Object.entries(d.opzioni).map(([valore, o]) =>
      '<label class="opzione"><input type="' + tipo + '" name="' + k + '" value="' + valore + '"' + (scelte.includes(valore) ? " checked" : "") + '>' +
      '<span>' + maiuscola(o.chip) + '</span></label>').join("") + '</div>';
  $("avviso").textContent = "";
  $("avanti").innerHTML = (ultima ? "Vedi i risultati" : "Avanti") + ' <span aria-hidden="true">→</span>';
  // Ogni volta che scegli qualcosa la risposta viene ricordata subito
  $("domanda").querySelectorAll("input").forEach(i => i.addEventListener("change", () => {
    const fatte = [...$("domanda").querySelectorAll("input:checked")].map(x => x.value);
    if (d.multipla) bozza[k] = fatte; else bozza[k] = fatte[0];
    if (fatte.length) $("avviso").textContent = "";
    ricordaDoveSei("quiz");
  }));
}

// Avanti (anche con il tasto Invio): se manca la risposta lo dico, altrimenti vado avanti o ai risultati
$("quiz").addEventListener("submit", e => {
  e.preventDefault();
  const k = ordine()[passo];
  if (!rispostaValida(k, bozza[k])) {
    $("avviso").textContent = domandaDi(k).multipla ? "Scegline almeno una per andare avanti." : "Scegli una risposta per andare avanti.";
    return;
  }
  if (passo < ordine().length - 1) return vaiAllaDomanda(passo + 1);
  const risposte = pulisci(bozza);
  salva(CHIAVE_RISPOSTE, risposte);
  vaiAiRisultati(risposte);
});

// Indietro: alla domanda precedente; dalla prima, alla schermata iniziale
$("indietro").addEventListener("click", () => passo > 0 ? vaiAllaDomanda(passo - 1) : vaiAllInizio(true));
$("inizia").addEventListener("click", () => vaiAllaDomanda(0));
// "Prova con un esempio": le risposte di prova (quiz.json → risposteDiProva) e subito i risultati.
// Le salvo come risposte vere: "Modifica risposte" riapre il quiz con queste già selezionate.
$("esempio").addEventListener("click", () => {
  const risposte = pulisci(DATI.quiz.risposteDiProva);
  bozza = { ...risposte };
  salva(CHIAVE_RISPOSTE, risposte);
  vaiAiRisultati(risposte);
});


/* ——— Avvio: carico i dati e riapro la schermata dove eri rimasto ——— */
const carica = file => fetch(file).then(r => { if (!r.ok) throw new Error(file); return r.json(); });

Promise.all([carica("dati/mete.json"), carica("dati/paesi.json"), carica("dati/quiz.json")]).then(([mete, paesi, quiz]) => {
  DATI = { mete, paesi, quiz };
  const dove = leggi(CHIAVE_AVANZAMENTO) || {}, finali = leggi(CHIAVE_RISPOSTE);
  bozza = pulisci(dove.risposte || finali || {});
  if (dove.schermata === "quiz") vaiAllaDomanda(Number(dove.passo) || 0, false);
  else if (dove.schermata !== "inizio" && tutteValide(finali)) vaiAiRisultati(finali, false);
  else vaiAllInizio(false);
}, () => {
  // Niente pagina vuota: se i dati non arrivano, lo dico chiaramente
  // (questa parte scatta solo se un file di /dati non si carica, non per altri errori)
  ["inizio", "quiz", "risultati"].forEach(id => { $(id).hidden = true; });
  $("errore").hidden = false;
});

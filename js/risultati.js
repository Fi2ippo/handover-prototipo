/* =========================================================
   HANDOVER — Momento 02 "Quale fa per me?": i calcoli e le schede dei risultati
   (il quiz, le schermate e il caricamento dei dati sono in js/quiz.js)

   Da dove arrivano le cose:
   - le mete e i loro dati          → dati/mete.json
   - nomi e colori dei paesi        → dati/paesi.json
   - domande, regole dei giudizi    → dati/quiz.json
   - le risposte dello studente     → dal quiz (js/quiz.js), che le salva nel browser ("handover-risposte")
   - partenza e mete salvate        → dal momento 01 (chiave "handover-momento-01");
                                      finché non esiste: quiz.json → provaMomento01
   ========================================================= */

const $ = id => document.getElementById(id);


/* ——— 1. Piccoli strumenti per scrivere i testi ——— */

const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");          // 1000 → "1.000"
const maiuscola = s => s.charAt(0).toUpperCase() + s.slice(1);
const tinta = c => "color-mix(in srgb," + c + " 38%,white)";                // colori della bandiera, schiariti
const racconti = n => n === 0 ? "nessun racconto" : n + (n === 1 ? " racconto" : " racconti");
// Ore di luce: 9.5 → "9 ore e mezza", 10 → "10 ore"
const ore = h => { const intere = Math.floor(h); return intere + (intere === 1 ? " ora" : " ore") + (h - intere >= .5 ? " e mezza" : ""); };
// Elenco all'italiana: "a", "a e b", "a, b e c" (con "ed" davanti a "è" o "e")
function elenco(parti) {
  if (parti.length <= 1) return parti[0] || "";
  const ultima = parti[parti.length - 1], prima = parti.slice(0, -1).join(", ");
  return prima + (/^[eè]/i.test(ultima) ? " ed " : " e ") + ultima;
}
// Legge qualcosa salvato nel browser (se non c'è o non si può leggere: null)
function leggiSalvato(chiave) { try { return JSON.parse(localStorage.getItem(chiave)); } catch { return null; } }


/* ——— 2. I giudizi di una meta, a partire dalle risposte ———
   Ogni voce ha: valore (cosa si mostra), g (giudizio: "si" / "medio" / "no"), testo (la parola del giudizio). */
function giudica(meta, risposte, Q, PAESI) {
  const D = Q.domande, R = Q.regole, g = {};

  // Costo al mese: dentro il budget / fino a 100 € sopra / oltre
  const max = D.budget.opzioni[risposte.budget].max;
  const gc = max === null || meta.costoMese <= max ? "si" : meta.costoMese <= max + R.costo.tolleranzaAlLimite ? "medio" : "no";
  g.costo = { voce: "Costo al mese", valore: fmt(meta.costoMese) + " €", g: gc, testo: R.costo[gc] };

  // Lezioni: il livello d'inglese della meta confrontato con la lingua che vuoi
  const L = D.lingua.opzioni[risposte.lingua], livello = meta.lezioniInInglese;
  const gl = L.vaBene.includes(livello) ? "si" : L.daVerificare.includes(livello) ? "medio" : "no";
  const lingua = PAESI[meta.paese].lingua.toLowerCase();
  g.lezioni = { voce: "Lezioni", valore: Q.livelliLezioni[livello].replace("{lingua}", lingua), g: gl, testo: R.lezioni[gl] };

  // Esami riconosciuti: fasce 9–10 / 7–8 / 5–6 / sotto. Se conta di più l'esperienza: sempre neutro
  const fascia = R.esami.find(f => meta.esamiRiconosciuti >= f.da);
  const ge = D.esami.opzioni[risposte.esami].neutro ? "medio" : fascia.giudizio;
  // "neutro": se conta di più l'esperienza, gli esami non pesano né sull'affinità né su "In breve"
  g.esami = { voce: "Esami riconosciuti", valore: meta.esamiRiconosciuti + " su 10", g: ge, testo: fascia.testo, neutro: !!D.esami.opzioni[risposte.esami].neutro };

  // Vita e tempo libero: quante delle attività che hai scelto ci sono
  const scelte = risposte.attivita || [], A = D.attivita.opzioni;
  const ci = scelte.filter(a => meta.attivita.includes(a)), mancano = scelte.filter(a => !meta.attivita.includes(a));
  const gv = ci.length === scelte.length ? "si" : ci.length ? "medio" : "no";
  const valoreVita = [elenco(ci.map(a => A[a].presente)), mancano.map(a => A[a].assente).join(", ")].filter(Boolean).join(", ");
  g.vita = { voce: "Vita e tempo libero", valore: maiuscola(valoreVita || "—"), g: gv, testo: R.vita[gv] };

  // Clima (non è una riga, ma conta per l'affinità e per "In breve"): media delle massime nei tuoi mesi
  const C = D.clima.opzioni[risposte.clima];
  if ("min" in C) {
    const mesi = D.semestre.opzioni[risposte.semestre].mesi.map(n => meta.mesi[n - 1].temperatura);
    const media = mesi.reduce((a, b) => a + b, 0) / mesi.length;
    g.clima = { g: (C.min === null || media >= C.min) && (C.max === null || media < C.max) ? "si" : "no" };
  }
  return g;
}

// Affinità: punti di ogni voce (✓ 2, ~ 1, ✕ 0) diviso il massimo possibile → da 0 a 1 (le voci neutre non contano)
function affinita(g, R) {
  const voci = Object.values(g).filter(v => !v.neutro);
  return voci.reduce((t, v) => t + R.punti[v.g], 0) / (voci.length * R.punti.si);
}

/* Le due funzioni qui sotto ("In breve" e "Nei tuoi mesi") oggi NON sono usate dalle schede:
   quelle informazioni andranno nella pagina della città. Restano qui, già provate, per quando servirà. */

// "In breve": i punti forti (✓) e quelli deboli (~ / ✕) di questa meta, con le frasi scritte per lei in mete.json.
// Fino a 2 forti + 2 deboli (3 forti se non ci sono deboli), al massimo 15 parole.
function inBreve(meta, g, R) {
  const ordine = ["costo", "lezioni", "esami", "vita", "clima"].filter(v => g[v] && !g[v].neutro);
  const frase = (voce, giudizio) => meta.frasi && meta.frasi[voce] && meta.frasi[voce][giudizio];
  let forti = ordine.filter(v => g[v] && g[v].g === "si" && frase(v, "si")).map(v => frase(v, "si"));
  let deboli = ordine.filter(v => g[v] && g[v].g !== "si" && frase(v, g[v].g)).map(v => frase(v, g[v].g));
  // Se la meta non ha frasi sue per un punto forte o debole, uso una frase generica
  if (!forti.length) { const v = ordine.find(v => g[v] && g[v].g === "si"); if (v) forti = [R.frasiGeneriche[v].si]; }
  if (!deboli.length) { const v = ordine.find(v => g[v] && g[v].g === "no") || ordine.find(v => g[v] && g[v].g === "medio"); if (v) deboli = [R.frasiGeneriche[v][g[v].g]]; }

  const B = R.breve;
  forti = forti.slice(0, deboli.length ? B.maxForti : B.maxFortiSenzaDeboli);
  deboli = deboli.slice(0, B.maxDeboli);
  const componi = () => { const a = elenco(forti), b = elenco(deboli); return maiuscola(a && b ? a + ", ma " + b : a || b) + "."; };
  let testo = componi();
  while (testo.split(/\s+/).length > B.maxParole && (forti.length > 1 || deboli.length > 1)) {
    if (deboli.length > 1) deboli = deboli.slice(0, -1); else forti = forti.slice(0, -1);
    testo = componi();
  }
  return testo;
}

// "Nei tuoi mesi": temperatura dal primo all'ultimo mese, luce a dicembre/febbraio, una nota da sapere
function neiTuoiMesi(meta, risposte, Q) {
  const S = Q.domande.semestre.opzioni[risposte.semestre];
  const mesi = S.mesi.map(n => meta.mesi[n - 1]), primo = mesi[0], ultimo = mesi[mesi.length - 1];
  const luce = meta.mesi[S.meseLuce - 1];
  return {
    periodo: (primo.mese + "–" + ultimo.mese).toUpperCase(),
    temperatura: primo.temperatura + " → " + ultimo.temperatura + " °C",
    luceEtichetta: "Luce a " + luce.mese,
    luce: ore(luce.luce),
    daSapere: (mesi.find(m => m.importante) || primo).daSapere
  };
}


// Temperatura nei tuoi mesi, per la riga di fondo della scheda: primo mese → ultimo mese ("28→16 °C")
function temperatura(meta, risposte, Q) {
  const mesi = Q.domande.semestre.opzioni[risposte.semestre].mesi;
  return meta.mesi[mesi[0] - 1].temperatura + "→" + meta.mesi[mesi[mesi.length - 1] - 1].temperatura + " °C";
}


/* ——— 3. L'HTML delle schede (il riferimento ora è questa pagina; il vecchio è in riferimenti/) ———
   Ogni scheda: testata con bandiera (paese · università, città, livello), 4 voci con l'esito Sì / In parte / No,
   riga di fondo (costo al mese e temperatura), cuore per le preferite. Nient'altro.
   S = i testi delle schede (quiz.json → schede). */

const coloriBandiera = (el, paese) => paese.coloriBandiera.forEach((c, i) => el.style.setProperty("--f" + (i + 1), tinta(c)));
const linkCitta = meta => "citta.html?id=" + meta.id;
const VOCI = ["costo", "lezioni", "esami", "vita"];
const CUORE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';

// L'esito di una voce: ✓ → "Sì" (pallino pieno), ~ → "In parte" (cerchio vuoto), ✕ → "No" (quadrato).
// Gli esami di chi ha scelto "Conta di più l'esperienza" → "Non è una priorità" (lineetta grigia).
// Prima dell'esito, nascosto, "Per te:": il lettore di schermo legge "Budget, per te: sì".
const chiaveEsito = voce => voce.neutro ? "neutro" : voce.g;
const esitoHtml = (voce, S) => { const e = S.esiti[chiaveEsito(voce)];
  return '<span class="esito ' + e.classe + '"><i aria-hidden="true"></i><span class="sr">' + S.perTe + '</span>' + e.testo + '</span>'; };
// Stessi nomi delle voci in tutte le schede, consigliata compresa
const vociHtml = (g, S) => '<ul class="voci">' + VOCI.map(v => '<li>' + S.voci[v] + ' ' + esitoHtml(g[v], S) + '</li>').join("") + '</ul>';
// Legenda sopra le schede: i tre esiti, più "Non è una priorità" solo se compare in qualche scheda
const legendaHtml = (S, conNeutro) => ["si", "medio", "no"].concat(conNeutro ? ["neutro"] : []).map(k =>
  '<span class="esito ' + S.esiti[k].classe + '"><i></i>' + S.esiti[k].testo + '</span>').join("") + '<span>' + S.legenda + '</span>';
const testaHtml = (r, livello) => '<span class="luogo">' + r.paese.nome + ' · ' + r.meta.universita + '</span>' +
  '<h3><a href="' + linkCitta(r.meta) + '">' + r.meta.citta + '</a></h3><p class="livello">' + livello + '</p>';
const piedeHtml = (r, extra, apri) => '<div class="piede"><span><b>' + fmt(r.meta.costoMese) + ' €</b> al mese · ' + r.temperatura + extra + '</span>' +
  '<span class="apri">' + apri + ' →</span></div>';
// Il cuore: aggiunge o toglie la meta dalle preferite. L'aria-label dice cosa succede se lo premi.
const cuoreHtml = meta => '<button type="button" class="cuore" data-c="' + meta.citta + '" aria-pressed="false" aria-label="Aggiungi ' + meta.citta + ' alle preferite">' + CUORE_SVG + '</button>';

function disegnaConsigliata(r, S) {
  $("t-cons").textContent = "Hai pensato a " + r.meta.citta + "?";
  const art = $("consigliata");
  coloriBandiera(art, r.paese);
  art.innerHTML =
    '<div class="testa">' + testaHtml(r, S.livelloConsigliata.replace("{livello}", r.livello.testo)) + '<p class="perche">' + S.perche + '</p></div>' +
    '<div class="destra"><div class="corpo">' + vociHtml(r.g, S) + '</div>' +
      piedeHtml(r, " · " + racconti(r.meta.racconti), S.apri + " " + r.meta.citta) + '</div>' +
    cuoreHtml(r.meta);
  $("sez-consigliata").hidden = false;
}

const schedaHtml = (r, S) => '<article class="scheda">' +
  '<div class="testa">' + testaHtml(r, r.livello.testo) + '</div>' +
  '<div class="corpo">' + vociHtml(r.g, S) + '</div>' +
  piedeHtml(r, "", S.apri) + cuoreHtml(r.meta) +
'</article>';

// Nome dell'università troppo lungo per una riga: il CSS lo accorcia con i puntini e qui metto il nome completo
// nel title. Il title va sulla testata (non sul nome) perché sopra la scheda c'è il link che la copre tutta:
// il mouse "tocca" il link, e il browser mostra il title del primo contenitore che ce l'ha.
function segnaNomiLunghi() {
  document.querySelectorAll(".scheda .luogo").forEach(el => {
    const testa = el.closest(".testa");
    if (el.scrollWidth > el.clientWidth) testa.title = el.textContent; else testa.removeAttribute("title");
  });
}

// Da rifare quando le schede sono visibili, quando arrivano i caratteri e quando la finestra cambia misura
function sistemaSchede() { segnaNomiLunghi(); pareggia(); }

// Pareggia le altezze tra le schede del confronto (testata e ognuna delle 4 voci):
// così le voci restano sulla stessa linea anche se in una scheda un testo va a capo.
function pareggia() {
  const schede = [...document.querySelectorAll(".griglia .scheda")];
  if (schede.length < 2) return;
  const gruppi = [schede.map(x => x.querySelector(".testa"))];
  for (let i = 0; i < VOCI.length; i++) gruppi.push(schede.map(x => x.querySelectorAll(".voci li")[i]));
  gruppi.forEach(g => g.forEach(el => { el.style.minHeight = ""; }));                 // prima tolgo i vecchi valori…
  const altezze = gruppi.map(g => Math.max(...g.map(el => el.getBoundingClientRect().height)));  // …poi misuro tutto…
  gruppi.forEach((g, i) => g.forEach(el => { el.style.minHeight = altezze[i] + "px"; }));       // …e poi applico
}


/* ——— 4. Preferite (il cuore di ogni scheda) ——— */
let preferite = [], LISTA_VUOTA = "";
function mostraPreferite() {
  $("lista").textContent = preferite.length ? preferite.map((x, i) => (i + 1) + ". " + x).join("   ") : LISTA_VUOTA;
  $("vai").setAttribute("aria-disabled", preferite.length ? "false" : "true");
}
function attivaPreferite() {
  document.querySelectorAll(".cuore").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();                                   // il cuore non apre la pagina della città
    const c = b.dataset.c, on = !preferite.includes(c);
    preferite = on ? [...preferite, c] : preferite.filter(x => x !== c);
    b.setAttribute("aria-pressed", on);
    b.setAttribute("aria-label", on ? "Togli " + c + " dalle preferite" : "Aggiungi " + c + " alle preferite");
    mostraPreferite();
  }));
}
// Una volta sola: il pulsante "Porta le preferite in candidatura" non fa niente finché non ce n'è almeno una
$("vai").addEventListener("click", e => { if ($("vai").getAttribute("aria-disabled") === "true") e.preventDefault(); });
addEventListener("resize", sistemaSchede);


/* ——— 5. Disegna i risultati ———
   La chiama js/quiz.js quando hai finito il quiz (o quando torni sulla pagina con le risposte già date).
   dati = { mete, paesi, quiz } letti da /dati; risposte = le tue risposte al quiz. */
function disegnaRisultati(dati, risposte) {
  const datiMete = dati.mete, datiPaesi = dati.paesi, Q = dati.quiz;
  const PAESI = Object.fromEntries(datiPaesi.paesi.map(p => [p.codice, p]));
  Q.livelliLezioni = datiPaesi.livelliLezioni;
  const R = Q.regole, D = Q.domande, S = Q.schede;
  LISTA_VUOTA = S.listaVuota;
  const momento01 = leggiSalvato("handover-momento-01") || Q.provaMomento01;

  // Le tue risposte, in pillole (stesso ordine delle domande: quiz.json → ordine).
  // "Modifica risposte" riapre il quiz con le risposte già selezionate (lo gestisce js/quiz.js)
  $("profilo").innerHTML = Q.ordine.map(k => {
    const v = risposte[k];
    if (Array.isArray(v)) return v.length ? '<span class="chip">' + maiuscola(elenco(v.map(a => D[k].opzioni[a].chip))) + '</span>' : "";
    return v ? '<span class="chip">' + D[k].opzioni[v].chip + '</span>' : "";
  }).join("") + '<button type="button" class="modifica" id="modifica">Modifica risposte</button>';

  // Calcolo tutto per ogni meta
  const risultati = datiMete.mete.map(meta => {
    const g = giudica(meta, risposte, Q, PAESI), punteggio = affinita(g, R);
    return { meta, paese: PAESI[meta.paese], g, punteggio,
             livello: R.livelli.find(l => punteggio >= l.da), temperatura: temperatura(meta, risposte, Q) };
  });

  // Le mete salvate, in ordine di affinità (a parità: l'ordine in cui le hai salvate)
  const salvate = momento01.meteSalvate.map(id => risultati.find(r => r.meta.id === id)).filter(Boolean)
    .sort((a, b) => b.punteggio - a.punteggio);

  // La consigliata: la migliore tra quelle non salvate, solo se è più in linea di tutte le tue
  const altre = risultati.filter(r => !momento01.meteSalvate.includes(r.meta.id)).sort((a, b) => b.punteggio - a.punteggio);
  const migliorSalvata = salvate.length ? salvate[0].punteggio : -1;
  $("sez-consigliata").hidden = true;
  if (altre.length && altre[0].punteggio > migliorSalvata) disegnaConsigliata(altre[0], S);

  // Il confronto
  $("sez-confronto").hidden = !salvate.length;
  if (salvate.length) {
    $("t-mie").textContent = elenco(salvate.map(r => r.meta.citta));
    $("griglia").innerHTML = salvate.map(r => schedaHtml(r, S)).join("");
    $("legenda").innerHTML = legendaHtml(S, salvate.some(r => r.g.esami.neutro));
    document.querySelectorAll(".griglia .scheda").forEach((el, i) => coloriBandiera(el, salvate[i].paese));
  }

  // Le schede sono nuove: le preferite ripartono da zero
  preferite = [];
  mostraPreferite();
  attivaPreferite();
  sistemaSchede();
  document.fonts.ready.then(sistemaSchede);
}

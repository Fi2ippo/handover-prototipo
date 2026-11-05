/* =========================================================
   HANDOVER — Momento 01 "Dove posso andare?"

   Flusso: paese → zoom sul paese → università (cercata o cliccata sulla mappa)
           → area di studio → mappa d'Europa con le mete,
           scheda della città a destra, elenco ordinabile sotto.

   La mappa si usa come Google Maps: si trascina, si ingrandisce con rotellina
   o trackpad, oppure con i pulsanti + / − / Centra e con la tastiera.

   I dati arrivano dai file JSON in /dati (per questo serve Live Server:
   con il doppio clic il browser blocca la lettura dei file JSON).
   ========================================================= */


/* ——— 1. Il "mondo" della mappa ———
   La proiezione mette l'Europa dentro un riquadro di 800 × 600 unità (il "mondo").
   Lo zoom decide quale parte del mondo si vede nell'area della mappa e quanto grande.
   Livello 1 = tutta l'Europa visibile; livello 8 = massimo ingrandimento. */
const W = 800, H = 600;
const LIVELLO_MAX = 8;          // zoom massimo (1x – 8x)
const LIVELLO_NOMI = 2.5;       // da qui in su si vedono i nomi di tutte le città
const meno_movimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;


/* ——— 2. I dati (riempiti quando i JSON sono caricati) ——— */
let PAESI = {};           // per codice ("IT"): { codice, nome, idMappa, lingua, lezioniInInglese, coloriBandiera, costiBase }
let ID_A_CODICE = {};     // dal codice della mappa ("380") al codice del paese ("IT")
let ALTRI_ERASMUS = [];   // codici mappa dei paesi Erasmus+ senza università nei dati
let LEZIONI = {};         // livello di inglese (1–4) → descrizione
let UNIVERSITA = [];      // { id, paese, citta, nome, lat, lon, indiceCosti }
let CARATTERI = [];       // etichette di esempio per la vita in città
let CORSI = [];           // aree di studio


/* ——— 3. Elementi della pagina ——— */
const $ = id => document.getElementById(id);
const pin = $("segnaposti"), box = $("box"), stato = $("stato"), area = $("area"), quadro = $("quadro"),
      legenda = $("legenda"), tabBox = $("tabella-box"), chiudi = $("chiudi-scheda"), apri = $("apri-scheda");


/* ——— 4. Piccoli strumenti ——— */

// Numeri casuali "ripetibili": lo stesso testo dà sempre gli stessi numeri (servono a inventare dati fittizi stabili)
function seme(s) {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// Distanza in linea d'aria tra due università, in km arrotondati a 10
function km(a, b) {
  const R = 6371, t = Math.PI / 180, dl = (b.lat - a.lat) * t, dn = (b.lon - a.lon) * t;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dn / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) / 10) * 10;
}

// Numeri con il punto delle migliaia anche a 4 cifre ("1.590"): il formato italiano del browser lo omette
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const euro = n => (Math.round(n * 100) / 100).toLocaleString("it-IT",
  { minimumFractionDigits: n < 10 ? 2 : 0, maximumFractionDigits: n < 10 ? 2 : 0 }) + " €";
const pl = (n, singolare, plurale) => n + " " + (n === 1 ? singolare : plurale);
const idMappa = d => String(d.id).padStart(3, "0");   // codice del paese nel file della mappa
const fuoco = selettore => { const el = document.querySelector(selettore); if (el) el.focus({ preventScroll: true }); };


/* ——— 5. Le mete (dati fittizi, calcolati a partire dall'università e dal corso) ——— */
function calcolaMete(casa, corso) {
  const r = seme(casa.nome + "|" + corso);
  return UNIVERSITA
    .filter(d => d.paese !== casa.paese)
    .filter(() => r() < .62)
    .map(d => {
      const P = PAESI[d.paese], costi = P.costiBase, stanzaBase = costi.stanza * d.indiceCosti, rr = seme(d.nome + corso);
      const racc = Math.floor(rr() * 13), posti = 1 + Math.floor(rr() * 4);
      const t1 = CARATTERI[Math.floor(rr() * CARATTERI.length)];
      let t2 = CARATTERI[Math.floor(rr() * CARATTERI.length)];
      if (t2 === t1) t2 = CARATTERI[(CARATTERI.indexOf(t1) + 3) % CARATTERI.length];
      return {
        ...d, P, posti, racc, dist: km(casa, d),
        stanza: Math.round(stanzaBase / 10) * 10,                       // ufficiale
        stanzaV: Math.round(stanzaBase * (1 + rr() * .3) / 10) * 10,    // raccontato ("V" = vero)
        pasto: costi.pasto * Math.min(d.indiceCosti, 1.2),
        pastoV: costi.pasto * Math.min(d.indiceCosti, 1.2) * (.8 + rr() * .3),
        // Il caffè non è più mostrato nella scheda, ma il calcolo resta: toglierlo cambierebbe
        // la sequenza dei numeri casuali e quindi tutti i dati che vengono dopo (es. le convalide)
        caffe: costi.caffe,
        caffeV: costi.caffe * (.9 + rr() * .25),
        conv: racc ? 6 + Math.floor(rr() * 5) : null,
        tags: [t1, t2]
      };
    });
}


/* ——— 6. Stato della pagina ——— */
let fase = "paese";          // "paese" → "uni" → "corso" → "risultati"
let paeseScelto = null, casa = null, corso = null, mete = [], sel = null, ordine = "vicine";


/* ——— 7. Mappa: proiezione, zoom, puntini, rotte, nomi ———
   - La proiezione trasforma latitudine/longitudine in un punto del "mondo" 800 × 600.
   - T è lo zoom attuale (gestito da d3.zoom): dice come il mondo diventa pixel sullo schermo.
   - I paesi sono disegnati nel mondo e spostati con T tutti insieme.
   - Puntini, nomi e rotte invece sono ricalcolati in pixel a ogni movimento:
     così seguono la mappa ma restano della stessa grandezza. */
let svg, gMappa, gPaesi, gRotte, paesiSel = null, proiezione, percorso;
let zoom, T = d3.zoomIdentity, k0 = 1, schermo = { w: 0, h: 0 }, confine;
let puntini = [], rotte = [];

const xy = p => proiezione([p.lon, p.lat]);   // città → punto nel mondo 800 × 600

function preparaMappa() {
  svg = d3.select("#mappa");
  gMappa = svg.append("g");
  gPaesi = gMappa.append("g");
  gRotte = svg.append("g");     // le rotte stanno fuori dal gruppo zoomato: sono in pixel
  proiezione = d3.geoAzimuthalEqualArea().rotate([-9, -52])
    .fitExtent([[24, 24], [W - 24, H - 24]],
      { type: "MultiPoint", coordinates: [[-24, 35], [34, 35], [30, 71], [-10, 66], [40, 40]] });
  percorso = d3.geoPath(proiezione);
  confine = calcolaConfine();

  zoom = d3.zoom()
    .translateExtent(confine)                                                   // non si esce dall'area Erasmus+
    .extent(() => [[0, 0], [schermo.w, schermo.h]])
    .filter(e => !e.target.closest(".controlli") && (!e.ctrlKey || e.type === "wheel") && !e.button)
    .clickDistance(4)                                                           // un clic con un minimo tremolio resta un clic
    .on("zoom", e => { T = e.transform; disegna(); });
  d3.select(quadro).call(zoom);

  adattaAllaFinestra();
  new ResizeObserver(adattaAllaFinestra).observe(quadro);   // se la mappa cambia larghezza (scheda aperta/chiusa)

  fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json").then(r => r.json()).then(t => {
    const confini = topojson.feature(t, t.objects.countries).features;
    paesiSel = gPaesi.selectAll("path").data(confini).join("path").attr("d", percorso)
      .attr("class", d => "paese" + (ID_A_CODICE[idMappa(d)] || ALTRI_ERASMUS.includes(idMappa(d)) ? " erasmus" : ""))
      .on("click", (e, d) => { const k = ID_A_CODICE[idMappa(d)]; if (fase === "paese" && k) sceltaPaese(k); });
    coloraPaesi();
  }).catch(() => {});
}

// L'area in cui ci si può muovere: da Islanda a Turchia e Cipro, da Nord Scandinavia a Malta
function calcolaConfine() {
  const bordo = [];
  for (let lon = -25; lon <= 45; lon += 1) bordo.push([lon, 34], [lon, 71.5]);
  for (let lat = 34; lat <= 71.5; lat += .5) bordo.push([-25, lat], [45, lat]);
  const p = bordo.map(c => proiezione(c)), m = 20;
  return [[d3.min(p, q => q[0]) - m, d3.min(p, q => q[1]) - m], [d3.max(p, q => q[0]) + m, d3.max(p, q => q[1]) + m]];
}

// Quando l'area della mappa cambia misura: ricalcolo il livello 1 e tengo fermo il centro della vista
function adattaAllaFinestra() {
  const w = quadro.clientWidth, h = quadro.clientHeight;
  if (!w || !h || (w === schermo.w && h === schermo.h)) return;
  const prima = { ...schermo }, k0Prima = k0;
  schermo = { w, h };
  k0 = Math.min(w / W, h / H);                        // livello 1: tutto il mondo 800 × 600 entra nella mappa
  zoom.scaleExtent([k0, k0 * LIVELLO_MAX]);
  let t;
  if (!prima.w) t = vistaEuropa();
  else {
    const [cx, cy] = T.invert([prima.w / 2, prima.h / 2]), k = T.k / k0Prima * k0;
    t = d3.zoomIdentity.translate(w / 2 - k * cx, h / 2 - k * cy).scale(k);
  }
  d3.select(quadro).interrupt().call(zoom.transform, limita(t));
}

// Tiene lo zoom tra 1x e 8x e la vista dentro l'area Erasmus+
function limita(t) {
  const k = Math.max(k0, Math.min(k0 * LIVELLO_MAX, t.k));
  const cx = (schermo.w / 2 - t.x) / t.k, cy = (schermo.h / 2 - t.y) / t.k;
  const t2 = d3.zoomIdentity.translate(schermo.w / 2 - k * cx, schermo.h / 2 - k * cy).scale(k);
  return zoom.constrain()(t2, [[0, 0], [schermo.w, schermo.h]], confine);
}

// Porta la mappa a una vista, con una transizione morbida (o subito, se l'utente ha chiesto meno movimento)
function vai(t, durata) {
  const s = d3.select(quadro);
  t = limita(t);
  if (meno_movimento() || !durata) { s.interrupt().call(zoom.transform, t); return Promise.resolve(); }
  return s.transition().duration(durata).call(zoom.transform, t).end().catch(() => {});
}

// Le viste "pronte"
function vistaEuropa() {
  return d3.zoomIdentity.translate((schermo.w - k0 * W) / 2, (schermo.h - k0 * H) / 2).scale(k0);
}
// Inquadra un gruppo di punti del mondo, lasciando un margine
// (più spazio a destra per i nomi, e in basso per la legenda e i pulsanti)
function inquadra(punti, { margine = 56, destra = 0, sotto = 0, livelloMax = LIVELLO_MAX, minimo = 0 } = {}) {
  const x0 = d3.min(punti, p => p[0]), x1 = d3.max(punti, p => p[0]);
  const y0 = d3.min(punti, p => p[1]), y1 = d3.max(punti, p => p[1]);
  const largo = schermo.w - 2 * margine - destra, alto = schermo.h - 2 * margine - sotto;
  const k = Math.max(k0, Math.min(k0 * livelloMax, largo / Math.max(x1 - x0, minimo, 1), alto / Math.max(y1 - y0, minimo, 1)));
  return d3.zoomIdentity.translate(margine + largo / 2 - k * (x0 + x1) / 2, margine + alto / 2 - k * (y0 + y1) / 2).scale(k);
}
const vistaPaese = codice => inquadra(UNIVERSITA.filter(u => u.paese === codice).map(xy), { margine: 70, destra: 90, sotto: 40, livelloMax: 5, minimo: 60 });
const vistaMete = () => inquadra([...mete, casa].map(xy), { margine: 56, destra: 110, sotto: 40 });

// Pulsante "Centra": torna alla vista giusta per la fase in cui sei
function centra() {
  if (fase === "risultati") vai(vistaMete(), 700);
  else if (paeseScelto) vai(vistaPaese(paeseScelto), 700);
  else vai(vistaEuropa(), 700);
}
function ingrandisci(fattore) {
  const s = d3.select(quadro);
  if (meno_movimento()) s.interrupt().call(zoom.scaleBy, fattore);
  else s.transition().duration(250).call(zoom.scaleBy, fattore);
}
// Porta una città al centro della mappa senza cambiare lo zoom
function centraSu(d) {
  const [x, y] = xy(d), s = d3.select(quadro);
  if (meno_movimento()) s.interrupt().call(zoom.translateTo, x, y);
  else s.transition().duration(650).call(zoom.translateTo, x, y);
}

// Ridisegna tutto ciò che dipende dallo zoom (chiamato a ogni movimento)
function disegna() {
  if (!gMappa) return;
  gMappa.attr("transform", T);
  for (const p of puntini) {
    p.el.style.left = T.applyX(p.x) + "px";
    p.el.style.top = T.applyY(p.y) + "px";
  }
  for (const r of rotte) r.el.setAttribute("d", "M" + T.apply(r.da) + " Q" + T.apply(r.curva) + " " + T.apply(r.a));
  aggiornaNomi();
}

// Nomi delle città: sotto 2,5x solo città scelta e partenza; sopra, tutti quelli che non si sovrappongono.
// In caso di sovrapposizione vince la città con più posti.
function aggiornaNomi() {
  const tutti = fase === "uni" || fase === "corso" || T.k / k0 >= LIVELLO_NOMI;
  const occupati = [];
  const sovrapposto = r => occupati.some(o => r.x < o.x + o.w + 4 && r.x + r.w + 4 > o.x && r.y < o.y + o.h + 2 && r.y + r.h + 2 > o.y);
  const inOrdine = [...puntini].sort((a, b) => (b.fisso - a.fisso) || (b.priorita - a.priorita));
  for (const p of inOrdine) {
    const sx = T.applyX(p.x), sy = T.applyY(p.y);
    const r = { x: sx + p.dim / 2 + 6, y: sy - p.h / 2, w: p.w, h: p.h };
    const visibile = sx > -20 && sx < schermo.w + 20 && sy > -20 && sy < schermo.h + 20;
    const mostra = p.fisso || (tutti && visibile && !sovrapposto(r));
    if (mostra) occupati.push(r);
    p.el.classList.toggle("nome", mostra);
  }
}

function coloraPaesi() {
  if (!paesiSel) return;
  const codice = d => ID_A_CODICE[idMappa(d)];
  paesiSel
    .classed("cliccabile", d => fase === "paese" && !!codice(d))
    .classed("casa", d => (casa && fase === "risultati" && codice(d) === casa.paese) ||
                          (paeseScelto && fase !== "paese" && fase !== "risultati" && codice(d) === paeseScelto))
    .classed("attivo", d => fase === "risultati" && sel !== null && codice(d) === mete.find(m => m.id === sel).paese);
}

// Un puntino: pulsante (32 × 32 px) centrato sulla città, pallino grande "dim" pixel, etichetta con il nome
function aggiungiPin(d, classi, dim, etichetta, alClic, { priorita = 0, fisso = false } = {}) {
  const [x, y] = xy(d), b = document.createElement("button");
  b.type = "button";
  b.className = "pin " + classi;
  b.tabIndex = -1;                 // con la tastiera si usa l'elenco sotto (e la mappa con le frecce)
  b.style.setProperty("--dim", dim + "px");
  b.innerHTML = '<span class="punto"></span><span class="etichetta">' + etichetta + '</span>';
  if (alClic) b.addEventListener("click", alClic);
  pin.appendChild(b);
  const p = { el: b, x, y, dim, priorita, fisso, w: 0, h: 0 };
  puntini.push(p);
  return p;
}

// Misuro una volta le etichette (servono le misure per capire se si sovrappongono)
function misuraNomi() {
  puntini.forEach(p => p.el.classList.add("misura"));
  puntini.forEach(p => { const e = p.el.querySelector(".etichetta"); p.w = e.offsetWidth; p.h = e.offsetHeight; });
  puntini.forEach(p => p.el.classList.remove("misura"));
}


/* ——— 8. Scheda: chiudi e riapri ——— */
function chiudiScheda() {
  area.classList.add("chiusa");
  chiudi.setAttribute("aria-expanded", "false");
  adattaAllaFinestra();           // la mappa si allarga: aggiorno subito lo zoom
  apri.focus();
}
function apriScheda(spostaFuoco = true) {
  if (!area.classList.contains("chiusa")) return;
  area.classList.remove("chiusa");
  chiudi.setAttribute("aria-expanded", "true");
  adattaAllaFinestra();
  if (spostaFuoco) chiudi.focus();
}
chiudi.addEventListener("click", chiudiScheda);
apri.addEventListener("click", () => apriScheda());


/* ——— 9. Le fasi ——— */
function sceltaPaese(codice) { paeseScelto = codice; casa = null; fase = "uni"; render(); vai(vistaPaese(codice), 900); }
function sceltaUni(u) { casa = u; fase = "corso"; render(); fuoco(".chips button"); }
function mostraMete() {
  mete = calcolaMete(casa, corso); sel = null; fase = "risultati";
  render();
  vai(vistaMete(), 900);          // inquadra partenza e mete, con un margine
  stato.scrollIntoView({ block: "start" });
  box.setAttribute("tabindex", "-1"); fuoco("#box");
}
function ricomincia() {
  fase = "paese"; paeseScelto = null; casa = null; corso = null; mete = []; sel = null;
  render(); vai(vistaEuropa(), 700);
  fuoco("#sel-paese");
}
// Scelta di una città (dalla mappa, dall'elenco o con le frecce della scheda)
function scegli(id) {
  sel = id;
  apriScheda(false);
  renderBox(); renderTabella(); renderMappa();
  centraSu(mete.find(m => m.id === id));
}


/* ——— 10. Disegno delle parti della pagina ——— */

// In alto: i tre passi, oppure il riepilogo quando ci sono i risultati
function renderStato() {
  if (fase === "risultati") {
    stato.innerHTML = '<div class="riepilogo">Parti da <b>' + casa.nome + '</b> · ' + PAESI[casa.paese].nome +
      ' · studi <b>' + corso + '</b> <button type="button" class="cambia" id="cambia">Cambia</button></div>';
    $("cambia").addEventListener("click", ricomincia);
    return;
  }
  const passi = [
    ["paese", "Il tuo paese", paeseScelto ? PAESI[paeseScelto].nome : ""],
    ["uni", "La tua università", casa ? casa.citta : ""],
    ["corso", "Il tuo corso", corso || ""]
  ];
  const ora = ["paese", "uni", "corso"].indexOf(fase);
  stato.innerHTML = '<div class="passi">' + passi.map((p, i) =>
    '<span class="passo' + (i === ora ? " ora" : i < ora ? " fatto" : "") + '"><span class="n">' + (i < ora ? "✓" : i + 1) + '</span>' +
    (i < ora && p[2] ? p[2] : p[1]) + '</span>').join("") + '</div>';
}

// Nota fissa in fondo alle schede iniziali
const NOTA_SCHEDA = '<p class="nota-scheda">Le mete arrivano dai bandi della tua università. I costi da ESN e dai racconti degli studenti.</p>';

// A destra: la scheda, che cambia a ogni fase
function renderBox() {
  box.className = "box"; box.style.cssText = "";

  if (fase === "paese") {
    const opzioni = Object.values(PAESI).sort((a, b) => a.nome.localeCompare(b.nome, "it"))
      .map(p => '<option value="' + p.codice + '">' + p.nome + '</option>').join("");
    box.innerHTML = '<h2>Da dove parti?</h2><p class="sotto">Scegli il paese della tua università. Puoi anche cliccarlo direttamente sulla mappa.</p>' +
      '<label class="sr" for="sel-paese">Paese di partenza</label><select class="campo" id="sel-paese"><option value="">Scegli un paese</option>' + opzioni + '</select>' +
      NOTA_SCHEDA;
    $("sel-paese").addEventListener("change", e => { if (e.target.value) sceltaPaese(e.target.value); });
    return;
  }

  if (fase === "uni") {
    box.innerHTML = '<button type="button" class="torna" id="torna">← Cambia paese</button><h2>La tua università</h2>' +
      '<p class="sotto">Scrivi la città o il nome, oppure clicca la tua università sulla mappa.</p>' +
      '<label class="sr" for="cerca">Cerca città o università</label><input class="campo" id="cerca" type="search" placeholder="Es. Torino" autocomplete="off">' +
      '<ul class="scelte" id="scelte"></ul>' + NOTA_SCHEDA;
    $("torna").addEventListener("click", ricomincia);
    const cerca = $("cerca"), scelte = $("scelte");
    const filtra = () => {
      const q = cerca.value.trim().toLowerCase();
      const trovate = UNIVERSITA.filter(u => u.paese === paeseScelto &&
        (!q || u.citta.toLowerCase().includes(q) || u.nome.toLowerCase().includes(q)));
      scelte.innerHTML = trovate.length
        ? trovate.map(u => '<li><button type="button" data-id="' + u.id + '"><span class="u">' + u.nome + '</span><span class="cc">' + u.citta + '</span></button></li>').join("")
        : '<li class="cc" style="padding:12px 6px">Nessuna università trovata. [Nella versione reale ci saranno tutte.]</li>';
      scelte.querySelectorAll("button").forEach(b => b.addEventListener("click", () => sceltaUni(UNIVERSITA.find(u => u.id === +b.dataset.id))));
    };
    cerca.addEventListener("input", filtra);
    filtra();
    cerca.focus({ preventScroll: true });
    return;
  }

  if (fase === "corso") {
    box.innerHTML = '<button type="button" class="torna" id="torna">← Cambia università</button><h2>Cosa studi?</h2>' +
      '<p class="sotto">' + casa.nome + ', ' + casa.citta + '. Scegli la tua area di studio.</p>' +
      '<div class="chips" role="group" aria-label="Area di studio">' +
      CORSI.map(c => '<button type="button" aria-pressed="' + (c === corso) + '">' + c + '</button>').join("") + '</div>' +
      '<button type="button" class="vai" id="mostra"' + (corso ? "" : " disabled") + '>Mostra dove posso andare <span aria-hidden="true">→</span></button>' +
      NOTA_SCHEDA;
    $("torna").addEventListener("click", () => { casa = null; corso = null; fase = "uni"; render(); });
    box.querySelectorAll(".chips button").forEach((b, i) => b.addEventListener("click", () => {
      corso = b.textContent; renderBox(); renderStato();
      box.querySelectorAll(".chips button")[i].focus({ preventScroll: true });   // la tastiera resta sull'area scelta
    }));
    $("mostra").addEventListener("click", mostraMete);
    return;
  }

  // Risultati, nessuna città scelta: il riassunto
  if (sel === null) {
    const quantiPaesi = new Set(mete.map(m => m.paese)).size, posti = mete.reduce((t, m) => t + m.posti, 0);
    box.className = "box vuoto";
    box.innerHTML = '<div class="grande">' + pl(mete.length, "meta", "mete") + '<br>per te.</div><p>' +
      pl(posti, "posto", "posti") + ' in ' + pl(quantiPaesi, "paese", "paesi") + ', con gli accordi della tua università per ' + corso +
      '. Passa su un puntino per il nome, cliccalo per conoscere la città.</p>' + NOTA_SCHEDA;
    return;
  }

  // Risultati, città scelta: la scheda della città con i colori della bandiera.
  // Tre parti: testata, corpo (griglia 2×2 + vita in città), piede fissato in basso.
  const d = mete.find(m => m.id === sel), lista = ordinate(), pos = lista.findIndex(m => m.id === sel);
  const tinta = c => "color-mix(in srgb, " + c + " 38%, white)";
  box.className = "box citta";
  box.style.setProperty("--f1", tinta(d.P.coloriBandiera[0]));
  box.style.setProperty("--f2", tinta(d.P.coloriBandiera[1]));
  box.style.setProperty("--f3", tinta(d.P.coloriBandiera[2]));

  // Una cella della griglia: etichetta piccola, numero grande, fonte piccola
  const cella = (nome, valore, fonte, classi = "") =>
    '<div class="dato"><span class="dato-nome">' + nome + '</span><span class="dato-valore ' + classi + '">' + valore +
    '</span><span class="dato-fonte">' + fonte + '</span></div>';
  // Senza racconti mostro il dato ufficiale, e lo dico
  const soloUfficiale = "Ufficiale ESN · ancora nessun racconto";
  const lezioni = LEZIONI[d.P.lezioniInInglese].replace("{lingua}", d.P.lingua.toLowerCase());

  box.innerHTML =
    '<div class="testata"><span class="paesetto">' + d.P.nome.toUpperCase() + '</span><h2>' + d.citta + '</h2>' +
      '<p class="uni">' + d.nome + '</p><p class="dist">' + fmt(d.dist) + ' km · ' + pl(d.posti, "posto", "posti") + ' · ' +
      (d.racc ? pl(d.racc, "racconto", "racconti") : "nessun racconto") + '</p></div>' +
    '<div class="corpo">' +
      '<div class="dati">' +
        cella("Stanza al mese", euro(d.racc ? d.stanzaV : d.stanza),
              d.racc ? "Ufficiale ESN: " + euro(d.stanza) : soloUfficiale, d.racc ? "raccontato" : "") +
        cella("Un pasto", euro(d.racc ? d.pastoV : d.pasto),
              d.racc ? "Ufficiale ESN: " + euro(d.pasto) : soloUfficiale, d.racc ? "raccontato" : "") +
        cella("Lezioni", lezioni, d.racc ? "Secondo i racconti" : "Dato generale del paese", "parole" + (d.racc ? " raccontato" : "")) +
        cella("Esami convalidati", d.conv !== null ? d.conv + " su 10" : "—",
              d.conv !== null ? "Studenti della tua università" : "Ancora nessun racconto", d.conv !== null ? "raccontato" : "") +
      '</div>' +
      '<div class="vita">' + (d.racc ? d.tags.slice(0, 2).map(t => '<span class="tag">' + t + '</span>').join("") : '<span class="tag">Ancora nessun racconto</span>') + '</div>' +
    '</div>' +
    '<div class="piede">' +
      '<a class="vai" href="quale-fa-per-me.html">Scopri se ' + d.citta + ' fa per te <span aria-hidden="true">→</span></a>' +
      '<div class="naviga"><button type="button" id="prec" aria-label="Meta precedente">←</button><span>' + (pos + 1) + ' di ' + lista.length +
      '</span><button type="button" id="succ" aria-label="Meta successiva">→</button></div>' +
    '</div>';
  // Le frecce passano alla meta precedente/successiva; la tastiera resta sulla freccia premuta
  $("prec").addEventListener("click", () => { scegli(lista[(pos - 1 + lista.length) % lista.length].id); fuoco("#prec"); });
  $("succ").addEventListener("click", () => { scegli(lista[(pos + 1) % lista.length].id); fuoco("#succ"); });
}

function ordinate() {
  const l = [...mete];
  if (ordine === "vicine") l.sort((a, b) => a.dist - b.dist);
  if (ordine === "racconti") l.sort((a, b) => b.racc - a.racc);
  if (ordine === "economiche") l.sort((a, b) => a.stanza - b.stanza);
  if (ordine === "convalide") l.sort((a, b) => (b.conv ?? -1) - (a.conv ?? -1));
  return l;
}

// Sotto: l'elenco di tutte le mete (è la via completa per chi non usa la mappa)
function renderTabella() {
  $("ordina").style.visibility = fase === "risultati" ? "visible" : "hidden";
  if (fase !== "risultati") {
    tabBox.innerHTML = '<p class="attesa">Scegli paese, università e corso: qui compariranno tutte le mete dove puoi candidarti.</p>';
    return;
  }
  tabBox.innerHTML = '<ul class="tabella"><li class="intest" aria-hidden="true"><span>CITTÀ</span><span>UNIVERSITÀ</span><span>DISTANZA</span><span>POSTI</span><span>STANZA</span><span>RACCONTI</span><span></span></li>' +
    ordinate().map(d => '<li><button type="button" data-id="' + d.id + '"' + (d.id === sel ? ' class="sel" aria-current="true"' : '') + '>' +
      '<span class="c">' + d.citta + '</span><span class="d">' + d.nome + ' · ' + d.P.nome + '</span><span class="d">' + fmt(d.dist) + ' km</span>' +
      '<span class="d">' + d.posti + '</span><span class="d">' + euro(d.stanza) + '</span><span class="d">' + (d.racc || "—") + '</span><span aria-hidden="true">→</span></button></li>').join("") +
    '</ul>';
  tabBox.querySelectorAll(".tabella button").forEach(b => b.addEventListener("click", () => {
    scegli(+b.dataset.id);
    area.scrollIntoView({ block: "start" });
    box.setAttribute("tabindex", "-1");
    box.focus({ preventScroll: true });
  }));
}

// La mappa: puntini e rotte, diversi a seconda della fase
function renderMappa() {
  pin.innerHTML = ""; puntini = [];
  gRotte.selectAll("*").remove(); rotte = [];

  if (fase === "paese") {
    legenda.innerHTML = '<span><i class="l-er"></i>Paesi del programma Erasmus+</span>';

  } else if (fase === "uni" || fase === "corso") {
    legenda.innerHTML = '<span><i class="l-meta"></i>Università del tuo paese</span>';
    UNIVERSITA.filter(u => u.paese === paeseScelto).forEach(u => {
      const scelta = !!(casa && casa.id === u.id);
      aggiungiPin(u, scelta ? "sel" : "", 12, u.citta, () => sceltaUni(u), { fisso: scelta });
    });

  } else {
    legenda.innerHTML = '<span><i class="l-casa"></i>Parti da qui</span><span><i class="l-meta"></i>Le tue mete, più grandi se hanno più posti</span>';
    const da = xy(casa);
    // Rotte: curve dalla tua università a ogni meta (si vede solo quella scelta)
    mete.forEach(d => {
      const a = xy(d), curva = [(da[0] + a[0]) / 2, Math.min(da[1], a[1]) - Math.abs(a[0] - da[0]) * .18 - 20];
      const el = gRotte.append("path").attr("class", "rotta" + (d.id === sel ? " visibile" : "")).attr("id", "r" + d.id).attr("pathLength", 1).node();
      rotte.push({ el, da, curva, a });
    });
    // Puntini delle mete: più posti = puntino più grande (e nome con più priorità)
    mete.forEach(d => {
      const p = aggiungiPin(d, d.id === sel ? "sel" : "", 8 + d.posti * 2, d.citta, () => scegli(d.id), { priorita: d.posti, fisso: d.id === sel });
      p.el.addEventListener("mouseenter", () => { const r = $("r" + d.id); if (r && d.id !== sel) r.classList.add("anteprima"); });
      p.el.addEventListener("mouseleave", () => { const r = $("r" + d.id); if (r) r.classList.remove("anteprima"); });
    });
    const c = aggiungiPin(casa, "casa", 18, casa.citta + " · parti da qui", null, { fisso: true });
    c.el.style.cursor = "default";
  }
  misuraNomi();
  disegna();
  coloraPaesi();
}

function render() { renderStato(); renderBox(); renderMappa(); renderTabella(); }


/* ——— 11. Comandi della mappa: pulsanti e tastiera ——— */
$("zoom-piu").addEventListener("click", () => ingrandisci(1.5));
$("zoom-meno").addEventListener("click", () => ingrandisci(1 / 1.5));
$("centra").addEventListener("click", centra);

// Con il focus sulla mappa: frecce per spostarsi, + e − per lo zoom
quadro.addEventListener("keydown", e => {
  if (e.target !== quadro) return;          // non quando il focus è su un pulsante dentro la mappa
  const passo = 80 / T.k;                   // 80 pixel sullo schermo, a qualunque zoom
  const frecce = { ArrowLeft: [passo, 0], ArrowRight: [-passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] };
  if (frecce[e.key]) { e.preventDefault(); d3.select(quadro).interrupt().call(zoom.translateBy, ...frecce[e.key]); }
  else if (e.key === "+" || e.key === "=") { e.preventDefault(); ingrandisci(1.5); }
  else if (e.key === "-" || e.key === "_") { e.preventDefault(); ingrandisci(1 / 1.5); }
});

// Ordina l'elenco
document.querySelectorAll("#ordina button").forEach(b => b.addEventListener("click", () => {
  ordine = b.dataset.o;
  document.querySelectorAll("#ordina button").forEach(x => x.setAttribute("aria-pressed", x === b));
  renderTabella();
  if (sel !== null) renderBox();
}));


/* ——— 12. Avvio: carico i dati, poi disegno ——— */
const carica = file => fetch(file).then(r => { if (!r.ok) throw new Error(file); return r.json(); });

Promise.all([carica("dati/paesi.json"), carica("dati/universita.json"), carica("dati/corsi.json")])
  .then(([datiPaesi, datiUniversita, datiCorsi]) => {
    datiPaesi.paesi.forEach(p => { PAESI[p.codice] = p; ID_A_CODICE[p.idMappa] = p.codice; });
    ALTRI_ERASMUS = datiPaesi.altriPaesiErasmus.map(p => p.idMappa);
    LEZIONI = datiPaesi.livelliLezioni;
    UNIVERSITA = datiUniversita.universita;
    CARATTERI = datiUniversita.caratteriCitta;
    CORSI = datiCorsi.aree;

    preparaMappa();
    render();
  }, () => {
    // Solo se i file di dati non si caricano (di solito: pagina aperta con il doppio clic)
    stato.innerHTML = '<p class="errore">Non riesco a leggere i dati della cartella <code>dati</code>. ' +
      'Probabilmente hai aperto la pagina con il doppio clic: aprila invece con <b>Live Server</b> ' +
      '(in VS Code, tasto destro sul file → <i>Open with Live Server</i>).</p>';
  });

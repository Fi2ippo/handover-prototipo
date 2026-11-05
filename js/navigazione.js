/* =========================================================
   HANDOVER — la barra dei momenti, uguale in tutte le pagine

   L'elenco qui sotto è l'UNICO posto dove stanno i link del percorso:
   la barra di ogni pagina e le tappe della home li leggono da qui.
   Per aggiungere o rinominare un momento basta cambiare questo elenco.

   Come si usa in una pagina:
     <header><nav id="barra-momenti"></nav></header>
     <script src="js/navigazione.js"></script>      ← subito dopo, così la barra compare senza ritardo
   La barra capisce da sola in che momento sei guardando il nome del file.
   Lo stesso file disegna anche il piè di pagina (<footer id="piede-sito">) e le pagine "in sviluppo".
   Le pagine che appartengono a un momento senza esserne la pagina principale
   (es. citta.html, che fa parte del 02) lo dicono con data-momento="02".
   ========================================================= */

const MOMENTI = [
  { numero: "01", nome: "Dove posso andare?", titolo: "Dove posso andare?",  pagina: "dove-posso-andare.html" },
  { numero: "02", nome: "Quale fa per me?",   titolo: "Quale fa per me?",    pagina: "quale-fa-per-me.html" },
  { numero: "03", nome: "Candidatura",        titolo: "Candidatura",         pagina: "candidatura.html",
    descrizione: "Le scadenze del bando della tua università, i documenti da preparare e il link al portale ufficiale per candidarti." },
  { numero: "04", nome: "Preparazione",       titolo: "Preparazione",        pagina: "preparazione.html",
    descrizione: "Tutto quello che devi fare dopo la selezione, nell'ordine giusto: corsi, Learning Agreement, casa e documenti." },
  { numero: "05", nome: "Vivere lì",          titolo: "Vivere lì",           pagina: "vivere-li.html",
    descrizione: "Le risposte rapide per quando sei già lì: primi giorni, cambi di corso, contatti utili e la città." },
  { numero: "06", nome: "Rientro",            titolo: "Rientro e racconto",  pagina: "rientro.html",
    descrizione: "Le pratiche per il rientro e il tuo racconto, che aiuterà chi parte dopo di te." }
];
const PAGINA_HOME = "index.html";
// Il piè di pagina di tutte le pagine e la nota delle pagine che mostrano dati
const FIRMA = "HANDOVER · Prototipo universitario · Design e sviluppo di Fi2ippo con il gruppo HANDOVER · Universidad de Málaga, 2026";
const NOTA_DATI = "Dati fittizi, solo a scopo dimostrativo.";

(function () {
  const barra = document.getElementById("barra-momenti");
  const file = location.pathname.split("/").pop() || "index.html";
  // Il momento di questa pagina: dal nome del file, oppure da data-momento
  const attivo = MOMENTI.find(m => m.pagina === file) || MOMENTI.find(m => barra && m.numero === barra.dataset.momento);

  // 1. La barra: logo + i sei momenti (quello in cui sei è nero e ha aria-current="step")
  if (barra) {
    barra.setAttribute("aria-label", "Momenti del percorso");
    barra.innerHTML =
      '<a class="logo" href="' + PAGINA_HOME + '">HANDOVER</a>' +
      '<ol class="tappe">' + MOMENTI.map(m =>
        '<li><a class="tappa' + (m === attivo ? ' attiva" aria-current="step' : '') + '" href="' + m.pagina + '">' + m.numero + ' ' + m.nome + '</a></li>'
      ).join("") + '</ol>';
  }

  // 2 e 3. Il resto si disegna quando il browser ha letto tutta la pagina
  //    (questo file parte dalla testata, quando <main> e <footer> non ci sono ancora).
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fine);
  else fine();
  function fine() { riempiInSviluppo(); firma(); }

  // 2. Le pagine dei momenti non ancora fatti (03–06): <main id="in-sviluppo"> si riempie da solo
  //    con titolo, etichetta "In sviluppo", cosa conterrà la sezione e due modi per tornare indietro.
  function riempiInSviluppo() {
    const box = document.getElementById("in-sviluppo");
    if (!box || !attivo) return;
    box.innerHTML =
      '<span class="stato">In sviluppo</span>' +
      '<h1>' + attivo.titolo + '</h1>' +
      '<p class="cosa-conterra">' + attivo.descrizione + '</p>' +
      '<div class="comandi">' +
        '<a class="vai" href="quale-fa-per-me.html"><span aria-hidden="true">←</span> Torna a Quale fa per me?</a>' +
        '<a class="scopri" href="dove-posso-andare.html">Vai alla mappa</a>' +
      '</div>';
  }

  // 3. Il piè di pagina: <footer id="piede-sito"> in ogni pagina. Con data-dati-fittizi (mappa, quiz, risultati,
  //    città) sopra la firma compare anche la nota sui dati.
  function firma() {
    const piede = document.getElementById("piede-sito");
    if (!piede) return;
    piede.innerHTML = (piede.hasAttribute("data-dati-fittizi") ? '<p class="nota-dati">' + NOTA_DATI + '</p>' : "") +
      '<p class="firma">' + FIRMA + '</p>';
  }
})();

/* HANDOVER — pagina della città (per ora un segnaposto) */

// Legge l'id della città dall'indirizzo (citta.html?id=lisbona) e mostra la testata colorata
const id = new URLSearchParams(location.search).get("id");
const ritorno = '<a class="scopri" href="quale-fa-per-me.html">← Torna ai risultati</a>';
const carica = file => fetch(file).then(r => { if (!r.ok) throw new Error(file); return r.json(); });

Promise.all([carica("dati/mete.json"), carica("dati/paesi.json")]).then(([datiMete, datiPaesi]) => {
  const meta = datiMete.mete.find(m => m.id === id), box = document.getElementById("citta");
  if (!meta) { box.innerHTML = '<p class="in-arrivo">Questa città non è (ancora) tra le mete.</p>' + ritorno; return; }
  const paese = datiPaesi.paesi.find(p => p.codice === meta.paese);
  document.title = "HANDOVER — " + meta.citta;
  box.innerHTML =
    '<div class="testata-citta" id="testata-citta">' +
      '<span class="paesetto">' + paese.nome.toUpperCase() + '</span>' +
      '<h1>' + meta.citta + '</h1>' +
      '<p class="uni">' + meta.universita + '</p>' +
    '</div>' +
    '<p class="in-arrivo">La pagina completa di questa città è in arrivo.</p>' + ritorno;
  const t = document.getElementById("testata-citta");
  paese.coloriBandiera.forEach((c, i) => t.style.setProperty("--f" + (i + 1), "color-mix(in srgb," + c + " 38%,white)"));
}, () => {
  document.getElementById("citta").innerHTML = '<p class="errore">Non riesco a leggere i dati: apri la pagina con <b>Live Server</b>.</p>';
});

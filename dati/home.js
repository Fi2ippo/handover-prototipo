// Dati della home di HANDOVER.
// È un file .js (e non .json) solo perché il browser, quando apri la pagina con doppio clic,
// blocca la lettura dei file .json. Il contenuto qui sotto è comunque scritto in formato JSON.
// Tutto ciò che sta tra [parentesi quadre] è un segnaposto: va sostituito con dati reali e verificati.

const DATI_HOME = {
  "nome": "HANDOVER",
  "presentazione": "Le informazioni ufficiali sull'Erasmus, messe accanto ai racconti di chi c'è stato davvero. Per città, università e corso, non per paese.",
  "domanda": "A che punto sei?",

  "ingressi": [
    {
      "id": "scegliendo",
      "etichetta": "Sto scegliendo",
      "situazione": "Non hai ancora deciso dove andare, o hai due o tre idee.",
      "momento": 1,
      "cosaTrovi": "Le mete possibili con la tua università e il tuo corso, e come sono davvero.",
      "esempio": [
        {
          "voce": "Affitto di una stanza, al mese",
          "ufficiale": { "valore": "[costo stanza]", "fonte": "[fonte ufficiale]", "controllato": "[data controllo]" },
          "raccontato": { "valore": "[costo stanza raccontato]", "chi": "[numero] studenti, [anno]", "controllato": "[data controllo]" },
          "perTe": "[confronto con il budget mensile dello studente]"
        },
        {
          "voce": "Esami del tuo corso convalidabili",
          "ufficiale": { "valore": "[numero esami in accordo]", "fonte": "[accordo bilaterale]", "controllato": "[data controllo]" },
          "raccontato": { "valore": "[numero esami convalidati davvero]", "chi": "[numero] studenti di [corso]", "controllato": "[data controllo]" },
          "perTe": "[quanti esami del tuo piano di studi potresti sostenere lì]"
        }
      ]
    },
    {
      "id": "selezionato",
      "etichetta": "Sono stato selezionato",
      "situazione": "Hai una meta assegnata e devi organizzarti.",
      "momento": 4,
      "cosaTrovi": "Cosa preparare prima di partire, in che ordine e con quanto anticipo.",
      "esempio": [
        {
          "voce": "Quanto prima cercare casa",
          "ufficiale": null,
          "raccontato": { "valore": "[settimane di anticipo]", "chi": "[numero] studenti, [anno]", "controllato": "[data controllo]" },
          "perTe": "[entro quale data dovresti iniziare, in base alla tua partenza]"
        },
        {
          "voce": "Spesa del primo mese, caparra compresa",
          "ufficiale": { "valore": "[importo borsa mensile]", "fonte": "[fonte ufficiale]", "controllato": "[data controllo]" },
          "raccontato": { "valore": "[spesa primo mese raccontata]", "chi": "[numero] studenti, [anno]", "controllato": "[data controllo]" },
          "perTe": "[quanto devi avere da parte prima che arrivi la borsa]"
        }
      ]
    },
    {
      "id": "gia-li",
      "etichetta": "Sono già lì",
      "situazione": "Sei in Erasmus adesso.",
      "momento": 5,
      "cosaTrovi": "Come funzionano lo studio e la vita di tutti i giorni nella tua città.",
      "esempio": [
        {
          "voce": "Ore di studio a settimana",
          "ufficiale": { "valore": "[ore previste dai crediti ECTS]", "fonte": "[fonte ufficiale]", "controllato": "[data controllo]" },
          "raccontato": { "valore": "[ore di studio raccontate]", "chi": "[numero] studenti di [corso]", "controllato": "[data controllo]" },
          "perTe": "[quanto tempo libero ti resta davvero]"
        },
        {
          "voce": "Spesa per mangiare, a settimana",
          "ufficiale": null,
          "raccontato": { "valore": "[spesa settimanale raccontata]", "chi": "[numero] studenti, [anno]", "controllato": "[data controllo]" },
          "perTe": "[confronto con quanto spendi adesso]"
        }
      ]
    },
    {
      "id": "tornato",
      "etichetta": "Sono tornato",
      "situazione": "Hai finito l'Erasmus.",
      "momento": 6,
      "cosaTrovi": "Le convalide al rientro, e come lasciare il tuo racconto a chi parte dopo.",
      "esempio": [
        {
          "voce": "Esami convalidati al rientro",
          "ufficiale": { "valore": "[esami previsti nel Learning Agreement]", "fonte": "[università di partenza]", "controllato": "[data controllo]" },
          "raccontato": { "valore": "[esami convalidati davvero]", "chi": "[numero] studenti di [corso]", "controllato": "[data controllo]" },
          "perTe": "[cosa controllare prima di consegnare i documenti]"
        },
        {
          "voce": "Tempo per avere le convalide",
          "ufficiale": { "valore": "[tempi indicati dall'università]", "fonte": "[università di partenza]", "controllato": "[data controllo]" },
          "raccontato": { "valore": "[tempi raccontati]", "chi": "[numero] studenti, [anno]", "controllato": "[data controllo]" },
          "perTe": "[se riesci a laurearti nella sessione che avevi previsto]"
        }
      ]
    }
  ],

  "momenti": [
    { "numero": 1, "titolo": "Dove posso andare?", "dettaglio": "Con la tua università e il tuo corso",
      "cosaTrovi": "Le mete possibili con la tua università e il tuo corso." },
    { "numero": 2, "titolo": "Quale fa per me?", "dettaglio": "Aspettativa contro realtà",
      "cosaTrovi": "Cosa ti aspetti da una meta, e com'è davvero secondo chi ci ha vissuto." },
    { "numero": 3, "titolo": "Candidatura", "dettaglio": "Documenti, scadenze, scelta delle mete",
      "cosaTrovi": "Documenti, scadenze e in che ordine mettere le mete." },
    { "numero": 4, "titolo": "Preparazione", "dettaglio": "Casa, soldi, esami, partenza",
      "cosaTrovi": "Cosa preparare prima di partire, in che ordine e con quanto anticipo." },
    { "numero": 5, "titolo": "Vivere lì", "dettaglio": "Studio e vita di tutti i giorni",
      "cosaTrovi": "Come funzionano lo studio e la vita di tutti i giorni nella tua città." },
    { "numero": 6, "titolo": "Rientro e racconto", "dettaglio": "Convalide, e il tuo racconto per chi parte",
      "cosaTrovi": "Le convalide al rientro, e come lasciare il tuo racconto a chi parte dopo." }
  ],

  "anello": "Il racconto di chi torna diventa l'informazione di chi sceglie.",

  "fonti": {
    "ufficiale": { "etichetta": "Ufficiale", "spiegazione": "Viene da UE, ESN o università." },
    "raccontato": { "etichetta": "Raccontato", "spiegazione": "Viene da studenti che ci sono stati." },
    "controllo": "Ogni informazione ha la data dell'ultimo controllo.",
    "senzaUfficiale": "Non esiste un dato ufficiale: solo racconti."
  },

  "citta": "[città]",
  "universita": "[università]"
};

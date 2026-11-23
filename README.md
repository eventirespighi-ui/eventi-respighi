# Eventi — Conservatorio Ottorino Respighi

Sito statico per pubblicare un feed eventi da Google Sheets.

## Contenuto
- `index.html`: struttura della pagina
- `style.css`: stile editoriale responsive
- `script.js`: feed, filtri, calendario mensile, archivio, Google Calendar e file ICS
- `config.js`: URL della Web App Apps Script
- `Code.gs`: API di sola lettura da installare in Apps Script
- `Eventi-template.csv`: intestazioni e righe di esempio per Google Sheets

## A. Crea il database Google Sheets
1. Crea un nuovo Google Sheet con l'account istituzionale condiviso.
2. Rinomina la prima scheda `Eventi`.
3. Importa `Eventi-template.csv` oppure copia le intestazioni della prima riga.
4. Mantieni esattamente queste intestazioni:
   `ID | Pubblicato | Data | Data_fine | Ora_inizio | Ora_fine | Titolo | Categoria | Descrizione | Luogo | Immagine | Link_info | Docente_artista`
5. Per le date usa `yyyy-MM-dd` (es. `2026-11-24`); per gli orari `HH:mm` (es. `15:00`).
6. In `Pubblicato` usa `SI` per rendere visibile l'evento e `NO` per tenerlo nascosto.
7. Condividi il foglio con le persone che devono inserire gli eventi. Per sicurezza, limita i permessi di modifica alle persone incaricate.

Le immagini devono essere URL pubblici diretti a un'immagine, non link a una pagina di Google Drive. Per la prima versione puoi lasciare il campo vuoto.

## B. Collega Apps Script
1. Dal foglio Google: **Estensioni > Apps Script**.
2. Sostituisci il contenuto di `Code.gs` con il file `Code.gs` incluso in questo progetto.
3. Salva.
4. In **Impostazioni progetto**, imposta il fuso orario su `Europe/Rome`.
5. Seleziona **Distribuisci > Nuova distribuzione**.
6. Tipo: **Applicazione web**.
7. Esegui come: **Me**.
8. Chi può accedere: **Chiunque** (necessario perché il sito pubblico legga gli eventi).
9. Premi **Distribuisci**, autorizza l'accesso e copia l'URL che termina in `/exec`.

Nota privacy: l'endpoint rende pubblici i campi degli eventi con `Pubblicato = SI`. Non inserire dati personali non destinati alla pubblicazione nel foglio. Il codice non offre funzioni per modificare il foglio dal sito.

## C. Collega il sito all'API
1. Apri `config.js`.
2. Sostituisci `INCOLLA_QUI_URL_WEB_APP` con l'URL `/exec` appena copiato.
3. Salva.

## D. Pubblica con GitHub Pages
1. Crea o accedi a un account GitHub.
2. Crea un repository pubblico, ad esempio `eventi-respighi`.
3. Carica tutti i file del progetto nella cartella principale del repository.
4. Apri **Settings > Pages**.
5. In **Build and deployment**, scegli `Deploy from a branch`.
6. Seleziona branch `main` e cartella `/ (root)`, poi salva.
7. Attendi la pubblicazione: GitHub mostrerà l'indirizzo del sito nelle impostazioni Pages.

## E. Verifica
- Pubblica una riga di test con `SI`.
- Verifica che appaia nel feed.
- Prova il filtro categoria e la vista calendario.
- Apri il link Google Calendar.
- Scarica e apri il file `.ics`.
- Cambia `SI` in `NO` e verifica che l'evento sparisca.

## Note
- La pagina mostra automaticamente gli eventi futuri nel feed e quelli passati nell'archivio.
- La vista calendario mensile mostra gli eventi del mese selezionato.
- Il filtro selezionato si applica sia al feed sia al calendario e all'archivio.
- Per aggiornare il sito dopo una modifica grafica/codice, carica i file modificati su GitHub. Le modifiche agli eventi si fanno invece solo su Google Sheets.
- Per un progetto istituzionale, usare un account Google e GitHub controllato dal Conservatorio e almeno due amministratori.

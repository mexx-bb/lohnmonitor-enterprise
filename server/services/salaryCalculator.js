/**
 * Gehaltsrechner Service
 * Berechnet Monatsstunden, Brutto-Gehalt und Zulagen
 */

// Basis-Wochenstunden aus Settings (Default: 40)
const DEFAULT_BASIS_WOCHENSTUNDEN = 40;

/**
 * Durchschnittliche Wochen pro Monat
 * Berechnung: 52.14 Wochen pro Jahr / 12 Monate = 4.345
 * Der Wert 4.348 ist ein branchenüblicher Rundungswert für die Gehaltsabrechnung
 * (entspricht 365.25 Tage / 7 Tage / 12 Monate = 4.348)
 */
const WOCHEN_PRO_MONAT = 4.348;

/**
 * Berechnet Monatsstunden aus Wochenstunden
 * Formel: Wochenstunden * durchschnittliche Wochen pro Monat
 */
function berechneMonatsstunden(wochenstunden) {
  return wochenstunden * WOCHEN_PRO_MONAT;
}

/**
 * Berechnet das Basis-Brutto (ohne Zulagen)
 * Formel: Monatsstunden * Stundenlohn
 */
function berechneBasisBrutto(wochenstunden, stundenlohn) {
  const monatsstunden = berechneMonatsstunden(wochenstunden);
  return monatsstunden * stundenlohn;
}

/**
 * Berechnet variable Zulagen (Gruppe, Schicht)
 * Formel: (Wochenstunden / Basis_Wochenstunden) * Zulagen_Wert
 */
function berechneVariableZulage(wochenstunden, zulagenWert, basisWochenstunden = DEFAULT_BASIS_WOCHENSTUNDEN) {
  if (!zulagenWert || zulagenWert <= 0) return 0;
  return (wochenstunden / basisWochenstunden) * zulagenWert;
}

/**
 * Berechnet alle Zulagen für einen Mitarbeiter
 * @param {Object} zulagen - JSON-Objekt mit Zulagen {gruppe, schicht, tl100, tl150}
 * @param {number} wochenstunden - Wochenstunden des Mitarbeiters
 * @param {number} basisWochenstunden - Basis-Wochenstunden (aus Settings)
 */
function berechneAlleZulagen(zulagen, wochenstunden, basisWochenstunden = DEFAULT_BASIS_WOCHENSTUNDEN) {
  const result = {
    gruppeZulage: 0,
    schichtZulage: 0,
    tl100: 0,
    tl150: 0,
    gesamtZulagen: 0
  };

  if (!zulagen) return result;

  // Variable Zulagen (anteilig nach Wochenstunden)
  if (zulagen.gruppe && zulagen.gruppe > 0) {
    result.gruppeZulage = berechneVariableZulage(wochenstunden, zulagen.gruppe, basisWochenstunden);
  }

  if (zulagen.schicht && zulagen.schicht > 0) {
    result.schichtZulage = berechneVariableZulage(wochenstunden, zulagen.schicht, basisWochenstunden);
  }

  // Fix-Zulagen (pauschal 100€ oder 150€)
  if (zulagen.tl100) {
    result.tl100 = 100;
  }

  if (zulagen.tl150) {
    result.tl150 = 150;
  }

  result.gesamtZulagen = result.gruppeZulage + result.schichtZulage + result.tl100 + result.tl150;

  return result;
}

/**
 * Berechnet das Gesamt-Brutto inkl. aller Zulagen
 */
function berechneGesamtBrutto(wochenstunden, stundenlohn, zulagen, basisWochenstunden = DEFAULT_BASIS_WOCHENSTUNDEN) {
  const basisBrutto = berechneBasisBrutto(wochenstunden, stundenlohn);
  const alleZulagen = berechneAlleZulagen(zulagen, wochenstunden, basisWochenstunden);

  return basisBrutto + alleZulagen.gesamtZulagen;
}

/**
 * Erstellt eine vollständige Gehaltsberechnung für einen Mitarbeiter
 */
function berechneGehalt(mitarbeiter, basisWochenstunden = DEFAULT_BASIS_WOCHENSTUNDEN) {
  const { wochenstunden, stundenlohn } = mitarbeiter;
  
  // Parse zulagen wenn es ein String ist
  let zulagen = mitarbeiter.zulagen;
  if (typeof zulagen === 'string') {
    try {
      zulagen = JSON.parse(zulagen);
    } catch (e) {
      zulagen = {};
    }
  }

  const monatsstunden = berechneMonatsstunden(wochenstunden);
  const basisBrutto = berechneBasisBrutto(wochenstunden, stundenlohn);
  const alleZulagen = berechneAlleZulagen(zulagen, wochenstunden, basisWochenstunden);
  const gesamtBrutto = basisBrutto + alleZulagen.gesamtZulagen;

  return {
    wochenstunden,
    monatsstunden: Math.round(monatsstunden * 100) / 100,
    stundenlohn,
    basisBrutto: Math.round(basisBrutto * 100) / 100,
    zulagen: {
      gruppeZulage: Math.round(alleZulagen.gruppeZulage * 100) / 100,
      schichtZulage: Math.round(alleZulagen.schichtZulage * 100) / 100,
      tl100: alleZulagen.tl100,
      tl150: alleZulagen.tl150,
      gesamt: Math.round(alleZulagen.gesamtZulagen * 100) / 100
    },
    gesamtBrutto: Math.round(gesamtBrutto * 100) / 100
  };
}

/**
 * Formatiert einen Geldbetrag als deutschen Währungsstring
 */
function formatWaehrung(betrag) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(betrag);
}

module.exports = {
  berechneMonatsstunden,
  berechneBasisBrutto,
  berechneVariableZulage,
  berechneAlleZulagen,
  berechneGesamtBrutto,
  berechneGehalt,
  formatWaehrung,
  DEFAULT_BASIS_WOCHENSTUNDEN
};

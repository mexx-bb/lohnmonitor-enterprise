/**
 * Tarif-Kalkulator Service
 * Berechnet Stufenaufstieg nach AVR Bayern 2026
 * 
 * Quelle: Arbeitsvertragsrichtlinien des Diakonischen Werkes Bayern (AVR Bayern)
 * Stand: 2026, § 15 Entgeltstufen
 * 
 * Die Stufenlaufzeiten basieren auf den offiziellen Tarifvereinbarungen
 * und definieren die erforderliche Beschäftigungsdauer für automatische
 * Stufenaufstiege im öffentlichen Dienst / karitativen Bereich.
 */

/**
 * AVR Bayern 2026 Tarif-Automatik - Stufenlaufzeiten in Monaten
 * 
 * Diese Werte entsprechen den offiziellen AVR Bayern Richtlinien:
 * - Stufe 1 -> 12 Monate (1 Jahr)   -> Stufe 2
 * - Stufe 2 -> 24 Monate (2 Jahre)  -> Stufe 3
 * - Stufe 3 -> 60 Monate (5 Jahre)  -> Stufe 4
 * - Stufe 4 -> 84 Monate (7 Jahre)  -> Stufe 5
 * - Stufe 5 -> 180 Monate (15 Jahre) -> Sonderstufe (6)
 * 
 * HINWEIS: Bei Tarifänderungen müssen diese Werte angepasst werden.
 * Letzte Überprüfung: Januar 2025
 */
const STUFEN_ZEITRAUM = {
  1: 12,   // 1 Jahr Beschäftigung bis Stufe 2
  2: 24,   // 2 Jahre in Stufe 2 bis Stufe 3
  3: 60,   // 5 Jahre in Stufe 3 bis Stufe 4
  4: 84,   // 7 Jahre in Stufe 4 bis Stufe 5
  5: 180,  // 15 Jahre in Stufe 5 bis Sonderstufe
  6: null  // Sonderstufe - kein weiterer Aufstieg möglich
};

const MAX_STUFE = 6;

/**
 * Berechnet das Datum des nächsten Stufenaufstiegs
 * @param {Date} eintrittsdatum - Datum des Arbeitseintritts
 * @param {number} aktuelleStufe - Aktuelle Stufe (1-6)
 * @returns {Date|null} - Datum des nächsten Aufstiegs oder null wenn Sonderstufe
 */
function berechneNaechstenAufstieg(eintrittsdatum, aktuelleStufe) {
  if (aktuelleStufe >= MAX_STUFE) {
    return null; // Sonderstufe erreicht
  }

  const eintritt = new Date(eintrittsdatum);
  
  // Berechne Gesamtmonate bis zum nächsten Aufstieg
  let gesamtMonate = 0;
  for (let stufe = 1; stufe <= aktuelleStufe; stufe++) {
    gesamtMonate += STUFEN_ZEITRAUM[stufe] || 0;
  }

  // Füge Monate zum Eintrittsdatum hinzu
  const naechsterAufstieg = new Date(eintritt);
  naechsterAufstieg.setMonth(naechsterAufstieg.getMonth() + gesamtMonate);

  return naechsterAufstieg;
}

/**
 * Berechnet die aktuelle Stufe basierend auf Eintrittsdatum
 * @param {Date} eintrittsdatum - Datum des Arbeitseintritts
 * @returns {Object} - { stufe, naechsterAufstieg, tagesBisAufstieg }
 */
function berechneStufe(eintrittsdatum) {
  const eintritt = new Date(eintrittsdatum);
  const heute = new Date();
  
  // Berechne Monate seit Eintritt
  const monateSeitEintritt = (heute.getFullYear() - eintritt.getFullYear()) * 12 
    + (heute.getMonth() - eintritt.getMonth());

  let stufe = 1;
  let kumulativeMonate = 0;

  // Bestimme aktuelle Stufe
  for (let s = 1; s < MAX_STUFE; s++) {
    const monateInStufe = STUFEN_ZEITRAUM[s];
    if (monateSeitEintritt >= kumulativeMonate + monateInStufe) {
      stufe = s + 1;
      kumulativeMonate += monateInStufe;
    } else {
      break;
    }
  }

  const naechsterAufstieg = berechneNaechstenAufstieg(eintritt, stufe);
  
  // Berechne Tage bis zum nächsten Aufstieg
  let tageBisAufstieg = null;
  if (naechsterAufstieg) {
    const diffTime = naechsterAufstieg.getTime() - heute.getTime();
    tageBisAufstieg = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    stufe,
    naechsterAufstieg,
    tageBisAufstieg,
    istSonderstufe: stufe >= MAX_STUFE
  };
}

/**
 * Prüft ob ein Stufenaufstieg bevorsteht
 * @param {Date} naechsterAufstieg - Datum des nächsten Aufstiegs
 * @param {number} schwellenwertTage - Anzahl Tage für Alarm (default: 40)
 */
function istAufstiegBevorstehend(naechsterAufstieg, schwellenwertTage = 40) {
  if (!naechsterAufstieg) return false;

  const heute = new Date();
  const aufstieg = new Date(naechsterAufstieg);
  const diffTime = aufstieg.getTime() - heute.getTime();
  const diffTage = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffTage >= 0 && diffTage <= schwellenwertTage;
}

/**
 * Berechnet Tage bis zum Aufstieg
 */
function berechneTagesBisAufstieg(naechsterAufstieg) {
  if (!naechsterAufstieg) return null;

  const heute = new Date();
  const aufstieg = new Date(naechsterAufstieg);
  const diffTime = aufstieg.getTime() - heute.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Bestimmt den Alarm-Status für einen Mitarbeiter
 * @returns {Object} - { alarm: boolean, level: 'rot'|'gelb'|'gruen', tageBisAufstieg }
 */
function bestimmeAlarmStatus(naechsterAufstieg, schwellenwertTage = 40) {
  if (!naechsterAufstieg) {
    return { alarm: false, level: 'gruen', tageBisAufstieg: null };
  }

  const tageBisAufstieg = berechneTagesBisAufstieg(naechsterAufstieg);

  if (tageBisAufstieg === null) {
    return { alarm: false, level: 'gruen', tageBisAufstieg: null };
  }

  if (tageBisAufstieg < 0) {
    // Aufstieg überfällig
    return { alarm: true, level: 'rot', tageBisAufstieg };
  }

  if (tageBisAufstieg <= schwellenwertTage) {
    // Aufstieg bevorstehend
    return { alarm: true, level: 'rot', tageBisAufstieg };
  }

  if (tageBisAufstieg <= schwellenwertTage * 2) {
    // Aufstieg in der Nähe
    return { alarm: false, level: 'gelb', tageBisAufstieg };
  }

  return { alarm: false, level: 'gruen', tageBisAufstieg };
}

/**
 * Formatiert die Stufe für Anzeige
 */
function formatStufe(stufe) {
  if (stufe >= MAX_STUFE) {
    return `Stufe ${stufe} (Sonderstufe)`;
  }
  return `Stufe ${stufe}`;
}

/**
 * Entgeltgruppen (E1-E14)
 */
const ENTGELTGRUPPEN = [
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7',
  'E8', 'E9', 'E10', 'E11', 'E12', 'E13', 'E14'
];

module.exports = {
  STUFEN_ZEITRAUM,
  MAX_STUFE,
  ENTGELTGRUPPEN,
  berechneNaechstenAufstieg,
  berechneStufe,
  istAufstiegBevorstehend,
  berechneTagesBisAufstieg,
  bestimmeAlarmStatus,
  formatStufe
};

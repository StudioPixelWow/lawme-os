/**
 * Real, minimized fixture captured live from the Knesset National Legislation
 * content API on 2026-08-06:
 *   GET .../GetLegislationLawItem?ItemId=2001008  (חוק מילווה חסכון, התשל"ד-1974)
 *
 * Structure, element names, ordering (newest-first) and values are faithful to
 * the live payload; only unrelated empty/branch elements were trimmed. This law
 * is `נושן` (obsolete), has 3 publications (1 original + 2 corrections), and no
 * openBookUrl — a good minimal case for the parser + identity + chain logic.
 *
 * Real values preserved: itemIds 416102/147619/147618, dates, ספר-החוקים
 * magazine/page numbers, correctionType (עקיף/ישיר), and the Windows-style
 * backslash filePath form on fs.knesset.gov.il.
 */
export const LAW_2001008_XML = `<?xml version="1.0" encoding="utf-8"?>
<iLegislationLawItem xmlns="http://schemas.datacontract.org/knesset" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <general>
    <hebSubject>חוק מילווה חסכון, התשל"ד-1974</hebSubject>
    <knsName>כנסת 8</knsName>
    <kolZchutUrl i:nil="true"/>
    <latestPublicationDate>1977-11-17T00:00:00</latestPublicationDate>
    <lawValidity>נושן</lawValidity>
    <openBookUrl i:nil="true"/>
    <publicationDate>1974-04-05T00:00:00</publicationDate>
  </general>
  <corrections>
    <listCorrections>
      <iLegislationLawItemCorrectionResult>
        <correctionNumber/>
        <correctionType>עקיף</correctionType>
        <filePath>https://fs.knesset.gov.il/\\9\\law\\9_lsr_211856.PDF</filePath>
        <fileType>pdf</fileType>
        <itemId>416102</itemId>
        <magazineNumber>874</magazineNumber>
        <name>חוק המילוות (הוראות שונות), התשל"ח-1977</name>
        <pageNumber>19</pageNumber>
        <publicationDate>1977-11-17T00:00:00</publicationDate>
        <publicationSeries>ספר החוקים</publicationSeries>
        <summaryLaw i:nil="true"/>
      </iLegislationLawItemCorrectionResult>
      <iLegislationLawItemCorrectionResult>
        <correctionNumber/>
        <correctionType>ישיר</correctionType>
        <filePath>https://fs.knesset.gov.il/\\8\\law\\8_lsr_208598.PDF</filePath>
        <fileType>pdf</fileType>
        <itemId>147619</itemId>
        <magazineNumber>744</magazineNumber>
        <name>חוק מילווה חסכון (תיקון), התשל"ד-1974</name>
        <pageNumber>128</pageNumber>
        <publicationDate>1974-08-23T00:00:00</publicationDate>
        <publicationSeries>ספר החוקים</publicationSeries>
        <summaryLaw i:nil="true"/>
      </iLegislationLawItemCorrectionResult>
      <iLegislationLawItemCorrectionResult>
        <correctionNumber/>
        <correctionType>ישיר</correctionType>
        <filePath>https://fs.knesset.gov.il/\\8\\law\\8_lsr_208597.PDF</filePath>
        <fileType>pdf</fileType>
        <itemId>147618</itemId>
        <magazineNumber>731</magazineNumber>
        <name>חוק מילווה חסכון, התשל"ד-1974</name>
        <pageNumber>57</pageNumber>
        <publicationDate>1974-04-05T00:00:00</publicationDate>
        <publicationSeries>ספר החוקים</publicationSeries>
        <summaryLaw i:nil="true"/>
      </iLegislationLawItemCorrectionResult>
    </listCorrections>
  </corrections>
  <secondaryLawInstalled>
    <iLegislationItemSecondaryLaw>
      <itemId>2111851</itemId>
      <name>תקנות מילווה חסכון (שעבוד תעודות) (תיקון), התש"ם-1980</name>
      <openLawBookVersion i:nil="true"/>
    </iLegislationItemSecondaryLaw>
  </secondaryLawInstalled>
</iLegislationLawItem>`;

/** Real IsraelLawID for this fixture. */
export const LAW_2001008_ITEM_ID = "2001008";

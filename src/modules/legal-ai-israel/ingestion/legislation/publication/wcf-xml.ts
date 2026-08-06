/**
 * Minimal, dependency-free XML → JS value parser for WCF DataContract responses.
 *
 * The Knesset National Legislation content API
 * (GetLegislationLawItem?ItemId=<IsraelLawID>) returns a WCF DataContract XML
 * document — no auth, no CDATA, elements only, `i:nil="true"` for nulls. We keep
 * zero external dependencies (node --test style), so this is a small recursive
 * parser scoped to exactly that document family. It is NOT a general XML engine:
 * it handles elements, attributes, text, entity references, comments and the XML
 * declaration, which is the full grammar the endpoint emits.
 *
 * Conversion rules:
 *  - namespace prefixes are stripped → local element names only;
 *  - an element carrying `nil="true"` (any namespace prefix) → `null`;
 *  - an element with child elements → an object; sibling children sharing a name
 *    are collected into an array so repeated `<X>` become `X: [...]`;
 *  - a leaf element → its decoded, trimmed text (empty string when absent).
 *
 * The parser is strict about malformed input (unbalanced tags throw) so a
 * truncated/garbled response fails loudly rather than validating as partial.
 */

export type XmlValue = string | null | XmlObject | XmlValue[];
export interface XmlObject {
  [key: string]: XmlValue;
}

interface RawNode {
  name: string;
  nil: boolean;
  children: RawNode[];
  text: string;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body) ? ENTITIES[body] : m;
  });
}

function localName(qname: string): string {
  const i = qname.indexOf(":");
  return i === -1 ? qname : qname.slice(i + 1);
}

/** Parse a WCF DataContract XML string into a nested {@link XmlObject}. */
export function parseWcfXml(xml: string): XmlObject {
  const root = parseToTree(xml);
  const obj = nodeToValue(root);
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    // A document whose root is a leaf/nil is not a valid response envelope.
    return { [root.name]: obj } as XmlObject;
  }
  return { [root.name]: obj } as XmlObject;
}

function parseToTree(xml: string): RawNode {
  let i = 0;
  const n = xml.length;

  function skipDecl(): void {
    // Skip <?xml ... ?>, comments, and DOCTYPE at the current position.
    for (;;) {
      while (i < n && /\s/.test(xml[i])) i += 1;
      if (xml.startsWith("<?", i)) {
        const end = xml.indexOf("?>", i);
        if (end === -1) throw new Error("wcf-xml: unterminated processing instruction");
        i = end + 2;
      } else if (xml.startsWith("<!--", i)) {
        const end = xml.indexOf("-->", i);
        if (end === -1) throw new Error("wcf-xml: unterminated comment");
        i = end + 3;
      } else if (xml.startsWith("<!", i)) {
        const end = xml.indexOf(">", i);
        if (end === -1) throw new Error("wcf-xml: unterminated declaration");
        i = end + 1;
      } else {
        return;
      }
    }
  }

  function parseElement(): RawNode {
    if (xml[i] !== "<") throw new Error(`wcf-xml: expected '<' at ${i}`);
    i += 1;
    const nameStart = i;
    while (i < n && !/[\s/>]/.test(xml[i])) i += 1;
    const rawName = xml.slice(nameStart, i);
    const node: RawNode = { name: localName(rawName), nil: false, children: [], text: "" };

    // Attributes
    for (;;) {
      while (i < n && /\s/.test(xml[i])) i += 1;
      if (xml[i] === "/" || xml[i] === ">") break;
      const attrStart = i;
      while (i < n && xml[i] !== "=" && !/[\s/>]/.test(xml[i])) i += 1;
      const attrName = xml.slice(attrStart, i);
      while (i < n && /\s/.test(xml[i])) i += 1;
      if (xml[i] === "=") {
        i += 1;
        while (i < n && /\s/.test(xml[i])) i += 1;
        const quote = xml[i];
        if (quote !== '"' && quote !== "'") throw new Error(`wcf-xml: unquoted attribute at ${i}`);
        i += 1;
        const valStart = i;
        while (i < n && xml[i] !== quote) i += 1;
        const attrVal = xml.slice(valStart, i);
        i += 1;
        if (localName(attrName) === "nil" && attrVal === "true") node.nil = true;
      }
    }

    if (xml[i] === "/") {
      // self-closing
      i += 1;
      if (xml[i] !== ">") throw new Error(`wcf-xml: malformed self-closing tag at ${i}`);
      i += 1;
      return node;
    }
    i += 1; // consume '>'

    // Children / text until matching close tag
    let textBuf = "";
    for (;;) {
      if (i >= n) throw new Error(`wcf-xml: unexpected EOF inside <${node.name}>`);
      if (xml.startsWith("<!--", i)) {
        const end = xml.indexOf("-->", i);
        if (end === -1) throw new Error("wcf-xml: unterminated comment");
        i = end + 3;
      } else if (xml.startsWith("</", i)) {
        i += 2;
        const closeStart = i;
        while (i < n && xml[i] !== ">") i += 1;
        const closeName = localName(xml.slice(closeStart, i).trim());
        if (closeName !== node.name) {
          throw new Error(`wcf-xml: mismatched close </${closeName}> for <${node.name}>`);
        }
        i += 1;
        break;
      } else if (xml[i] === "<") {
        node.children.push(parseElement());
      } else {
        const textStart = i;
        while (i < n && xml[i] !== "<") i += 1;
        textBuf += xml.slice(textStart, i);
      }
    }
    node.text = decodeEntities(textBuf).trim();
    return node;
  }

  skipDecl();
  const root = parseElement();
  return root;
}

function nodeToValue(node: RawNode): XmlValue {
  if (node.nil) return null;
  if (node.children.length === 0) return node.text;

  const obj: XmlObject = {};
  const seen = new Map<string, number>();
  for (const child of node.children) {
    const value = nodeToValue(child);
    if (seen.has(child.name)) {
      const existing = obj[child.name];
      if (Array.isArray(existing)) existing.push(value);
      else obj[child.name] = [existing, value];
    } else {
      obj[child.name] = value;
      seen.set(child.name, 1);
    }
  }
  return obj;
}

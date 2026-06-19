/**
 * Converts Figma frame data into clean HTML email.
 * Walks the full node tree ONCE, collects all text with context,
 * then builds a flat email layout.
 */

interface FC { r: number; g: number; b: number; a: number; }
interface TS { fontFamily?: string; fontWeight?: number; fontSize?: number; textAlignHorizontal?: string; }
interface FN { id: string; name: string; type: string; children?: FN[]; fills?: {type:string;color?:FC;opacity?:number}[]; cornerRadius?: number; style?: TS; characters?: string; paddingLeft?:number; paddingRight?:number; paddingTop?:number; paddingBottom?:number; absoluteBoundingBox?: {x:number;y:number;width:number;height:number}; }

function toHex(c?: FC): string {
  if (!c) return "";
  return `#${[c.r,c.g,c.b].map(v=>Math.round(v*255).toString(16).padStart(2,"0")).join("")}`;
}
function toRGB(c?: FC, o?: number): string {
  if (!c) return "";
  return `rgb(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)})`;
}

interface TextItem {
  id: string;
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: string;
  sectionBg: string;   // background of the containing section
  isBtn: boolean;
  btnBg: string;
  btnRadius: number;
  imgUrl?: string;
  imgWidth?: number;
}

export function figmaFrameToEmail(root: FN): string {
  const items: TextItem[] = [];
  const visited = new Set<string>();

  function walk(node: FN, ctx: { bg: string; color: string; btnRad: number; btnBg: string }): void {
    if (!node) return;

    const fillColor = toRGB(node.fills?.[0]?.color, node.fills?.[0]?.opacity);
    const nodeHex = toHex(node.fills?.[0]?.color);
    const isButtonShape = node.cornerRadius && node.cornerRadius > 15 && nodeHex && nodeHex !== "#FFFFFF" && nodeHex !== "#000000" && nodeHex !== "";

    // Update context
    const newCtx = { ...ctx };
    if (nodeHex && nodeHex !== "#FFFFFF") newCtx.bg = nodeHex;
    if (fillColor) newCtx.color = fillColor;
    if (isButtonShape) { newCtx.btnRad = node.cornerRadius || 24; newCtx.btnBg = nodeHex || ""; }
    // Pass through auto-layout padding as section bg indicator
    const hasPadding = (node.paddingTop != null || node.paddingBottom != null) && nodeHex;

    // IMAGE fill node — push as a special item
    if (node.fills?.some((f: any) => f.type === "IMAGE") && node.type !== "TEXT" && node.id) {
      items.push({
        id: "img-" + node.id, text: "", fontSize: 0, fontWeight: 0, color: "",
        align: "center", sectionBg: ctx.bg, isBtn: false, btnBg: "", btnRadius: 0,
        imgUrl: `[IMAGE:${node.id}]`,
        imgWidth: Math.round(node.absoluteBoundingBox?.width || 600),
      });
      return;
    }

    // TEXT node
    if (node.type === "TEXT" && node.characters?.trim()) {
      if (visited.has(node.id)) return;
      visited.add(node.id);

      const s = node.style || {};
      // Final color: text node's own fill, or inherited
      const textColor = fillColor || ctx.color || "#333333";
      const isInsideButton = ctx.btnRad > 15;

      items.push({
        id: node.id,
        text: node.characters,
        fontSize: s.fontSize || 14,
        fontWeight: s.fontWeight || 400,
        color: textColor,
        align: s.textAlignHorizontal === "CENTER" ? "center" : s.textAlignHorizontal === "RIGHT" ? "right" : "left",
        sectionBg: hasPadding ? newCtx.bg : ctx.bg,
        isBtn: isInsideButton,
        btnBg: isInsideButton ? ctx.btnBg : "",
        btnRadius: isInsideButton ? ctx.btnRad : 0,
      });
      return;
    }

    // Recurse children
    if (node.children) {
      for (const child of node.children) {
        walk(child, newCtx);
      }
    }
  }

  // Walk the full tree
  walk(root, { bg: "", color: "", btnRad: 0, btnBg: "" });

  // Fallback for outlined text: extract GROUP names as text
  if (items.length === 0) {
    const collected = new Set<string>();
    function collectGroupNames(node: FN): void {
      if (!node) return;
      // Use group/canvas/frame names that look like text (not generic names)
      if ((node.type === "GROUP" || node.type === "FRAME" || node.type === "CANVAS") &&
          node.name && node.name.length > 8 &&
          !node.name.match(/^(Frame|Group|Component|Vector|Rectangle|Line|Ellipse)/i) &&
          !collected.has(node.name)) {
        collected.add(node.name);
        const hasVectorKids = node.children?.every(c => c.type === "VECTOR");
        if (!hasVectorKids && node.children && node.children.length < 20) {
          // This group name might be text content
          items.push({
            id: "group-" + node.id,
            text: node.name,
            fontSize: 14,
            fontWeight: 400,
            color: "#333333",
            align: "left",
            sectionBg: "",
            isBtn: false,
            btnBg: "",
            btnRadius: 0,
          });
        }
      }
      if (node.children) node.children.forEach(c => collectGroupNames(c));
    }
    collectGroupNames(root);
  }

  // Group items by section background
  const sections: { bg: string; items: TextItem[] }[] = [];
  for (const item of items) {
    const bgKey = item.sectionBg || "";
    const existing = sections.find(s => s.bg === bgKey);
    if (existing) existing.items.push(item);
    else sections.push({ bg: bgKey, items: [item] });
  }

  // Detect overall page background (most common section bg or white)
  const bgCounts: Record<string, number> = {};
  sections.forEach(s => { bgCounts[s.bg] = (bgCounts[s.bg] || 0) + 1; });
  const globalBg = Object.entries(bgCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "#ffffff";

  // Build HTML
  const bodyHtml = sections.map(sec => {
    const hasBg = !!sec.bg;

    // Detect if this is a dark section
    const isDark = hasBg && sec.bg !== "#ffffff" && sec.bg !== "#FFFFFF" && sec.bg !== "#f8f9fa" && sec.bg !== "#F8F9FA" &&
      (sec.bg.match(/\d+/g)?.map(Number).reduce((a,b) => a+b, 0) || 0) < 400;

    const itemsHtml = sec.items.map(item => {
      // Image item
      if (item.imgUrl) {
        return `<img src="${item.imgUrl}" alt="" style="display:block;max-width:100%;height:auto;margin:0 auto;" width="${item.imgWidth || 600}" />`;
      }

      const baseStyle = `font-size:${item.fontSize}px;font-weight:${item.fontWeight};color:${item.color};text-align:${item.align};margin:0 0 8px;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`;

      if (item.isBtn) {
        const actualBg = isDark ? "#FFFFFF" : (item.btnBg || "#215CE5");
        const txtColor = isDark ? (item.btnBg || "#215CE5") : "#FFFFFF";
        return `<table cellpadding="0" cellspacing="0" border="0" align="${item.align}" style="margin:${item.align === 'center' ? '0 auto' : '0'}"><tr><td style="background:${actualBg};border-radius:${item.btnRadius}px;padding:12px 32px;text-align:center;"><p style="margin:0;font-size:${item.fontSize}px;font-weight:${item.fontWeight};color:${txtColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${item.text}</p></td></tr></table>`;
      }

      const tag = item.fontSize >= 18 ? "h2" : "p";
      return `<${tag} style="${baseStyle}">${item.text}</${tag}>`;
    }).join("\n");

    const padding = hasBg ? "32px 40px" : "16px 40px";
    const bgStyle = hasBg ? `background:${sec.bg};` : "";
    return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="${bgStyle}padding:${padding};"><tr><td align="center">${itemsHtml}</td></tr></table>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;-webkit-text-size-adjust:100%}table{border-collapse:collapse}</style></head>
<body style="margin:0;padding:0;background:${globalBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${globalBg};"><tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;"><tr><td style="padding:0;">
${bodyHtml}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

/** Replace image fill placeholders with actual image URLs from Figma export API */
export function injectImages(html: string, imageMap: Record<string, string>): string {
  // Images are injected as IMG fills — the converter outputs [IMAGE:nodeId] placeholders
  let result = html;
  for (const [nodeId, url] of Object.entries(imageMap)) {
    result = result.replace(`[IMAGE:${nodeId}]`, url);
  }
  return result;
}

export function generateDummyFigmaData(): any {
  return {
    id: "1:2", name: "Email Campaign", type: "CANVAS",
    children: [
      { id: "2:1", name: "Header", type: "FRAME", fills: [{ type: "SOLID", color: { r: 0.13, g: 0.27, b: 0.89 } }],
        children: [
          { id: "2:2", name: "Logo", type: "TEXT", characters: "Campaign Lite", style: { fontFamily: "Inter", fontWeight: 700, fontSize: 24, textAlignHorizontal: "CENTER" }, fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] },
          { id: "2:3", name: "Tagline", type: "TEXT", characters: "Email marketing for freelancers", style: { fontFamily: "Inter", fontWeight: 400, fontSize: 14, textAlignHorizontal: "CENTER" }, fills: [{ type: "SOLID", color: { r: 0.85, g: 0.9, b: 1 } }] },
        ] },
      { id: "3:1", name: "Hero", type: "FRAME",
        children: [
          { id: "3:2", name: "Hero Title", type: "TEXT", characters: "Your monthly update is here!", style: { fontFamily: "Inter", fontWeight: 700, fontSize: 28, textAlignHorizontal: "CENTER" }, fills: [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }] },
          { id: "3:3", name: "Hero Subtext", type: "TEXT", characters: "We've been busy building new features just for you.", style: { fontFamily: "Inter", fontWeight: 400, fontSize: 16, textAlignHorizontal: "CENTER" }, fills: [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }] },
        ] },
      { id: "4:1", name: "Features", type: "FRAME", fills: [{ type: "SOLID", color: { r: 0.97, g: 0.97, b: 0.97 } }],
        children: [
          { id: "4:2", name: "F1 Title", type: "TEXT", characters: "Workflow Automation", style: { fontFamily: "Inter", fontWeight: 600, fontSize: 16 }, fills: [{ type: "SOLID", color: { r: 0.13, g: 0.27, b: 0.89 } }] },
          { id: "4:3", name: "F1 Desc", type: "TEXT", characters: "Build multi-step campaigns with our visual editor.", style: { fontFamily: "Inter", fontWeight: 400, fontSize: 14 }, fills: [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }] },
        ] },
      { id: "5:1", name: "CTA", type: "FRAME", fills: [{ type: "SOLID", color: { r: 0.13, g: 0.27, b: 0.89 } }],
        children: [
          { id: "5:2", name: "CTA Text", type: "TEXT", characters: "Ready to get started?", style: { fontFamily: "Inter", fontWeight: 700, fontSize: 22, textAlignHorizontal: "CENTER" }, fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] },
          { id: "5:3", name: "Button Shape", type: "RECTANGLE", cornerRadius: 24, fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }],
            children: [
              { id: "5:4", name: "Btn Text", type: "TEXT", characters: "Explore Features", style: { fontFamily: "Inter", fontWeight: 600, fontSize: 16, textAlignHorizontal: "CENTER" }, fills: [{ type: "SOLID", color: { r: 0.13, g: 0.27, b: 0.89 } }] },
            ] },
        ] },
      { id: "6:1", name: "Footer", type: "FRAME", fills: [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95 } }],
        children: [
          { id: "6:2", name: "Footer Text", type: "TEXT", characters: "Sent with Campaign Lite | Unsubscribe", style: { fontFamily: "Inter", fontWeight: 400, fontSize: 12, textAlignHorizontal: "CENTER" }, fills: [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.6 } }] },
        ] },
    ],
  };
}

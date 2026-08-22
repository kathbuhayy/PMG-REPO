// PrintHub_Backend/seedStarterTemplates.js  (new file)
/**
 * seedStarterTemplates.js
 * Inserts four original starter DesignTemplate rows for the "tshirt"
 * category, so the Templates tab isn't empty on day one. These are
 * deliberately simple - text and shapes only, no placeholder images -
 * meant as editable starting points, not finished designs. Not copies
 * of Printify's (or anyone else's) specific artwork.
 *
 * Run once from your backend folder:
 *   node seedStarterTemplates.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const templates = [
  {
    name: "Curved Logotype",
    category: "tshirt",
    baseColor: "#ffffff",
    zoneLayers: {
      front: [
        {
          id: "starter_curved_1",
          kind: "text",
          text: "YOUR BRAND",
          x: 10,
          y: 32,
          w: 80,
          h: 25,
          rotation: 0,
          fontFamily: "Bebas Neue",
          fontSize: 14,
          color: "#111827",
          bold: true,
          italic: false,
          align: "center",
          outline: false,
          outlineColor: "#ffffff",
          outlineWidth: 3,
          shadow: false,
          shadowColor: "#000000",
          shadowBlur: 4,
          curve: 45,
        },
      ],
    },
  },
  {
    name: "Circle Badge",
    category: "tshirt",
    baseColor: "#ffffff",
    zoneLayers: {
      front: [
        {
          id: "starter_badge_shape",
          kind: "shape",
          shapeType: "circle",
          x: 25,
          y: 22,
          w: 50,
          h: 50,
          rotation: 0,
          fillColor: "#111827",
        },
        {
          id: "starter_badge_text1",
          kind: "text",
          text: "ESTD",
          x: 30,
          y: 34,
          w: 40,
          h: 10,
          rotation: 0,
          fontFamily: "Oswald",
          fontSize: 8,
          color: "#ffffff",
          bold: true,
          italic: false,
          align: "center",
          outline: false,
          outlineColor: "#ffffff",
          outlineWidth: 3,
          shadow: false,
          shadowColor: "#000000",
          shadowBlur: 4,
          curve: 0,
        },
        {
          id: "starter_badge_text2",
          kind: "text",
          text: "2024",
          x: 30,
          y: 45,
          w: 40,
          h: 14,
          rotation: 0,
          fontFamily: "Bebas Neue",
          fontSize: 12,
          color: "#ffffff",
          bold: true,
          italic: false,
          align: "center",
          outline: false,
          outlineColor: "#ffffff",
          outlineWidth: 3,
          shadow: false,
          shadowColor: "#000000",
          shadowBlur: 4,
          curve: 0,
        },
      ],
    },
  },
  {
    name: "Arch & Underline",
    category: "tshirt",
    baseColor: "#ffffff",
    zoneLayers: {
      front: [
        {
          id: "starter_arch_text",
          kind: "text",
          text: "ESTABLISHED",
          x: 10,
          y: 18,
          w: 80,
          h: 20,
          rotation: 0,
          fontFamily: "Oswald",
          fontSize: 10,
          color: "#111827",
          bold: true,
          italic: false,
          align: "center",
          outline: false,
          outlineColor: "#ffffff",
          outlineWidth: 3,
          shadow: false,
          shadowColor: "#000000",
          shadowBlur: 4,
          curve: 40,
        },
        {
          id: "starter_arch_line",
          kind: "shape",
          shapeType: "line",
          x: 30,
          y: 46,
          w: 40,
          h: 3,
          rotation: 0,
          fillColor: "#111827",
        },
        {
          id: "starter_arch_subtitle",
          kind: "text",
          text: "SINCE 2024",
          x: 15,
          y: 52,
          w: 70,
          h: 14,
          rotation: 0,
          fontFamily: "Arial",
          fontSize: 8,
          color: "#111827",
          bold: false,
          italic: false,
          align: "center",
          outline: false,
          outlineColor: "#ffffff",
          outlineWidth: 3,
          shadow: false,
          shadowColor: "#000000",
          shadowBlur: 4,
          curve: 0,
        },
      ],
    },
  },
  {
    name: "Star Accent",
    category: "tshirt",
    baseColor: "#ffffff",
    zoneLayers: {
      front: [
        {
          id: "starter_star_text",
          kind: "text",
          text: "GOOD VIBES",
          x: 15,
          y: 40,
          w: 70,
          h: 20,
          rotation: 0,
          fontFamily: "Righteous",
          fontSize: 11,
          color: "#111827",
          bold: false,
          italic: false,
          align: "center",
          outline: false,
          outlineColor: "#ffffff",
          outlineWidth: 3,
          shadow: false,
          shadowColor: "#000000",
          shadowBlur: 4,
          curve: 0,
        },
        {
          id: "starter_star_shape",
          kind: "shape",
          shapeType: "star",
          x: 68,
          y: 28,
          w: 12,
          h: 12,
          rotation: 15,
          fillColor: "#d97706",
        },
      ],
    },
  },
];

async function main() {
  for (const t of templates) {
    const created = await prisma.designTemplate.create({ data: t });
    console.log(`Created template: ${created.name} (id ${created.id})`);
  }
  console.log(`\nDone - ${templates.length} starter templates added.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
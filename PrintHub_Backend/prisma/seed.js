require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("P@ssw0rd1", 10);

  await prisma.user.createMany({
    data: [
      {
        first_name: "Admin",
        last_name: "PrintHub",
        email: "admin@printhub.com",
        password: hash,
        role: 0,
        status: "active",
        join_date: new Date(),
      },
      {
        first_name: "Kat",
        last_name: "Bauu",
        email: "katbauu@gmail.com",
        password: hash,
        role: 0,
        status: "active",
        join_date: new Date(),
      },
      {
        first_name: "Kath",
        last_name: "Buhay",
        email: "kathbuhay@gmail.com",
        password: hash,
        role: 2,
        status: "active",
        join_date: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Users seeded");
}

// ─── Shared option sets ─────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  "Full Color (CMYK)",
  "Black & White",
  "1 Color (Spot)",
  "2 Colors (Spot)",
];

const SIDE_OPTIONS = ["Single Side", "Double Side"];

const FINISHING_OPTIONS = [
  "None",
  "Gloss Lamination",
  "Matte Lamination",
  "Spot UV",
  "Foil Stamping",
  "Embossing",
  "Die Cutting",
  "Rounded Corners",
  "Perforation",
  "Scoring & Folding",
];

const PROCESSING_OPTIONS = ["Standard", "Rush (24 hrs)", "Express (48 hrs)"];

const DELIVERY_OPTIONS = [
  "Pick Up",
  "Metro Manila Delivery",
  "Provincial Delivery",
  "Same Day (Metro Manila)",
];

// ─── Product seeds ───────────────────────────────────────────────────────────

const PRODUCT_SEEDS = [
  {
    name: "Business Cards",
    sku: "BC-STD",
    description: "Premium business cards printed on high-quality cardstock.",
    price: "400.00",
    stock: 500,
    print_type: "offset",
    turnaround_hours: 72,
    color_options: COLOR_OPTIONS,
    size_options: [
      "Standard 3.5x2 in",
      "Square 2.5x2.5 in",
      "Mini 3.5x1.5 in",
      "Folded 3.5x4 in",
    ],
    material_options: [
      "14pt Card Stock",
      "16pt Card Stock",
      "100lb Gloss Cover",
      "100lb Matte Cover",
      "Kraft Paper",
      "Linen Stock",
    ],
    side_options: SIDE_OPTIONS,
    finishing_options: FINISHING_OPTIONS,
    processing_options: PROCESSING_OPTIONS,
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "100 pcs|₱380.00",
      "250 pcs|₱950.00",
      "500 pcs|₱1,900.00",
      "1000 pcs|₱3,800.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    ai_prompt_rules:
      "Generate a professional business card design. " +
      "Use clean typography and ample white space. " +
      "Brand colors must be used prominently. " +
      "Include name, title, email, phone, and website. " +
      "No clipart. No gradients unless part of approved branding. " +
      "Bleed area: 0.125in on all sides. Text must be at least 7pt. " +
      "Resolution: 300dpi minimum.",
  },
  {
    name: "Flyers",
    sku: "FLY-STD",
    description: "Eye-catching flyers for promotions, events, and marketing.",
    price: "15.00",
    stock: 1000,
    print_type: "digital",
    turnaround_hours: 24,
    color_options: COLOR_OPTIONS,
    size_options: [
      "A4 (8.27x11.69 in)",
      "A5 (5.83x8.27 in)",
      "Half Letter (5.5x8.5 in)",
      "DL (3.9x8.27 in)",
    ],
    material_options: [
      "80gsm Bond Paper",
      "90gsm Bond Paper",
      "100gsm Gloss Paper",
      "100gsm Matte Paper",
      "130gsm Gloss Paper",
    ],
    side_options: SIDE_OPTIONS,
    finishing_options: ["None", "Gloss Lamination", "Matte Lamination"],
    processing_options: PROCESSING_OPTIONS,
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "50 pcs|₱712.50",
      "100 pcs|₱1,425.00",
      "250 pcs|₱3,562.50",
      "500 pcs|₱7,125.00",
      "1000 pcs|₱14,250.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    ai_prompt_rules:
      "Generate a bold, attention-grabbing flyer design. " +
      "Headline must be the largest element. " +
      "Use high-contrast color combinations. " +
      "Include call-to-action (CTA) button or text. " +
      "Contact details must be clearly visible. " +
      "Safe zone: 0.25in from all edges. " +
      "Text must not overlap complex backgrounds " +
      "without a legible overlay. Resolution: 300dpi minimum.",
  },
  {
    name: "Brochures",
    sku: "BROC-STD",
    description:
      "Professional tri-fold or bi-fold brochures for your business.",
    price: "8.00",
    stock: 500,
    print_type: "offset",
    turnaround_hours: 48,
    color_options: COLOR_OPTIONS,
    size_options: [
      "Tri-Fold A4",
      "Bi-Fold A4",
      "Tri-Fold Letter",
      "Bi-Fold Letter",
      "Z-Fold A4",
    ],
    material_options: [
      "100gsm Gloss Paper",
      "130gsm Gloss Paper",
      "150gsm Gloss Paper",
      "100gsm Matte Paper",
      "130gsm Matte Paper",
    ],
    side_options: ["Double Side"],
    finishing_options: [
      "None",
      "Gloss Lamination",
      "Matte Lamination",
      "Spot UV",
    ],
    processing_options: PROCESSING_OPTIONS,
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "100 pcs|₱760.00",
      "250 pcs|₱1,900.00",
      "500 pcs|₱3,800.00",
      "1000 pcs|₱7,600.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱200.00"],
    ai_prompt_rules:
      "Generate a clean, structured brochure layout. " +
      "Each panel must have a clear purpose: cover, " +
      "inside content, back contact info. " +
      "Use consistent brand colors and fonts throughout. " +
      "Product/service descriptions must be concise. " +
      "Include at least one image placeholder per panel. " +
      "Fold lines must be accounted for in the layout. " +
      "Resolution: 300dpi minimum.",
  },
  {
    name: "Stickers & Labels",
    sku: "STK-STD",
    description: "Custom stickers and labels for products and branding.",
    price: "4.00",
    stock: 2000,
    print_type: "digital",
    turnaround_hours: 24,
    color_options: COLOR_OPTIONS,
    size_options: [
      "1x1 in",
      "2x2 in",
      "3x3 in",
      "2x4 in",
      "3x5 in",
      "Custom Size",
    ],
    material_options: [
      "Glossy Vinyl",
      "Matte Vinyl",
      "Clear Vinyl",
      "White Bond",
      "Kraft Label",
      "Holographic",
    ],
    side_options: ["Single Side"],
    finishing_options: [
      "None",
      "Gloss Lamination",
      "Matte Lamination",
      "Die Cutting",
      "Kiss Cut",
      "Rounded Corners",
    ],
    processing_options: PROCESSING_OPTIONS,
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "50 pcs|₱190.00",
      "100 pcs|₱380.00",
      "250 pcs|₱950.00",
      "500 pcs|₱1,900.00",
      "1000 pcs|₱3,800.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱100.00"],
    ai_prompt_rules:
      "Generate a compact, visually striking sticker or label design. " +
      "Design must be fully contained within the die-cut " +
      "shape with 0.1in bleed. Important elements (logo, text) " +
      "must be 0.125in from cut edge. Background must reach " +
      "the bleed line. No thin strokes less than 0.5pt. " +
      "For clear vinyl: design must work without a white background. " +
      "Resolution: 300dpi minimum.",
  },
  {
    name: "Product Hang Tags",
    sku: "HT-STD",
    description: "Custom hang tags to brand your products and packaging.",
    price: "2.00",
    stock: 1000,
    print_type: "offset",
    turnaround_hours: 48,
    color_options: COLOR_OPTIONS,
    size_options: [
      "2x3.5 in",
      "2x4 in",
      "2.5x4 in",
      "3x5 in",
      "Rounded 2x3.5 in",
    ],
    material_options: [
      "300gsm Card Stock",
      "350gsm Card Stock",
      "Kraft Paper",
      "White Matte Board",
    ],
    side_options: SIDE_OPTIONS,
    finishing_options: [
      "None",
      "Gloss Lamination",
      "Matte Lamination",
      "Spot UV",
      "Foil Stamping",
      "Embossing",
      "Die Cutting",
      "Hole Punching",
    ],
    processing_options: PROCESSING_OPTIONS,
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "100 pcs|₱190.00",
      "250 pcs|₱475.00",
      "500 pcs|₱950.00",
      "1000 pcs|₱1,900.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    ai_prompt_rules:
      "Generate an elegant, brand-consistent hang tag design. " +
      "Front: logo, product name, tagline. Back: barcode placeholder, " +
      "price, care instructions, or social handles. Include hole " +
      "punch position at top center (0.25in from edge, 0.1875in diameter). " +
      "Maintain 0.125in bleed and 0.125in safe zone. " +
      "Luxury feel preferred: minimal text, strong typography. " +
      "Resolution: 300dpi minimum.",
  },
  {
    name: "Posters",
    sku: "POST-STD",
    description: "Vibrant full-color posters for events and advertisements.",
    price: "80.00",
    stock: 200,
    print_type: "digital",
    turnaround_hours: 24,
    color_options: COLOR_OPTIONS,
    size_options: [
      "A3 (11.69x16.54 in)",
      "A2 (16.54x23.39 in)",
      "A1 (23.39x33.11 in)",
      "12x18 in",
      "18x24 in",
      "24x36 in",
    ],
    material_options: [
      "100gsm Gloss Paper",
      "130gsm Gloss Paper",
      "170gsm Gloss Paper",
      "100gsm Matte Paper",
      "Satin Photo Paper",
    ],
    side_options: ["Single Side"],
    finishing_options: ["None", "Gloss Lamination", "Matte Lamination"],
    processing_options: PROCESSING_OPTIONS,
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "1 pc|₱80.00",
      "5 pcs|₱380.00",
      "10 pcs|₱760.00",
      "25 pcs|₱1,900.00",
      "50 pcs|₱3,800.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱200.00"],
    ai_prompt_rules:
      "Generate a high-impact poster with a dominant visual element " +
      "occupying at least 40% of the layout. Headline must be " +
      "large and legible from a distance. Use bold, contrasting colors. " +
      "Event/promo details (date, time, venue, contact) must " +
      "all be present. Keep 0.25in safe zone from trim edge. " +
      "Avoid cluttered layouts — use hierarchy: headline > " +
      "subheadline > details. Resolution: 150dpi minimum at final print size.",
  },
  {
    name: "Tarpaulin / Banners",
    sku: "TARP-STD",
    description:
      "Large format tarpaulin and banners for outdoor and indoor use.",
    price: "324.00",
    stock: 50,
    print_type: "large-format",
    turnaround_hours: 48,
    color_options: ["Full Color (CMYK)"],
    size_options: [
      "1x2 ft",
      "2x3 ft",
      "2x4 ft",
      "3x4 ft",
      "3x6 ft",
      "4x6 ft",
      "4x8 ft",
      "Custom Size",
    ],
    material_options: [
      "13oz Vinyl",
      "16oz Vinyl (Outdoor)",
      "Mesh Vinyl (Wind-resistant)",
      "Canvas",
      "Backlit Film",
    ],
    side_options: ["Single Side"],
    finishing_options: [
      "None",
      "Eyelets / Grommets",
      "Hemming",
      "Pole Pockets",
    ],
    processing_options: PROCESSING_OPTIONS,
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "1 pc|₱324.00",
      "2 pcs|₱615.60",
      "5 pcs|₱1,539.00",
      "10 pcs|₱3,078.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱300.00"],
    ai_prompt_rules:
      "Generate a large format banner design viewable from a distance. " +
      "Text must be large — minimum 1in tall per 10ft viewing distance. " +
      "Use maximum 3 fonts. High contrast between text and " +
      "background is mandatory. Include logo at top or bottom. " +
      "Business name/event must be prominent. Add bleed: 0.5in on " +
      "all sides. Avoid fine details — they will not be visible at distance. " +
      "Resolution: 100dpi at final print size (72dpi minimum).",
  },
  {
    name: "Note Cards / Thank You Cards",
    sku: "NC-STD",
    description:
      "Personalized note cards and thank-you cards for customer appreciation.",
    price: "12.00",
    stock: 500,
    print_type: "digital",
    turnaround_hours: 48,
    color_options: COLOR_OPTIONS,
    size_options: [
      "A6 (4.13x5.83 in)",
      "A7 (5.12x7.09 in)",
      "2x3.5 in",
      "4x6 in",
    ],
    material_options: [
      "300gsm Card Stock",
      "350gsm Card Stock",
      "Linen Stock",
      "Kraft Paper",
    ],
    side_options: SIDE_OPTIONS,
    finishing_options: [
      "None",
      "Gloss Lamination",
      "Matte Lamination",
      "Spot UV",
      "Foil Stamping",
      "Rounded Corners",
    ],
    processing_options: PROCESSING_OPTIONS,
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "50 pcs|₱570.00",
      "100 pcs|₱1,140.00",
      "250 pcs|₱2,850.00",
      "500 pcs|₱5,700.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    ai_prompt_rules:
      "Generate a warm, elegant card design. Tone must be personal " +
      "and appreciative. Keep design minimal — focus on the message area. " +
      "Include space for a handwritten note (blank area or lined area). " +
      "Logo and brand accent should be subtle. Use soft, " +
      "welcoming color palette. Bleed: 0.125in. Safe zone: 0.125in. " +
      "Resolution: 300dpi minimum.",
  },
  {
    name: "T-shirt",
    sku: "TS-PRINT",
    description: "Custom printed T-shirts for personal and commercial use.",
    price: "250.00",
    stock: 500,
    print_type: "screen-print",
    turnaround_hours: 120,
    color_options: ["White", "Black", "Navy Blue", "Red", "Gray"],
    size_options: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    material_options: [
      "100% Cotton - 150gsm",
      "100% Cotton - 180gsm",
      "Cotton/Poly Blend - 160gsm",
      "100% Polyester - 140gsm",
    ],
    side_options: [
      "Front Chest",
      "Back",
      "Front & Back",
      "Sleeve",
      "All Sides",
    ],
    finishing_options: ["None", "Heat Transfer", "Embroidery", "Puff Print"],
    processing_options: ["Standard", "Rush", "Express"],
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "5 pcs|₱1,187.50",
      "10 pcs|₱2,375.00",
      "25 pcs|₱5,937.50",
      "50 pcs|₱11,875.00",
      "100 pcs|₱23,750.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    print_zones: ["front", "back", "left_sleeve", "right_sleeve"],
    ai_prompt_rules:
      "Generate a vibrant T-shirt design. For screen print, limit " +
      "colors. For DTG, full color CMYK. Bleed: 0.25in. Resolution: 300dpi.",
  },
  {
    name: "Notebook",
    sku: "NB-STD",
    description: "Custom printed notebooks for school, office, and events.",
    price: "70.00",
    stock: 200,
    print_type: "offset",
    turnaround_hours: 120,
    color_options: COLOR_OPTIONS,
    size_options: ["A4", "A5", "A6", "Pocket (3.5x5.5 in)"],
    material_options: [
      "Softcover (300gsm)",
      "Hardcover",
      "Kraft Cover",
      "Leatherette Cover",
    ],
    side_options: [
      "Front Cover",
      "Back Cover",
      "Front & Back Covers",
    ],
    finishing_options: [
      "None",
      "Gloss Lamination",
      "Matte Lamination",
      "Spiral Binding",
      "Saddle Stitch",
    ],
    processing_options: PROCESSING_OPTIONS,
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "25 pcs|₱1,662.50",
      "50 pcs|₱3,325.00",
      "100 pcs|₱6,650.00",
      "200 pcs|₱13,300.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱300.00"],
    print_zones: ["front_cover", "back_cover"],
    ai_prompt_rules:
      "Generate a professional notebook cover design. Cover must " +
      "feature the brand logo prominently. Bleed: 0.125in. 300dpi.",
  },
  {
    name: "Mug",
    sku: "MUG-PRINT",
    description: "Custom sublimated ceramic mugs with full-color wrap print.",
    price: "100.00",
    stock: 300,
    print_type: "digital",
    turnaround_hours: 72,
    color_options: ["White", "Black Inside", "Blue Inside", "Red Inside"],
    size_options: ["11oz (Standard)", "15oz (Large)", "10oz (Travel)"],
    material_options: ["Ceramic - 11oz", "Ceramic - 15oz", "Enamel - 12oz"],
    side_options: [
      "Front Only",
      "Back",
      "360° Wrap",
      "Two Sides",
      "All Sides",
    ],
    finishing_options: ["None", "Gloss Finish", "Matte Finish"],
    processing_options: ["Standard", "Rush", "Express"],
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "10 pcs|₱950.00",
      "25 pcs|₱2,375.00",
      "50 pcs|₱4,750.00",
      "100 pcs|₱9,500.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    print_zones: ["front", "back", "wrap"],
    ai_prompt_rules:
      "Generate high-resolution mug wrap. Wrap size 9.25in x 3.5in. " +
      "Avoid important content near handles. Resolution: 300dpi.",
  },
  {
    name: "Cap",
    sku: "CAP-PRINT",
    description: "Custom embroidered or heat transfer caps and hats.",
    price: "250.00",
    stock: 200,
    print_type: "embroidery",
    turnaround_hours: 96,
    color_options: ["Black", "White", "Navy Blue", "Red", "Gray"],
    size_options: ["One Size (Adjustable)"],
    material_options: ["Cotton Twill", "Polyester", "Mesh Back"],
    side_options: [
      "Front Center",
      "Left Side",
      "Right Side",
      "Back Closure",
      "All Sides",
    ],
    finishing_options: ["None", "Embroidery", "Heat Transfer", "3D Embroidery"],
    processing_options: ["Standard", "Rush", "Express"],
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "10 pcs|₱2,375.00",
      "25 pcs|₱5,937.50",
      "50 pcs|₱11,875.00",
      "100 pcs|₱23,750.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    print_zones: ["front", "back", "left_side", "right_side"],
    ai_prompt_rules:
      "Generate cap embroidery. Max 4 colors. Simple shapes. " +
      "Text minimum 5mm tall. Safe area 4x2in. Resolution: 300dpi.",
  },
  {
    name: "Jersey Set",
    sku: "JERSEY-SET",
    description: "Custom sublimated athletic jersey shirts and shorts sets.",
    price: "750.00",
    stock: 150,
    print_type: "screen-print",
    turnaround_hours: 168,
    color_options: ["Custom Sublimation Design"],
    size_options: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    material_options: [
      "100% Polyester - 140gsm",
      "100% Polyester - 160gsm",
      "Moisture Wicking",
    ],
    side_options: [
      "Front",
      "Back",
      "Front & Back",
      "All Sides",
    ],
    finishing_options: [
      "None",
      "Embroidery",
      "Heat Transfer",
      "Name & Number Print",
    ],
    processing_options: ["Standard", "Rush", "Express"],
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "5 pcs|₱3,562.50",
      "10 pcs|₱7,125.00",
      "25 pcs|₱17,812.50",
      "50 pcs|₱35,625.00",
      "100 pcs|₱71,250.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    print_zones: ["front", "back", "left_sleeve", "right_sleeve"],
    ai_prompt_rules:
      "Generate full sublimated jersey. Edge-to-edge colors. " +
      "Keep text/number within safe margin of 0.5in from seams. 300dpi.",
  },
  {
    name: "Jersey (Upper Only)",
    sku: "JERSEY-UPPER",
    description: "Custom sublimated athletic jersey shirts.",
    price: "450.00",
    stock: 150,
    print_type: "screen-print",
    turnaround_hours: 168,
    color_options: ["Custom Sublimation Design"],
    size_options: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    material_options: [
      "100% Polyester - 140gsm",
      "100% Polyester - 160gsm",
      "Moisture Wicking",
    ],
    side_options: [
      "Front",
      "Back",
      "Front & Back",
      "All Sides",
    ],
    finishing_options: [
      "None",
      "Embroidery",
      "Heat Transfer",
      "Name & Number Print",
    ],
    processing_options: ["Standard", "Rush", "Express"],
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "5 pcs|₱2,137.50",
      "10 pcs|₱4,275.00",
      "25 pcs|₱10,687.50",
      "50 pcs|₱21,375.00",
      "100 pcs|₱42,750.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    print_zones: ["front", "back", "left_sleeve", "right_sleeve"],
    ai_prompt_rules:
      "Generate full sublimated jersey. Edge-to-edge colors. " +
      "Keep text/number within safe margin of 0.5in from seams. 300dpi.",
  },

  // ─── Plain (undecorated) variants ──────────────────────────────────────────

  {
    name: "T-shirt Plain",
    sku: "TS-PLAIN",
    description:
      "Plain undecorated T-shirts for personal or " +
      "commercial use — no printing included.",
    price: "200.00",
    stock: 500,
    // blank indicates plain/undecorated item to admin
    print_type: "blank",
    turnaround_hours: 48,
    color_options: ["White", "Black", "Navy Blue", "Red", "Gray"],
    size_options: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    material_options: [
      "100% Cotton - 150gsm",
      "100% Cotton - 180gsm",
      "Cotton/Poly Blend - 160gsm",
      "100% Polyester - 140gsm",
    ],
    side_options: [],
    finishing_options: ["None"],
    processing_options: ["Standard", "Rush", "Express"],
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "5 pcs|₱950.00",
      "10 pcs|₱1,900.00",
      "25 pcs|₱4,750.00",
      "50 pcs|₱9,500.00",
      "100 pcs|₱19,000.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    // empty print_zones hides the customizer natively
    print_zones: [],
    ai_prompt_rules: null,
  },
  {
    name: "Mug Plain",
    sku: "MUG-PLAIN",
    description:
      "Plain blank ceramic mugs — no sublimation or printing included.",
    price: "45.00",
    stock: 300,
    print_type: "blank",
    turnaround_hours: 24,
    color_options: ["White"],
    size_options: ["11oz (Standard)", "15oz (Large)", "10oz (Travel)"],
    material_options: ["Ceramic - 11oz", "Ceramic - 15oz", "Enamel - 12oz"],
    side_options: [],
    finishing_options: ["None"],
    processing_options: ["Standard", "Rush", "Express"],
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "10 pcs|₱427.50",
      "25 pcs|₱1,068.75",
      "50 pcs|₱2,137.50",
      "100 pcs|₱4,275.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    print_zones: [],
    ai_prompt_rules: null,
  },
  {
    name: "Cap Plain",
    sku: "CAP-PLAIN",
    description:
      "Plain undecorated caps and hats — no embroidery or printing included.",
    price: "150.00",
    stock: 200,
    print_type: "blank",
    turnaround_hours: 24,
    color_options: ["Black", "White", "Navy Blue", "Red", "Gray"],
    size_options: ["One Size (Adjustable)"],
    material_options: ["Cotton Twill", "Polyester", "Mesh Back"],
    side_options: [],
    finishing_options: ["None"],
    processing_options: ["Standard", "Rush", "Express"],
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "10 pcs|₱1,425.00",
      "25 pcs|₱3,562.50",
      "50 pcs|₱7,125.00",
      "100 pcs|₱14,250.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    print_zones: [],
    ai_prompt_rules: null,
  },
];

// Seeding and updating all configured products in the database
async function seedProducts() {
  console.log("\nSeeding products...");
  for (const p of PRODUCT_SEEDS) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        print_type: p.print_type,
        turnaround_hours: p.turnaround_hours,
        ai_prompt_rules: p.ai_prompt_rules || null,
        active: true,
        deleted_at: null, // restore/reactivate if soft-deleted previously
        color_options: p.color_options || [],
        colorOptions: p.color_options || [],
        size_options: p.size_options || [],
        material_options: p.material_options || [],
        side_options: p.side_options || [],
        finishing_options: p.finishing_options || [],
        processing_options: p.processing_options || [],
        delivery_options: p.delivery_options || [],
        quantity_options: p.quantity_options || [],
        shipping_options: p.shipping_options || [],
        print_zones: p.print_zones || [],
      },
      create: {
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: p.price,
        stock: p.stock,
        print_type: p.print_type,
        turnaround_hours: p.turnaround_hours,
        ai_prompt_rules: p.ai_prompt_rules || null,
        active: true,
        color_options: p.color_options || [],
        colorOptions: p.color_options || [],
        size_options: p.size_options || [],
        material_options: p.material_options || [],
        side_options: p.side_options || [],
        finishing_options: p.finishing_options || [],
        processing_options: p.processing_options || [],
        delivery_options: p.delivery_options || [],
        quantity_options: p.quantity_options || [],
        shipping_options: p.shipping_options || [],
        print_zones: p.print_zones || [],
        images: [],
      },
    });
    console.log(`  ✅ ${p.name} (${p.sku})`);
  }
  console.log("✅ Products seeded");
}

async function seedSampleOrder() {
  const customer = await prisma.user.findUnique({
    where: { email: "kathbuhay@gmail.com" },
  });
  const flyer = await prisma.product.findUnique({ where: { sku: "FLY-STD" } });
  const bc = await prisma.product.findUnique({ where: { sku: "BC-STD" } });

  if (customer && flyer && bc) {
    const existing = await prisma.order.findFirst({
      where: { userId: customer.id },
    });
    if (!existing) {
      const order = await prisma.order.create({
        data: {
          userId: customer.id,
          total: "1100.00",
          currency: "PHP",
          status: "pending",
          payment_status: "unpaid",
          shipping_address: "123 Sample St, Quezon City, 1100",
          items: {
            create: [
              {
                productId: flyer.id,
                quantity: 50,
                unit_price: "15.00",
                total_price: "750.00",
                customizations: {
                  size: "A4 (8.27x11.69 in)",
                  color: "Full Color (CMYK)",
                  material: "100gsm Gloss Paper",
                  side: "Double Side",
                  finishing: "None",
                  processing: "Standard",
                  delivery: "Pick Up",
                  shipping: "Pick Up|Free",
                },
              },
              {
                productId: bc.id,
                quantity: 100,
                unit_price: "3.50",
                total_price: "350.00",
                customizations: {
                  size: "Standard 3.5x2 in",
                  color: "Full Color (CMYK)",
                  material: "14pt Card Stock",
                  side: "Double Side",
                  finishing: "Gloss Lamination",
                  processing: "Standard",
                  delivery: "Pick Up",
                  shipping: "Pick Up|Free",
                },
              },
            ],
          },
        },
      });
      console.log(`\n✅ Sample order seeded (id: ${order.id})`);
    } else {
      console.log("\nℹ️  Sample order already exists, skipping");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await seedProducts();
      await seedSampleOrder();
    } catch (e) {
      console.error("Seed error:", e);
    }
    await prisma.$disconnect();
  });

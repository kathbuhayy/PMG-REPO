/**
 * Category Defaults
 * Pre-filled product options and AI prompt rules per product category.
 * Used in Admin Add/Edit Product modals to auto-populate fields.
 */

export const OPTION_THEMES = {
  color_options: {
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.1)",
    border: "rgba(37, 99, 235, 0.25)",
  },
  size_options: {
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.1)",
    border: "rgba(124, 58, 237, 0.25)",
  },
  material_options: {
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.1)",
    border: "rgba(5, 150, 105, 0.25)",
  },
  side_options: {
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.1)",
    border: "rgba(217, 119, 6, 0.25)",
  },
  finishing_options: {
    color: "#db2777",
    bg: "rgba(219, 39, 119, 0.1)",
    border: "rgba(219, 39, 119, 0.25)",
  },
  processing_options: {
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.1)",
    border: "rgba(37, 99, 235, 0.25)",
  },
  delivery_options: {
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.1)",
    border: "rgba(5, 150, 105, 0.25)",
  },
  quantity_options: {
    color: "#4f46e5",
    bg: "rgba(79, 70, 229, 0.1)",
    border: "rgba(79, 70, 229, 0.25)",
  },
  shipping_options: {
    color: "#0891b2",
    bg: "rgba(8, 145, 178, 0.1)",
    border: "rgba(8, 145, 178, 0.25)",
  },
};

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

export const CATEGORY_DEFAULTS = {
  "Business Card": {
    print_type: "offset",
    material: "14pt Card Stock",
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
      "100 pcs|₱350.00",
      "250 pcs|₱550.00",
      "500 pcs|₱850.00",
      "1000 pcs|₱1,200.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    ai_prompt_rules:
      "- Generate a professional business card design.\n" +
      "- Use clean typography and ample white space.\n" +
      "- Brand colors must be used prominently.\n" +
      "- Include name, title, email, phone, and website.\n" +
      "- No clipart.\n" +
      "- No gradients unless part of approved branding.\n" +
      "- Bleed area: 0.125in on all sides.\n" +
      "- Text must be at least 7pt.\n" +
      "- Resolution: 300dpi minimum.",
  },

  Brochures: {
    print_type: "offset",
    material: "130gsm Gloss Paper",
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
      "100 pcs|₱2,500.00",
      "250 pcs|₱4,000.00",
      "500 pcs|₱6,500.00",
      "1000 pcs|₱10,000.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱200.00"],
    ai_prompt_rules:
      "- Generate a clean, structured brochure layout.\n" +
      "- Each panel must have a clear purpose (cover, inside, back).\n" +
      "- Use consistent brand colors and fonts throughout.\n" +
      "- Product/service descriptions must be concise.\n" +
      "- Include at least one image placeholder per panel.\n" +
      "- Fold lines must be accounted for in the layout.\n" +
      "- Resolution: 300dpi minimum.",
  },

  "Stickers & Labels": {
    print_type: "digital",
    material: "Glossy Vinyl",
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
      "50 pcs|₱250.00",
      "100 pcs|₱400.00",
      "250 pcs|₱750.00",
      "500 pcs|₱1,200.00",
      "1000 pcs|₱2,000.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱100.00"],
    ai_prompt_rules:
      "- Generate a compact, visually striking sticker/label design.\n" +
      "- Design must be contained within die-cut shape (0.1in bleed).\n" +
      "- Important elements must be 0.125in from cut edge.\n" +
      "- Background must reach the bleed line.\n" +
      "- No thin strokes less than 0.5pt.\n" +
      "- For clear vinyl: design must work without white background.\n" +
      "- Resolution: 300dpi minimum.",
  },

  "Hang Tags": {
    print_type: "offset",
    material: "350gsm Card Stock",
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
      "100 pcs|₱800.00",
      "250 pcs|₱1,500.00",
      "500 pcs|₱2,500.00",
      "1000 pcs|₱4,000.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱150.00"],
    ai_prompt_rules:
      "- Generate an elegant, brand-consistent hang tag design.\n" +
      "- Front: logo, product name, tagline.\n" +
      "- Back: barcode placeholder, price, care info, social handles.\n" +
      "- Include hole position (0.25in from top edge, 0.1875in dia).\n" +
      "- Maintain 0.125in bleed and 0.125in safe zone.\n" +
      "- Luxury feel preferred: minimal text, strong typography.\n" +
      "- Resolution: 300dpi minimum.",
  },

  Banners: {
    print_type: "large-format",
    material: "13oz Vinyl",
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
      "1 pc|₱350.00",
      "2 pcs|₱650.00",
      "5 pcs|₱1,500.00",
      "10 pcs|₱2,800.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱300.00"],
    ai_prompt_rules:
      "- Generate a large format banner viewable from a distance.\n" +
      "- Text must be large (min 1in per 10ft viewing distance).\n" +
      "- Use maximum 3 fonts.\n" +
      "- High contrast between text and background is mandatory.\n" +
      "- Include logo at top or bottom.\n" +
      "- Business name/event must be prominent.\n" +
      "- Add bleed: 0.5in on all sides.\n" +
      "- Avoid fine details — they will not be visible.\n" +
      "- Resolution: 100dpi at final print size (72dpi minimum).",
  },

  Notebook: {
    print_type: "offset",
    material: "Softcover (300gsm)",
    color_options: COLOR_OPTIONS,
    size_options: ["A4", "A5", "A6", "Pocket (3.5x5.5 in)"],
    material_options: [
      "Softcover (300gsm)",
      "Hardcover",
      "Kraft Cover",
      "Leatherette Cover",
    ],
    side_options: ["Single Side"],
    finishing_options: [
      "None",
      "Gloss Lamination",
      "Matte Lamination",
      "Spot UV",
      "Embossing",
      "Foil Stamping",
      "Spiral Binding",
      "Saddle Stitch",
    ],
    processing_options: PROCESSING_OPTIONS,
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "25 pcs|₱3,000.00",
      "50 pcs|₱5,500.00",
      "100 pcs|₱10,000.00",
      "200 pcs|₱18,000.00",
    ],
    shipping_options: ["Pick Up|Free", "Delivery|₱300.00"],
    ai_prompt_rules:
      "- Generate a professional notebook cover design.\n" +
      "- Cover must feature the brand logo prominently.\n" +
      "- Use clean layout with title area.\n" +
      "- Spine width must be accounted for in the layout.\n" +
      "- Back cover: include website, tagline, or barcode.\n" +
      "- Colors must be consistent with brand identity.\n" +
      "- Embossing/foil areas marked as separate spot layers.\n" +
      "- Bleed: 0.125in.\n" +
      "- Resolution: 300dpi minimum.",
  },

  "T-shirts": {
    print_type: "screen-print",
    material: "100% Cotton - 150gsm",
    color_options: [
      "Full Color (CMYK) - Direct-to-Garment",
      "Full Color (Plastisol) - Screen Print",
      "Single Color - Screen Print",
      "Multi-Color - Screen Print",
    ],
    size_options: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    material_options: [
      "100% Cotton - 150gsm",
      "100% Cotton - 180gsm",
      "Cotton/Poly Blend - 160gsm",
      "100% Polyester - 140gsm",
      "Organic Cotton - 150gsm",
    ],
    side_options: [
      "Front Chest",
      "Back",
      "Front & Back",
      "Sleeve",
      "All Sides",
    ],
    finishing_options: [
      "None",
      "Heat Transfer",
      "Embroidery",
      "Puff Print",
      "Foil",
      "Rhinestone",
      "Glow-in-the-Dark",
      "Metallic Print",
    ],
    processing_options: [
      "Standard (5-7 days)",
      "Rush (3-4 days)",
      "Express (1-2 days)",
    ],
    delivery_options: DELIVERY_OPTIONS,
    quantity_options: [
      "5 pcs|₱500.00",
      "10 pcs|₱450.00",
      "25 pcs|₱420.00",
      "50 pcs|₱400.00",
      "100 pcs|₱380.00",
      "250 pcs|₱350.00",
      "500 pcs|₱320.00",
    ],
    shipping_options: [
      "Pick Up|Free",
      "Metro Delivery|₱150.00",
      "Provincial|₱300.00",
    ],
    ai_prompt_rules:
      "- Generate a vibrant T-shirt design.\n" +
      "- For screen print: limit to 4-6 colors for cost efficiency.\n" +
      "- Design must work on the specified print area.\n" +
      "- Include color specs in CMYK or PMS if multi-color.\n" +
      "- Avoid small fine details that won't transfer well.\n" +
      "- Design should scale well across all sizes.\n" +
      "- Safe margin: 0.25in from print edges.\n" +
      "- For DTG: can use full color spectrum without limitations.\n" +
      "- Include a mockup guide indicating placement.\n" +
      "- Resolution: 300dpi minimum.",
  },
  "Jersey": {
    "print_type": "screen-print",
    "material": "100% Polyester - 140gsm",
    "color_options": [
      "Full Color (CMYK) - Sublimation",
      "Full Color (Plastisol) - Screen Print",
      "Single Color - Screen Print",
      "Multi-Color - Screen Print"
    ],
    "size_options": ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    "material_options": [
      "100% Polyester - 140gsm",
      "100% Polyester - 160gsm",
      "Cotton/Poly Blend - 150gsm",
      "Moisture Wicking - 130gsm",
      "Mesh Fabric - 120gsm"
    ],
    "side_options": [
      "Front",
      "Back",
      "Front & Back",
      "All Sides"
    ],
    "finishing_options": [
      "None",
      "Embroidery",
      "Heat Transfer",
      "Sublimation",
      "Screen Print",
      "Name & Number Print"
    ],
    "processing_options": [
      "Standard (7-10 days)",
      "Rush (4-5 days)",
      "Express (2-3 days)"
    ],
    "delivery_options": DELIVERY_OPTIONS,
    "quantity_options": [
      "5 pcs|₱1,200.00",
      "10 pcs|₱1,100.00",
      "25 pcs|₱1,000.00",
      "50 pcs|₱900.00",
      "100 pcs|₱800.00",
      "250 pcs|₱700.00"
    ],
    "shipping_options": [
      "Pick Up|Free",
      "Metro Delivery|₱150.00",
      "Provincial|₱300.00"
    ],
    "ai_prompt_rules":
      "- Generate a sporty jersey design.\n" +
      "- For sublimation: full color with seamless edges.\n" +
      "- For screen print: max 4-6 colors.\n" +
      "- Design must include front chest and back number area.\n" +
      "- Maintain safe margin of 0.5in from seams.\n" +
      "- High contrast numbers if included.\n" +
      "- Avoid designs that stretch across seams.\n" +
      "- Resolution: 300dpi minimum.\n" +
      "- Include placement guide for all print areas."
  },
  "Cap": {
    "print_type": "embroidery",
    "material": "Cotton Twill",
    "color_options": [
      "Single Color - Embroidery",
      "Multi-Color (max 4) - Embroidery",
      "Full Color - Heat Transfer",
      "Full Color - DTG"
    ],
    "size_options": ["One Size (Adjustable)", "S/M", "L/XL", "Custom Fit"],
    "material_options": [
      "Cotton Twill",
      "Polyester",
      "Cotton/Poly Blend",
      "Mesh Back",
      "Denim",
      "Acrylic Wool",
      "Leather Patch"
    ],
    "side_options": [
      "Front Center",
      "Left Side",
      "Right Side",
      "Back Closure",
      "All Sides"
    ],
    "finishing_options": [
      "None",
      "Embroidery",
      "Heat Transfer",
      "3D Embroidery (Puffy)",
      "Leather Patch",
      "PVC Patch",
      "Velcro Backing"
    ],
    "processing_options": [
      "Standard (5-7 days)",
      "Rush (3-4 days)",
      "Express (1-2 days)"
    ],
    "delivery_options": DELIVERY_OPTIONS,
    "quantity_options": [
      "10 pcs|₱650.00",
      "25 pcs|₱600.00",
      "50 pcs|₱550.00",
      "100 pcs|₱500.00",
      "250 pcs|₱450.00",
      "500 pcs|₱400.00"
    ],
    "shipping_options": [
      "Pick Up|Free",
      "Metro Delivery|₱150.00",
      "Provincial|₱250.00"
    ],
    "ai_prompt_rules":
      "- Generate a cap/hat design.\n" +
      "- For embroidery: limit to max 4 colors, simple shapes.\n" +
      "- Text minimum 5mm tall. No details under 2mm.\n" +
      "- Provide stitch count estimate.\n" +
      "- For patch: include border outline.\n" +
      "- Design must fit within 4x2 inches max for front panel.\n" +
      "- Center placement is default.\n" +
      "- Include mockup showing curved surface wrap.\n" +
      "- Vector format preferred.\n" +
      "- Resolution: 300dpi minimum (vector for embroidery)."
  },
  "Mug": {
    "print_type": "digital",
    "material": "Ceramic - 11oz",
    "color_options": ["Full Color (CMYK) - Sublimation"],
    "size_options": [
      "11oz (Standard)",
      "15oz (Large)",
      "10oz (Travel)",
      "12oz (Tall)",
      "Whiskey Glass"
    ],
    "material_options": [
      "Ceramic - 11oz",
      "Ceramic - 15oz",
      "Enamel - 12oz",
      "Glass - 11oz",
      "Stainless Steel",
      "Travel Mug with Lid"
    ],
    "side_options": ["Front Only", "Back", "360° Wrap", "Two Sides", "All Sides"],
    "finishing_options": [
      "None",
      "Gloss Finish",
      "Matte Finish",
      "Color Inside",
      "Color Handle"
    ],
    "processing_options": [
      "Standard (5-7 days)",
      "Rush (3-4 days)",
      "Express (2 days)"
    ],
    "delivery_options": DELIVERY_OPTIONS,
    "quantity_options": [
      "10 pcs|₱350.00",
      "25 pcs|₱320.00",
      "50 pcs|₱290.00",
      "100 pcs|₱260.00",
      "250 pcs|₱230.00",
      "500 pcs|₱200.00"
    ],
    "shipping_options": [
      "Pick Up|Free",
      "Metro Delivery|₱150.00",
      "Provincial|₱350.00"
    ],
    "ai_prompt_rules":
      "- Generate a mug design for sublimation printing.\n" +
      "- Full color CMYK with no limitations.\n" +
      "- For 360 wrap: design width 9.25in x 3.5in height (11oz).\n" +
      "- Keep elements within front-facing 4x3in safe zone.\n" +
      "- Avoid placing text on handle side or bottom.\n" +
      "- Seam allowance: 0.125in at both ends.\n" +
      "- High resolution photos acceptable.\n" +
      "- White background = white ceramic.\n" +
      "- Resolution: 300dpi minimum at print size."
  },
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_DEFAULTS);

// Mapping of categories to their supported 3D customizer printable areas
export const CUSTOMIZER_ZONES = {
  "T-shirts": [
    { id: "front", label: "Front Chest", sideOption: "Front Chest" },
    { id: "back", label: "Back", sideOption: "Back" },
    { id: "left_sleeve", label: "Left Sleeve", sideOption: "Sleeve" },
    { id: "right_sleeve", label: "Right Sleeve", sideOption: "Sleeve" },
  ],
  "Jersey": [
    { id: "front", label: "Front", sideOption: "Front" },
    { id: "back", label: "Back", sideOption: "Back" },
    { id: "left_sleeve", label: "Left Sleeve", sideOption: "Sleeve (Left)" },
    { id: "right_sleeve", label: "Right Sleeve", sideOption: "Sleeve (Right)" },
  ],
  "Cap": [
    { id: "front", label: "Front Center", sideOption: "Front Center" },
    { id: "back", label: "Back Closure", sideOption: "Back Closure" },
    { id: "left_side", label: "Left Side", sideOption: "Left Side" },
    { id: "right_side", label: "Right Side", sideOption: "Right Side" },
  ],
  "Mug": [
    { id: "front", label: "Front Only", sideOption: "Front Only" },
    { id: "back", label: "Back", sideOption: "Back" },
    { id: "wrap", label: "360° Wrap", sideOption: "360° Wrap" },
  ],
  "Notebook": [
    { id: "front_cover", label: "Front Cover", sideOption: "Front Cover" },
    { id: "back_cover", label: "Back Cover", sideOption: "Back Cover" },
  ],
  // ── New: previously fell through to "no customizer" ──────────────
  "Business Card": [
    { id: "front", label: "Front", sideOption: "Single Side" },
    { id: "back", label: "Back", sideOption: "Double Side" },
  ],
  "Brochures": [
    { id: "front", label: "Front", sideOption: "Double Side" },
    { id: "back", label: "Back", sideOption: "Double Side" },
  ],
  "Hang Tags": [
    { id: "front", label: "Front", sideOption: "Single Side" },
    { id: "back", label: "Back", sideOption: "Double Side" },
  ],
  "Banners": [
    { id: "front", label: "Front", sideOption: "Single Side" },
  ],
};

/** Returns a blank form state with empty option arrays */
export const blankProductForm = (extra = {}) => ({
  name: "",
  sku: "",
  price: "",
  stock: "",
  print_type: "offset",
  material: "",
  description: "",
  ai_prompt_rules: "",
  images: [],
  color_options: [],
  size_options: [],
  material_options: [],
  side_options: [],
  finishing_options: [],
  processing_options: [],
  delivery_options: [],
  quantity_options: [],
  shipping_options: [],
  ...extra,
});

export const categoryMapping = {
  Clothing: ["T-Shirt", "Jersey", "Cap"],
  Business: [
    "Note Cards",
    "Brochure",
    "Flyer",
    "Business Card",
    "Poster",
    "Banners",
  ],
  Labels: ["Hang Tags", "stickers", "Mug", "Notebook"],
};

export const getProductCategory = (product) => {
  if (!product) return "Print";
  const printType = product.print_type || product.category || "";
  const name = product.name || product.title || "";
  const matched = Object.entries(categoryMapping).find(([, items]) =>
    items.some(
      (item) =>
        printType.toLowerCase().includes(item.toLowerCase()) ||
        name.toLowerCase().includes(item.toLowerCase()),
    ),
  );
  return matched?.[0] || product.category || "Print";
};

/**
 * Filters active zones based on selectedSide specification.
 */
export const filterZonesBySide = (allZones, selectedSide, designType) => {
  if (!selectedSide || !allZones || allZones.length === 0) {
    return allZones || [];
  }

  const sideLower = selectedSide.toLowerCase();

  // 1. Return all zones if it represents a composite/full print option
  if (
    sideLower.includes("all sides") ||
    sideLower.includes("all panels") ||
    sideLower.includes("any side") ||
    sideLower.includes("full panel") ||
    sideLower.includes("full sublimation") ||
    sideLower.includes("wrap") ||
    sideLower.includes("double") ||
    sideLower.includes("two") ||
    sideLower.includes("both")
  ) {
    return allZones;
  }

  // 2. Map standard categories
  let zoneKey = null;
  const cat = String(designType || "").toLowerCase();
  if (cat === "tshirt" || cat === "t-shirt") zoneKey = "T-shirts";
  else if (cat === "cap") zoneKey = "Cap";
  else if (cat === "jersey") zoneKey = "Jersey";
  else if (cat === "mug") zoneKey = "Mug";
  else if (cat === "notebook") zoneKey = "Notebook";

  if (zoneKey && CUSTOMIZER_ZONES[zoneKey]) {
    const mappedZones = CUSTOMIZER_ZONES[zoneKey];
    const sideParts = sideLower.split(/&|and|\//).map((s) => s.trim());
    const matchedZoneIds = mappedZones
      .filter((mz) => {
        const optionLower = String(mz.sideOption || "").toLowerCase();
        return sideParts.some(
          (part) =>
            part.includes(optionLower) || optionLower.includes(part)
        );
      })
      .map((mz) => mz.id);

    const filtered = allZones.filter((id) => matchedZoneIds.includes(id));
    if (filtered.length > 0) return filtered;
  }

  // 3. Heuristic fallback
  if (
    sideLower.includes("single") ||
    sideLower.includes("front") ||
    sideLower.includes("outside")
  ) {
    const firstFront = allZones.find(
      (z) => z.includes("front") || z.includes("outside")
    );
    return firstFront ? [firstFront] : [allZones[0]];
  }

  if (sideLower.includes("back") || sideLower.includes("inside")) {
    const firstBack = allZones.find(
      (z) => z.includes("back") || z.includes("inside")
    );
    return firstBack ? [firstBack] : [allZones[0]];
  }

  return allZones;
};

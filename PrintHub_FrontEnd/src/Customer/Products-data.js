const productsData = [
  {
    id: 1,
    category: "Business",
    title: "Business Cards (Calling Cards)",
    image:
      "https://plus.unsplash.com/premium_photo-1752231848995-c86b499ada20?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description:
      "Design business cards with your company details. Choose from premium materials, double-sided printing, and clean professional finishes.",
    gallery: [
      "https://plus.unsplash.com/premium_photo-1752231847954-e6295c9eb0ed?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://plus.unsplash.com/premium_photo-1752231847575-3ac4e0dda918?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://plus.unsplash.com/premium_photo-1752231227830-20cee47c4663?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
    sizes: ["Standard (3.5 x 2 in)"],
    materials: [
      "Coated 2 Sides Card 300gsm",
      "Coated 2 Sides Card 350gsm",
      "Premium Italian Smooth Uncoated White Card 340gsm",
    ],
    sides: ["4/0 - Single-sided full-colour", "4/4 - Double-sided full-colour"],
    finishing: [
      "No luxury finishing (standard)",
      "1-sided matt laminate",
      "2-sided gloss laminate",
    ],
    colors: ["Full color", "Black and white"],
    processing: ["None", "Cutting"],
    quantities: [
      { label: "100 pieces (1 box)", price: "₱1,270.50" },
      { label: "200 pieces (2 boxes)", price: "₱1,732.50" },
      { label: "300 pieces (3 boxes)", price: "₱2,079.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱462.00" },
    ],
  },

  {
    id: 2,
    category: "Photo Products",
    title: "Mug Printing",
    image:
      "https://images.unsplash.com/photo-1763627719014-0ea46e97a5d5?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description:
      "Custom mug printing for gifts, branding, and promotional use with vibrant full-colour designs.",
    gallery: [
      "https://images.unsplash.com/photo-1662261896017-c66dd6ad5932?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1735380673271-c5bfd0902d25?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1634937916226-3ad02c1c7feb?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
    sizes: ["11 oz", "15 oz"],
    materials: ["Ceramic Mug", "Premium Ceramic Mug"],
    sides: ["Single-sided print", "Wrap-around print"],
    finishing: ["Gloss finish"],
    colors: ["Full color"],
    processing: ["None"],
    quantities: [
      { label: "1 piece", price: "₱180.00" },
      { label: "10 pieces", price: "₱1,600.00" },
      { label: "25 pieces", price: "₱3,750.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱250.00" },
    ],
  },

  {
    id: 3,
    category: "Clothing/Apparel",
    title: "T-shirt Printing",
    image:
      "https://images.unsplash.com/photo-1564864310852-e1e98eb07010?q=80&w=1476&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description:
      "High-quality t-shirt printing for personal use, business uniforms, and event merchandise.",
    gallery: [
      "https://images.unsplash.com/photo-1704095371948-58d1f95d8064?q=80&w=1474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1730952773686-feb6da6156af?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1579565577762-78f2d9dd042e?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
    sizes: ["Small", "Medium", "Large", "XL"],
    materials: ["Cotton Shirt", "Dry Fit Shirt"],
    sides: ["Front print only", "Front and back print"],
    finishing: ["Standard print finish"],
    colors: ["Full color", "Black and white", "Single color"],
    processing: ["None", "Embroidery"],
    quantities: [
      { label: "1 piece", price: "₱250.00" },
      { label: "10 pieces", price: "₱2,200.00" },
      { label: "50 pieces", price: "₱10,000.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱300.00" },
    ],
  },

  {
    id: 4,
    category: "Labels & Packaging",
    title: "Sticker Printing",
    image:
      "https://images.unsplash.com/photo-1593747176945-ef77e62547eb?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description:
      "Custom sticker printing for packaging, branding, labeling, and product decoration.",
    gallery: [
      "https://images.unsplash.com/photo-1773504356139-3600da3289ca?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1773904215704-139e9ff8c894?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1616573651508-6fb135fc59f6?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3Dt&fit=crop&w=900&q=80",
    ],
    sizes: ["2 x 2 in", "3 x 3 in", "Custom size"],
    materials: ["Matte Sticker Paper", "Gloss Sticker Paper", "Vinyl"],
    sides: ["Full-colour print"],
    finishing: ["Kiss cut", "Die cut"],
    colors: ["Full color", "Black and white"],
    processing: ["None", "Kiss cut", "Die cut"],
    quantities: [
      { label: "50 pieces", price: "₱250.00" },
      { label: "100 pieces", price: "₱450.00" },
      { label: "500 pieces", price: "₱1,800.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱250.00" },
    ],
  },

  {
    id: 5,
    category: "Photo Products",
    title: "Photo Printing",
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
    description:
      "Sharp and vibrant photo prints for keepsakes, albums, and framed displays.",
    gallery: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
    ],
    sizes: ["4R", "5R", "8R"],
    materials: ["Gloss Photo Paper", "Matte Photo Paper"],
    sides: ["Single-sided print"],
    finishing: ["Standard"],
    colors: ["Full color", "Black and white"],
    processing: ["None"],
    quantities: [
      { label: "10 prints", price: "₱120.00" },
      { label: "25 prints", price: "₱250.00" },
      { label: "50 prints", price: "₱480.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱180.00" },
    ],
  },

  {
    id: 6,
    category: "Clothing/Apparel",
    title: "DTF Printing",
    image:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
    description:
      "Direct-to-film printing for detailed and durable garment customization.",
    gallery: [
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1503342394128-c104d54dba01?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80",
    ],
    sizes: ["A4 Transfer", "A3 Transfer", "Custom"],
    materials: ["DTF Film"],
    sides: ["Single-sided transfer"],
    finishing: ["Heat press application"],
    colors: ["Full color", "Black and white"],
    processing: ["None", "Heat press application"],
    quantities: [
      { label: "10 sheets", price: "₱500.00" },
      { label: "25 sheets", price: "₱1,150.00" },
      { label: "50 sheets", price: "₱2,200.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱250.00" },
    ],
  },

  {
    id: 7,
    category: "Labels & Packaging",
    title: "PVC ID & Lanyards",
    image:
      "https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&w=900&q=80",
    description:
      "Professional PVC IDs and custom lanyards for schools, offices, and events.",
    gallery: [
      "https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
    ],
    sizes: ["Standard ID size"],
    materials: ["PVC Card", "Fabric Lanyard"],
    sides: ["Single-sided print", "Double-sided print"],
    finishing: ["With holder", "With clip"],
    colors: ["Full color", "Single color"],
    processing: ["None", "Cutting", "Packaging"],
    quantities: [
      { label: "10 sets", price: "₱900.00" },
      { label: "25 sets", price: "₱2,000.00" },
      { label: "50 sets", price: "₱3,750.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱250.00" },
    ],
  },

  {
    id: 8,
    category: "Business",
    title: "Invitation Cards",
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=80",
    description:
      "Elegant invitation cards for events, weddings, and celebrations with quality paper stock and vibrant printing.",
    gallery: [
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1460978812857-470ed1c77af0?auto=format&fit=crop&w=900&q=80",
    ],
    sizes: ["5 x 7 in", "A5"],
    materials: ["Matte Card", "Gloss Card", "Textured Premium Card"],
    sides: ["4/0 - Single-sided full-colour", "4/4 - Double-sided full-colour"],
    finishing: ["No luxury finishing (standard)", "Gloss laminate"],
    colors: ["Full color", "Black and white"],
    processing: ["None", "Folding", "Cutting"],
    quantities: [
      { label: "50 pieces", price: "₱850.00" },
      { label: "100 pieces", price: "₱1,450.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱350.00" },
    ],
  },

  {
    id: 9,
    category: "Photo Products",
    title: "Shirts",
    image:
      "https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=900&q=80",
    description:
      "Printed shirts for casual wear, branding, uniforms, and custom events.",
    gallery: [
      "https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=80",
    ],
    sizes: ["Small", "Medium", "Large", "XL"],
    materials: ["Cotton", "Dry Fit"],
    sides: ["Front only", "Front and back"],
    finishing: ["Standard print"],
    colors: ["Full color", "Black and white", "Single color"],
    processing: ["None"],
    quantities: [
      { label: "1 piece", price: "₱250.00" },
      { label: "10 pieces", price: "₱2,200.00" },
      { label: "50 pieces", price: "₱10,000.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱300.00" },
    ],
  },

  {
    id: 10,
    category: "Clothing/Apparel",
    title: "Hoodies",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
    description:
      "Custom hoodie printing for school orgs, businesses, and apparel brands.",
    gallery: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=80",
    ],
    sizes: ["Small", "Medium", "Large", "XL"],
    materials: ["Fleece", "Cotton Blend"],
    sides: ["Front only", "Front and back"],
    finishing: ["Standard print"],
    colors: ["Full color", "Black and white", "Single color"],
    processing: ["None"],
    quantities: [
      { label: "1 piece", price: "₱650.00" },
      { label: "10 pieces", price: "₱6,000.00" },
      { label: "25 pieces", price: "₱14,000.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱350.00" },
    ],
  },

  {
    id: 11,
    category: "Labels & Packaging",
    title: "Folders",
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
    description:
      "Presentation folders for school, office, and branded document packaging.",
    gallery: [
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80",
    ],
    sizes: ["A4", "Letter size"],
    materials: ["Matte Card", "Gloss Card"],
    sides: ["4/0 - Single-sided full-colour", "4/4 - Double-sided full-colour"],
    finishing: ["Pocket folder", "No pocket"],
    colors: ["Full color", "Black and white"],
    processing: ["None", "Cutting", "Binding"],
    quantities: [
      { label: "50 pieces", price: "₱1,250.00" },
      { label: "100 pieces", price: "₱2,300.00" },
      { label: "250 pieces", price: "₱5,000.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱300.00" },
    ],
  },

  {
    id: 12,
    category: "Business",
    title: "Brochures",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80",
    description:
      "Printed brochures for marketing and promotions with folding options and premium full-colour print.",
    gallery: [
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80",
    ],
    sizes: ["A4", "A5", "Tri-fold"],
    materials: ["Gloss Paper", "Matte Paper", "Premium Card"],
    sides: ["4/4 - Double-sided full-colour"],
    finishing: ["Folded", "Flat"],
    colors: ["Full color", "Black and white"],
    processing: ["None", "Folding", "Cutting", "Binding", "Packaging"],
    quantities: [
      { label: "100 copies", price: "₱1,500.00" },
      { label: "250 copies", price: "₱2,900.00" },
    ],
    shipping: [
      { label: "Standard", price: "Free" },
      { label: "Express", price: "+ ₱400.00" },
    ],
  },
];

export default productsData;

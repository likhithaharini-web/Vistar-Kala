const { sequelize, User, ArtisanProfile, BuyerProfile, Product, ProductImage } = require('./models');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to the database.');

    // Sync just in case
    await sequelize.sync();

    console.log('Creating demo users...');
    
    // Create Artisan User
    const artisanPasswordHash = await bcrypt.hash('artisan123', 12);
    const [artisanUser] = await User.findOrCreate({
      where: { phone: '9999999999' },
      defaults: {
        phone: '9999999999',
        name: 'Demo Artisan',
        passwordHash: artisanPasswordHash,
        role: 'artisan',
        isPhoneVerified: true
      }
    });

    await ArtisanProfile.findOrCreate({
      where: { userId: artisanUser.id },
      defaults: { userId: artisanUser.id }
    });

    // Create B2B User
    const buyerPasswordHash = await bcrypt.hash('buyer1234', 12);
    const [buyerUser] = await User.findOrCreate({
      where: { phone: '8888888888' },
      defaults: {
        phone: '8888888888',
        name: 'Demo B2B Buyer',
        passwordHash: buyerPasswordHash,
        role: 'buyer',
        isPhoneVerified: true
      }
    });

    await BuyerProfile.findOrCreate({
      where: { userId: buyerUser.id },
      defaults: { userId: buyerUser.id }
    });

    console.log('Demo users created.');

    console.log('Cleaning old demo products...');
    await Product.destroy({ where: { artisanId: [artisanUser.id, buyerUser.id] }});

    console.log('Creating Artisan products...');

    const artisanProducts = [
      {
        name: "Authentic Kalamkari Hand-Painted Fabric",
        description: "Intricate natural dye Kalamkari painting depicting traditional motifs. Handcrafted by master artisans over 15 days.",
        category: "kalamkari",
        material: "Cotton",
        price: 3500,
        quantity: 1,
        isHandmade: true,
        isGI: true
      },
      {
        name: "Traditional Madhubani Peacock Canvas",
        description: "Vibrant Madhubani painting from Bihar, featuring the classic peacock motif symbolizing grace and beauty. Done with natural pigments.",
        category: "madhubani",
        material: "Handmade Paper",
        price: 4200,
        quantity: 3,
        isHandmade: true,
        isGI: true
      },
      {
        name: "Warli Village Life Canvas Art",
        description: "Minimalist tribal Warli art representing a traditional Maharashtrian village scene. Painted with white rice paste on an earthen background.",
        category: "warli",
        material: "Canvas",
        price: 1800,
        quantity: 5,
        isHandmade: true,
        isGI: true
      },
      {
        name: "Pochampally Ikat Handwoven Saree",
        description: "Premium double Ikat silk saree from Pochampally, featuring complex geometric patterns woven by skilled weavers.",
        category: "ikat",
        material: "Silk",
        price: 12500,
        quantity: 2,
        isHandmade: true,
        isGI: true
      },
      {
        name: "Jaipur Blue Pottery Decorative Vase",
        description: "Exquisite blue pottery vase from Jaipur. Made without clay using traditional quartz stone and painted with vibrant cobalt blue motifs.",
        category: "pottery",
        material: "Quartz Paste",
        price: 2800,
        quantity: 4,
        isHandmade: true,
        isGI: true
      },
      {
        name: "Bastar Dhokra Metal Tribal Figurine",
        description: "Ancient lost-wax metal casting craft (Dhokra) from Bastar. Represents tribal deities with detailed brass mesh work.",
        category: "dhokra",
        material: "Brass",
        price: 3100,
        quantity: 3,
        isHandmade: true,
        isGI: true
      },
      {
        name: "Handcrafted Terracotta Elephant Sculpture",
        description: "A beautifully detailed baked earth (terracotta) elephant sculpture. Completely handmade using traditional wheel and molding techniques.",
        category: "terracotta",
        material: "Clay",
        price: 1200,
        quantity: 8,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Sandalwood Intricate Carved Elephant",
        description: "Highly detailed wooden handicraft carved from genuine sandalwood. Emits a natural fragrance.",
        category: "woodwork",
        material: "Sandalwood",
        price: 6500,
        quantity: 1,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Northeast Handwoven Bamboo Basket",
        description: "A tightly woven, durable bamboo basket, utilizing generations-old weaving techniques from Northeast India.",
        category: "bamboo",
        material: "Bamboo",
        price: 850,
        quantity: 15,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Handmade Brass Puja Thali Set",
        description: "Traditional brass craft. This complete puja set features intricate floral engravings and a brilliant polish.",
        category: "brassware",
        material: "Brass",
        price: 2400,
        quantity: 6,
        isHandmade: true,
        isGI: false
      }
    ];

    for (let pData of artisanProducts) {
      const product = await Product.create({
        ...pData,
        artisanId: artisanUser.id,
        status: 'PUBLISHED'
      });
      // Add a placeholder image
      await ProductImage.create({
        productId: product.id,
        url: `https://picsum.photos/seed/${product.id}/800/800`,
        type: 'ORIGINAL'
      });
    }

    console.log('Creating B2B wholesale products...');

    const b2bProducts = [
      {
        name: "Bulk Cotton Handloom Fabric (per 100 meters)",
        description: "High-quality, hand-spun cotton fabric available for bulk B2B purchasing. Ideal for boutique clothing lines.",
        category: "handloom",
        material: "Cotton",
        price: 45000,
        quantity: 500,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Wholesale Assorted Wooden Handicrafts (Set of 50)",
        description: "A mixed assortment of small carved wooden toys, keychains, and showpieces. Perfect for retail boutiques.",
        category: "woodwork",
        material: "Wood",
        price: 15000,
        quantity: 100,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Bulk Terracotta Diyas (Box of 1000)",
        description: "Traditional handmade clay diyas ready for the festive season. Carefully packed to prevent breakage during shipping.",
        category: "terracotta",
        material: "Clay",
        price: 8000,
        quantity: 2000,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Wholesale Brass Decorative Bowls (Set of 20)",
        description: "Elegant brass bowls with hammered finish. Great for corporate gifting or retail home decor.",
        category: "brassware",
        material: "Brass",
        price: 18000,
        quantity: 50,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Bulk Handmade Jute Tote Bags (Pack of 100)",
        description: "Eco-friendly, highly durable jute bags with ethnic block prints. Ideal for sustainable brands.",
        category: "jute",
        material: "Jute",
        price: 12000,
        quantity: 300,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Wholesale Kalamkari Block Print Fabric (per 50 meters)",
        description: "Vegetable dye block printed Kalamkari cotton fabric in wholesale rolls.",
        category: "kalamkari",
        material: "Cotton",
        price: 22000,
        quantity: 150,
        isHandmade: true,
        isGI: true
      },
      {
        name: "Bulk Bamboo Multipurpose Trays (Set of 40)",
        description: "Lightweight, aesthetic bamboo trays suitable for cafes, restaurants, or home organization.",
        category: "bamboo",
        material: "Bamboo",
        price: 10000,
        quantity: 80,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Wholesale Handmade Beaded Jewelry (Lot of 100)",
        description: "Assortment of handmade necklaces and earrings featuring traditional beads and threadwork.",
        category: "jewelry",
        material: "Beads",
        price: 25000,
        quantity: 100,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Bulk Ceramic Glazed Mugs (Set of 100)",
        description: "Hand-thrown ceramic mugs with unique studio glazes. Microwave and dishwasher safe.",
        category: "pottery",
        material: "Ceramic",
        price: 20000,
        quantity: 500,
        isHandmade: true,
        isGI: false
      },
      {
        name: "Wholesale Traditional Wall Hangings (Set of 30)",
        description: "Embroidered ethnic wall hangings featuring mirror work and vibrant threads.",
        category: "decor",
        material: "Fabric",
        price: 15000,
        quantity: 60,
        isHandmade: true,
        isGI: false
      }
    ];

    for (let pData of b2bProducts) {
      const product = await Product.create({
        ...pData,
        artisanId: buyerUser.id, // Assigning to B2B user as requested
        status: 'PUBLISHED'
      });
      // Add a placeholder image
      await ProductImage.create({
        productId: product.id,
        url: `https://picsum.photos/seed/${product.id}/800/800`,
        type: 'ORIGINAL'
      });
    }

    console.log('Seed completed successfully!');
    console.log('-----------------------------------');
    console.log('Total Artisan Products:', artisanProducts.length);
    console.log('Total B2B Products:', b2bProducts.length);
    console.log('Demo Credentials:');
    console.log('ARTISAN - Phone: 9999999999 | Password: artisan123');
    console.log('B2B     - Phone: 8888888888 | Password: buyer1234');
    console.log('-----------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();

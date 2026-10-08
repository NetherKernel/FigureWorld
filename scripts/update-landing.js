const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/figuresworld');
  const collection = mongoose.connection.db.collection('sitecontents');
  const doc = await collection.findOne({ key: 'landing' });
  if (doc) {
    const topCategoriesSection = {
      id: 'top-categories',
      type: 'topCategories',
      enabled: true,
      audience: 'all',
      label: 'Top categories',
      title: 'TOP CATEGORIES',
      seeAllLabel: 'VIEW ALL',
      seeAllHref: '/products',
      items: [
        {
          id: 'cat-bobblehead',
          name: 'BOBBLEHEAD',
          image: '/images/categories/bobblehead.jpg',
          href: '/products?category=collectibles',
        },
        {
          id: 'cat-action-figure',
          name: 'ACTION FIGURE',
          image: '/images/categories/action-figure.jpg',
          href: '/products?category=action-figures',
        },
        {
          id: 'cat-3d-keychain',
          name: '3D KEYCHAIN',
          image: '/images/categories/3d-keychain.jpg',
          href: '/products?category=accessories',
        },
        {
          id: 'cat-keychains',
          name: 'KEYCHAINS',
          image: '/images/categories/keychains.jpg',
          href: '/products?category=accessories',
        },
        {
          id: 'cat-katanas',
          name: 'KATANAS & REPLICAS',
          image: '/images/katanas/oni-katana-fs111wt.jpg',
          href: '/products?category=katanas-replicas',
        },
        {
          id: 'cat-resin-statue',
          name: 'RESIN STATUES',
          image: '/images/figures/madara-uchiha-susanoo-kurama-resin-statue.jpg',
          href: '/products?category=collectibles&subcategory=resin-statues',
        },
      ],
    };

    function updateSections(sections) {
      if (!Array.isArray(sections)) return sections;
      const hero = sections.find(s => s.type === 'hero');
      const bestSellersIdx = sections.findIndex(s => s.id === 'best-sellers' || (s.type === 'productShelf' && s.title?.includes('Best Seller')));
      const afterBestSellers = bestSellersIdx !== -1 
        ? sections.slice(bestSellersIdx) 
        : sections.filter(s => s.id !== 'cards-top' && s.id !== 'deals' && s.id !== 'cards-second' && !s.id.startsWith('promoBanner') && s.type !== 'hero');
      return [
        hero || { id: 'hero', type: 'hero', enabled: true, audience: 'all', slides: [] },
        topCategoriesSection,
        ...afterBestSellers
      ];
    }

    const newPublished = { ...doc.published, sections: updateSections(doc.published?.sections) };
    const newDraft = { ...doc.draft, sections: updateSections(doc.draft?.sections) };

    const updateDoc = {
      $set: {
        published: newPublished,
        draft: newDraft,
        updatedAt: new Date()
      }
    };

    await collection.updateOne({ key: 'landing' }, updateDoc);
    console.log('Successfully updated sitecontents landing in MongoDB!');
    console.log('New section ids:', newPublished.sections.map(s => s.id));
  } else {
    console.log('No landing doc found in sitecontents, using DEFAULT_LANDING_CONFIG');
  }
  await mongoose.disconnect();
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

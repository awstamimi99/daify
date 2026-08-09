(function () {
  const asset = path => new URL(`../../${path}`, document.currentScript.src).href;
  const img = name => asset(`images/menu/${name}`);
  const item = (id, name, description, price, options = {}) => ({
    id, name, description, price,
    image: options.image || null,
    badge: options.badge || '',
    dietary: options.dietary || [],
    available: options.available !== false,
    featured: Boolean(options.featured),
    translations: options.translations || {}
  });

  window.MenuFlowMenuData = {
    restaurant: {
      name: 'Oliva',
      logoText: 'O',
      type: 'Modern Mediterranean',
      description: 'Season-led Mediterranean cooking shaped by the coast, the garden, and the generous tables we grew up around.',
      coverImage: asset('images/oliva-seabass.png'),
      footerImage: asset('images/restaurant-interior.png'),
      address: 'Al Shaheed District, Kuwait City',
      phone: '+965 2200 1840',
      whatsapp: '+965 5000 1840',
      instagram: '@oliva.table',
      openingStatus: 'Open today until 11:00 PM',
      hours: [
        { days: 'Sunday — Thursday', time: '12:00 PM — 11:00 PM', daysAr:'الأحد — الخميس', timeAr:'١٢:٠٠ ظهراً — ١١:٠٠ مساءً' },
        { days: 'Friday — Saturday', time: '12:00 PM — 12:00 AM', daysAr:'الجمعة — السبت', timeAr:'١٢:٠٠ ظهراً — ١٢:٠٠ منتصف الليل' }
      ],
      allergenNotice: 'Please tell our team about allergies before ordering. Dishes are prepared in a kitchen that handles nuts, gluten, dairy, and sesame.',
      translations: {
        ar: {
          name: 'أوليفا', type: 'مطبخ متوسطي معاصر',
          description: 'أطباق متوسطية موسمية مستوحاة من الساحل والحديقة وكرم المائدة.',
          address: 'منطقة الشهيد، مدينة الكويت', openingStatus: 'مفتوح اليوم حتى ١١:٠٠ مساءً',
          allergenNotice: 'يرجى إبلاغ فريقنا بأي حساسية قبل الطلب. تُحضّر الأطباق في مطبخ يتعامل مع المكسرات والغلوتين والألبان والسمسم.'
        }
      }
    },
    sections: [
      {
        id: 'starters', name: 'Starters', nameAr: 'المقبلات', description: 'Small plates for the table.', descriptionAr:'أطباق صغيرة للمشاركة.', order: 1,
        items: [
          item('whipped-feta', 'Whipped Feta', 'Charred peppers, basil oil, toasted sesame and warm flatbread.', '3.500 KD', { dietary:['Vegetarian'], badge:'House Favorite', featured:true, image:img('whipped-feta.jpg'), translations:{ar:{name:'فيتا مخفوقة',description:'فلفل مشوي، زيت الريحان، سمسم وخبز دافئ.'}} }),
          item('octopus', 'Charred Octopus', 'White bean purée, preserved lemon, parsley and smoked paprika.', '5.750 KD', { badge:'Chef\'s Choice', image:img('charred-octopus.jpg'), translations:{ar:{name:'أخطبوط مشوي',description:'هريس الفاصوليا البيضاء، ليمون محفوظ، بقدونس وبابريكا مدخنة.'}} }),
          item('green-hummus', 'Green Herb Hummus', 'Chickpeas, parsley, dill, jalapeño and olive oil.', '2.750 KD', { dietary:['Vegan','Gluten Free'], image:img('green-herb-hummus.jpg'), translations:{ar:{name:'حمص بالأعشاب',description:'حمص، بقدونس، شبت، فلفل أخضر وزيت زيتون.'}} }),
          item('lamb-kibbeh', 'Crisp Lamb Kibbeh', 'Pine nuts, sweet onion, mint and sumac yogurt.', '4.250 KD', { image:img('lamb-kibbeh.jpg'), translations:{ar:{name:'كبة لحم مقرمشة',description:'صنوبر، بصل حلو، نعناع ولبن بالسماق.'}} })
        ]
      },
      {
        id: 'salads', name: 'Salads', nameAr: 'السلطات', description: 'Bright, crisp, and made to share.', descriptionAr:'طازجة ومقرمشة للمشاركة.', order: 2,
        items: [
          item('burrata-tomato', 'Burrata & Heirloom Tomato', 'Peach, basil, sumac, aged balsamic and extra virgin olive oil.', '4.750 KD', { dietary:['Vegetarian','Gluten Free'], badge:'New', featured:true, image:img('burrata-tomato.jpg'), translations:{ar:{name:'بوراتا وطماطم ملونة',description:'خوخ، ريحان، سماق، بلسميك معتق وزيت زيتون بكر.'}} }),
          item('fattoush', 'Garden Fattoush', 'Cucumber, radish, purslane, crisp bread and pomegranate dressing.', '3.250 KD', { dietary:['Vegan'], image:img('garden-fattoush.jpg'), translations:{ar:{name:'فتوش الحديقة',description:'خيار، فجل، بقلة، خبز مقرمش وصلصة الرمان.'}} }),
          item('peach-halloumi', 'Grilled Peach & Halloumi', 'Rocket, toasted almonds, mint and orange blossom honey.', '4.500 KD', { dietary:['Vegetarian','Gluten Free'], image:img('peach-halloumi.jpg'), translations:{ar:{name:'خوخ وحلوم مشوي',description:'جرجير، لوز محمص، نعناع وعسل زهر البرتقال.'}} }),
          item('lentil-salad', 'Warm Lentil Salad', 'Beluga lentils, roasted carrot, tahini, herbs and pickled shallot.', '3.750 KD', { dietary:['Vegan','Gluten Free'], image:img('warm-lentil-salad.jpg'), translations:{ar:{name:'سلطة عدس دافئة',description:'عدس بيلوجا، جزر مشوي، طحينة، أعشاب وبصل مخلل.'}} })
        ]
      },
      {
        id: 'pasta', name: 'Pasta', nameAr: 'الباستا', description: 'Made for slow evenings.', descriptionAr:'لأمسيات هادئة وطويلة.', order: 3,
        items: [
          item('truffle-rigatoni', 'Truffle Rigatoni', 'Rigatoni, wild mushroom cream, aged parmesan and black truffle.', '8.750 KD', { dietary:['Vegetarian'], badge:'Chef\'s Choice', featured:true, image:img('truffle-rigatoni.jpg'), translations:{ar:{name:'ريغاتوني بالكمأة',description:'ريغاتوني، كريمة الفطر البري، بارميزان معتق وكمأة سوداء.'}} }),
          item('lemon-linguine', 'Lemon Linguine', 'Zucchini, capers, parsley, pecorino and Amalfi lemon.', '6.500 KD', { dietary:['Vegetarian'], image:img('lemon-linguine.jpg'), translations:{ar:{name:'لينغويني بالليمون',description:'كوسا، كبر، بقدونس، بيكورينو وليمون.'}} }),
          item('lamb-ragu', 'Slow Lamb Rigatoni', 'Tomato-braised lamb, rosemary, pecorino and crisp breadcrumbs.', '7.750 KD', { badge:'Best Seller', translations:{ar:{name:'ريغاتوني براغو اللحم',description:'لحم مطهو بالطماطم، إكليل الجبل، بيكورينو وفتات خبز مقرمش.'}} }),
          item('spinach-ravioli', 'Spinach Ravioli', 'Brown butter, sage, lemon and toasted hazelnut.', '7.250 KD', { dietary:['Vegetarian'], available:false, translations:{ar:{name:'رافيولي السبانخ',description:'زبدة بنية، مريمية، ليمون وبندق محمص.'}} })
        ]
      },
      {
        id: 'mains', name: 'Mains', nameAr: 'الأطباق الرئيسية', description: 'From the sea, garden, and fire.', descriptionAr:'من البحر والحديقة والنار.', order: 4,
        items: [
          item('sea-bass', 'Lemon Sea Bass', 'Line-caught sea bass, capers, garden herbs and silky potato.', '9.500 KD', { dietary:['Gluten Free'], badge:'Signature', featured:true, image:asset('images/oliva-seabass.png'), translations:{ar:{name:'قاروص بالليمون',description:'قاروص، كبر، أعشاب الحديقة وبطاطا ناعمة.'}} }),
          item('charred-chicken', 'Charred Lemon Chicken', 'Freekeh, roast garlic, green olive and herb jus.', '7.250 KD', { image:img('charred-lemon-chicken.jpg'), translations:{ar:{name:'دجاج مشوي بالليمون',description:'فريكة، ثوم مشوي، زيتون أخضر وصلصة الأعشاب.'}} }),
          item('lamb-kofta', 'Fire-Grilled Lamb Kofta', 'Freekeh, tahini, pomegranate, mint and warm spices.', '8.250 KD', { badge:'Best Seller', image:img('lamb-kofta.jpg'), translations:{ar:{name:'كفتة لحم على الفحم',description:'فريكة، طحينة، رمان، نعناع وبهارات دافئة.'}} }),
          item('aubergine', 'Roasted Aubergine', 'Smoked tomato, tahini, chickpea, pomegranate and dill.', '5.750 KD', { dietary:['Vegan','Gluten Free'], image:img('roasted-aubergine.jpg'), translations:{ar:{name:'باذنجان مشوي',description:'طماطم مدخنة، طحينة، حمص، رمان وشبت.'}} })
        ]
      },
      {
        id: 'desserts', name: 'Desserts', nameAr: 'الحلويات', description: 'A soft finish.', descriptionAr:'نهاية حلوة وخفيفة.', order: 5,
        items: [
          item('olive-oil-cake', 'Olive Oil Cake', 'Citrus, mascarpone, pistachio and orange blossom.', '3.750 KD', { dietary:['Vegetarian'], badge:'House Favorite', featured:true, image:img('olive-oil-cake.jpg'), translations:{ar:{name:'كيكة زيت الزيتون',description:'حمضيات، ماسكاربوني، فستق وزهر البرتقال.'}} }),
          item('tahini-chocolate', 'Tahini Chocolate Tart', 'Dark chocolate, sesame praline, sea salt and crème fraîche.', '4.000 KD', { dietary:['Vegetarian'], image:img('tahini-chocolate-tart.jpg'), translations:{ar:{name:'تارت الشوكولاتة والطحينة',description:'شوكولاتة داكنة، برالين السمسم، ملح البحر وكريمة طازجة.'}} }),
          item('pistachio-baklava', 'Pistachio Baklava', 'Brown butter filo, pistachio, honey and rose.', '3.500 KD', { dietary:['Vegetarian'], image:img('pistachio-baklava.jpg'), translations:{ar:{name:'بقلاوة بالفستق',description:'رقائق فيلو بالزبدة، فستق، عسل وورد.'}} }),
          item('fig-panna-cotta', 'Fig Panna Cotta', 'Vanilla bean, fresh fig and toasted almond.', '3.750 KD', { dietary:['Gluten Free'], available:false, image:img('fig-panna-cotta.jpg'), translations:{ar:{name:'بانا كوتا بالتين',description:'فانيلا، تين طازج ولوز محمص.'}} })
        ]
      },
      {
        id: 'drinks', name: 'Drinks', nameAr: 'المشروبات', description: 'House-made and refreshing.', descriptionAr:'محضّرة لدينا ومنعشة.', order: 6,
        items: [
          item('rosemary-lemonade', 'Rosemary Lemonade', 'Fresh lemon, rosemary syrup and sparkling water.', '1.850 KD', { dietary:['Vegan','Gluten Free'], badge:'House Made', image:img('rosemary-lemonade.jpg'), translations:{ar:{name:'ليمونادة بإكليل الجبل',description:'ليمون طازج، شراب إكليل الجبل ومياه غازية.'}} }),
          item('hibiscus-cooler', 'Hibiscus Cooler', 'Hibiscus, strawberry, lime and rose water.', '2.250 KD', { dietary:['Vegan','Gluten Free'], image:img('hibiscus-cooler.jpg'), translations:{ar:{name:'كركديه بارد',description:'كركديه، فراولة، ليمون وماء ورد.'}} }),
          item('cold-brew', 'Orange Blossom Cold Brew', 'Single-origin coffee, orange blossom and tonic.', '2.500 KD', { dietary:['Vegan','Gluten Free'], image:img('orange-blossom-cold-brew.jpg'), translations:{ar:{name:'كولد برو بزهر البرتقال',description:'قهوة مختصة، زهر البرتقال وتونيك.'}} }),
          item('sparkling-water', 'Sparkling Water', 'Chilled premium mineral water, 750ml.', '2.000 KD', { dietary:['Vegan','Gluten Free'], image:img('sparkling-water.jpg'), translations:{ar:{name:'مياه غازية',description:'مياه معدنية فاخرة مبردة، ٧٥٠ مل.'}} })
        ]
      }
    ]
  };
})();

(function () {
  const shared = {
    cardShape: ['square','soft','rounded'],
    cardStyle: ['flat','bordered','elevated'],
    buttonShape: ['square','rounded','pill'],
    itemLayout: ['list','grid','image-focus'],
    sectionNav: ['tabs','chips','minimal'],
    imageStyle: ['square','rounded','circle','full-bleed']
  };
  const make = (id, name, category, description, defaults, supports = {}) => ({
    id, name, category, description, defaults,
    supports: Object.assign({}, shared, supports),
    presets: {}
  });

  const configs = {
    atelier: make('atelier','Atelier','Fine Dining','Editorial restraint for refined dining.',{
      background:'#f4efe5',surface:'#fbf8f2',primary:'#211f1b',accent:'#b5965b',text:'#211f1b',muted:'#716c63',cardRadius:'2px',buttonRadius:'4px',itemLayout:'list',sectionNav:'minimal',cardStyle:'flat',imageStyle:'square'
    },{itemLayout:['list','image-focus'],sectionNav:['minimal','tabs'],imageStyle:['square','full-bleed']}),
    verde: make('verde','Verde','Cafe / Organic','Fresh, rounded, and naturally bright.',{
      background:'#eff1e8',surface:'#fffdf7',primary:'#486047',accent:'#8aa17d',text:'#263126',muted:'#6b756a',cardRadius:'24px',buttonRadius:'999px',itemLayout:'grid',sectionNav:'chips',cardStyle:'bordered',imageStyle:'rounded'
    },{sectionNav:['chips','tabs'],imageStyle:['rounded','circle']}),
    noir: make('noir','Noir','Dark Luxury','Cinematic contrast and quiet evening drama.',{
      background:'#11120f',surface:'#1b1d19',primary:'#f5efe2',accent:'#c6a769',text:'#f5efe2',muted:'#a7a397',cardRadius:'2px',buttonRadius:'999px',itemLayout:'image-focus',sectionNav:'minimal',cardStyle:'bordered',imageStyle:'full-bleed'
    },{itemLayout:['list','image-focus'],sectionNav:['minimal','tabs'],imageStyle:['square','full-bleed']}),
    amalfi: make('amalfi','Amalfi','Mediterranean','Sunlit, social, and generous.',{
      background:'#fff5df',surface:'#fffdf7',primary:'#244c3d',accent:'#d36943',text:'#27352e',muted:'#716b5e',cardRadius:'18px',buttonRadius:'999px',itemLayout:'image-focus',sectionNav:'chips',cardStyle:'flat',imageStyle:'rounded'
    },{sectionNav:['chips','tabs','minimal'],imageStyle:['rounded','full-bleed']}),
    sora: make('sora','Sora','Japanese Minimal','Precise rhythm and spacious clarity.',{
      background:'#f6f5f1',surface:'#ffffff',primary:'#202321',accent:'#9f4b43',text:'#202321',muted:'#737571',cardRadius:'0px',buttonRadius:'0px',itemLayout:'grid',sectionNav:'tabs',cardStyle:'bordered',imageStyle:'square'
    },{cardShape:['square','soft'],sectionNav:['tabs','minimal'],imageStyle:['square','rounded']}),
    ember: make('ember','Ember','Grill / Fast Casual','Bold, visual, and appetite-led.',{
      background:'#efe6d5',surface:'#fff9ed',primary:'#1b1a17',accent:'#df542f',text:'#1b1a17',muted:'#6d665d',cardRadius:'14px',buttonRadius:'8px',itemLayout:'grid',sectionNav:'tabs',cardStyle:'elevated',imageStyle:'full-bleed'
    },{sectionNav:['tabs','chips'],imageStyle:['rounded','full-bleed']}),
    souk: make('souk','Souk','Middle Eastern','Warm modern hospitality, ready for Arabic.',{
      background:'#eee2ce',surface:'#f9f1e4',primary:'#304a3c',accent:'#a77b44',text:'#29261f',muted:'#71695c',cardRadius:'10px',buttonRadius:'999px',itemLayout:'list',sectionNav:'chips',cardStyle:'bordered',imageStyle:'rounded'
    },{itemLayout:['list','grid','image-focus'],sectionNav:['chips','minimal'],imageStyle:['rounded','circle']}),
    mellow: make('mellow','Mellow','Bakery / Coffee','Soft, tactile, and image-forward.',{
      background:'#f5ebe2',surface:'#fffaf5',primary:'#5b4338',accent:'#9b8f72',text:'#3d302a',muted:'#7d6e67',cardRadius:'28px',buttonRadius:'999px',itemLayout:'grid',sectionNav:'chips',cardStyle:'flat',imageStyle:'rounded'
    },{sectionNav:['chips','minimal'],imageStyle:['rounded','circle','full-bleed']})
  };

  configs.atelier.presets = {
    Classic:{background:'#f4efe5',surface:'#fbf8f2',primary:'#211f1b',accent:'#b5965b'},
    Warm:{background:'#f0e5d6',surface:'#fcf6ed',primary:'#382c24',accent:'#a6764e'},
    Modern:{background:'#f2f1ed',surface:'#ffffff',primary:'#191b19',accent:'#69756b'}
  };
  configs.verde.presets = {Sage:{background:'#eff1e8',surface:'#fffdf7',primary:'#486047',accent:'#8aa17d'},Sand:{background:'#f2eadc',surface:'#fffaf1',primary:'#5e5849',accent:'#a88d66'},Fresh:{background:'#f1f5ea',surface:'#ffffff',primary:'#274e3c',accent:'#79a66f'}};
  configs.noir.presets = {'Black Gold':{background:'#11120f',surface:'#1b1d19',primary:'#f5efe2',accent:'#c6a769'},'Charcoal Olive':{background:'#191b18',surface:'#252820',primary:'#f1eee5',accent:'#86917a'}};
  configs.amalfi.presets = {Coast:{background:'#fff5df',surface:'#fffdf7',primary:'#244c3d',accent:'#d36943'},Terracotta:{background:'#f8ecdc',surface:'#fff9f2',primary:'#563a2d',accent:'#c55f3e'}};
  configs.sora.presets = {Paper:{background:'#f6f5f1',surface:'#ffffff',primary:'#202321',accent:'#9f4b43'},Ink:{background:'#ecece8',surface:'#f8f8f5',primary:'#121412',accent:'#4d5950'}};
  configs.ember.presets = {Fire:{background:'#efe6d5',surface:'#fff9ed',primary:'#1b1a17',accent:'#df542f'},Smoke:{background:'#ddd9d0',surface:'#f7f3ea',primary:'#222421',accent:'#a54d37'}};
  configs.souk.presets = {Olive:{background:'#eee2ce',surface:'#f9f1e4',primary:'#304a3c',accent:'#a77b44'},Sand:{background:'#f2e8d7',surface:'#fffaf0',primary:'#4c4032',accent:'#b88d52'}};
  configs.mellow.presets = {Cocoa:{background:'#f5ebe2',surface:'#fffaf5',primary:'#5b4338',accent:'#9b8f72'},Rose:{background:'#f6e9e5',surface:'#fffafa',primary:'#694b48',accent:'#b68c83'}};

  window.MenuFlowTemplateConfigs = configs;
})();

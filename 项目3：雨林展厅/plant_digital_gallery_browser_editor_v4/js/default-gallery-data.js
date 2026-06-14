window.DEFAULT_GALLERY_DATA = {
  "project": {
    "id": "plant_digital_gallery",
    "title": "万象植境｜Botanical Immersive Archive",
    "subtitle": "360° 植物数字展厅编辑器｜可视化修改版",
    "version": "0.2.0",
    "style": "高级植物博物馆 × 东方自然美学 × 现代展陈设计",
    "note": "全景图只负责空间氛围和空展位；准确展品通过热点、弹窗、展品图、HTML 文字和语音实现。"
  },
  "settings": {
    "startRoomId": "room_01_plant_gate",
    "autoLoadPanorama": true,
    "defaultSceneFadeDuration": 800,
    "uiLanguage": "zh-CN",
    "showHotspotLabels": true,
    "musicEnabled": false,
    "tourModeEnabled": false,
    "mediaBaseUrl": "assets/"
  },
  "rooms": [
    {
      "id": "room_01_plant_gate",
      "name": "植物之门",
      "shortName": "序厅",
      "theme": "项目序厅 / 世界观入口",
      "panoramaUrl": "",
      "panoramaAlt": "请填入或上传 Room 01 序厅空展位版 360° 全景图",
      "bgmUrl": "",
      "initialView": {
        "yaw": 0,
        "pitch": 0,
        "hfov": 105
      },
      "hotspots": [
        {
          "id": "P001_life_ring",
          "title": "生命之环",
          "subtitle": "Life Ring",
          "type": "concept_installation",
          "yaw": -18,
          "pitch": -3,
          "imageUrl": "",
          "audioUrl": "",
          "tags": [
            "概念装置",
            "生命循环",
            "序厅"
          ],
          "description": "以种子、根系、叶脉与枝条构成抽象环形生命结构，象征植物从萌发、生长、共生到未来生态的循环。",
          "guideText": "这里是植物之门的核心装置。生命之环并不代表某一种具体植物，而是整个展厅的精神锚点。",
          "infoBlocks": [
            {
              "label": "展品定位",
              "value": "以种子、根系、叶脉与枝条构成抽象环形生命结构，象征植物从萌发、生长、共生到未来生态的循环。"
            },
            {
              "label": "互动方式",
              "value": "点击热点打开信息页；可在右侧编辑标题、图片、讲解词、标签和自定义信息块。"
            }
          ]
        },
        {
          "id": "P002_digital_archive_wall",
          "title": "植物数字档案墙",
          "subtitle": "Botanical Digital Archive Wall",
          "type": "digital_archive",
          "yaw": 36,
          "pitch": 2,
          "imageUrl": "",
          "audioUrl": "",
          "tags": [
            "数字档案",
            "导览",
            "信息装置"
          ],
          "description": "一组半透明信息屏与植物线描构成的数字档案界面，用于说明本展厅如何通过图像、文字、音频和数据管理植物内容。",
          "guideText": "植物数字档案墙是进入展厅后的第一层信息界面，它提示观众：这里的展品由空间、数据和交互共同组成。",
          "infoBlocks": [
            {
              "label": "展品定位",
              "value": "一组半透明信息屏与植物线描构成的数字档案界面，用于说明本展厅如何通过图像、文字、音频和数据管理植物内容。"
            },
            {
              "label": "互动方式",
              "value": "点击热点打开信息页；可在右侧编辑标题、图片、讲解词、标签和自定义信息块。"
            }
          ]
        }
      ]
    },
    {
      "id": "room_02_seed_archive",
      "name": "种子档案馆",
      "shortName": "种子",
      "theme": "植物生命的起点",
      "panoramaUrl": "",
      "panoramaAlt": "请填入或上传 Room 02 种子档案馆空展位版 360° 全景图",
      "bgmUrl": "",
      "initialView": {
        "yaw": 0,
        "pitch": 0,
        "hfov": 105
      },
      "hotspots": [
        {
          "id": "P003_sleeping_seed",
          "title": "睡眠中的种子",
          "subtitle": "Sleeping Seed",
          "type": "seed_specimen",
          "yaw": -24,
          "pitch": -7,
          "imageUrl": "",
          "audioUrl": "",
          "tags": [
            "种子",
            "休眠",
            "标本"
          ],
          "description": "一枚被精致陈列的种子标本，表面纹理与微小颗粒暗示其在休眠状态中保存的生命潜能。",
          "guideText": "种子看似静止，却携带着完整的生命计划。它等待适合的温度、水分与光照，才开始新的生长。",
          "infoBlocks": [
            {
              "label": "展品定位",
              "value": "一枚被精致陈列的种子标本，表面纹理与微小颗粒暗示其在休眠状态中保存的生命潜能。"
            },
            {
              "label": "互动方式",
              "value": "点击热点打开信息页；可在右侧编辑标题、图片、讲解词、标签和自定义信息块。"
            }
          ]
        },
        {
          "id": "P004_first_root",
          "title": "第一根须",
          "subtitle": "First Root",
          "type": "germination",
          "yaw": 28,
          "pitch": -5,
          "imageUrl": "",
          "audioUrl": "",
          "tags": [
            "发芽",
            "根系",
            "微观生命"
          ],
          "description": "细小白色根须从种子外壳中伸出，呈现植物生命与土壤建立联系的第一刻。",
          "guideText": "第一根须是植物与环境接触的开始。它向下寻找水分，也为之后的茎叶生长建立支撑。",
          "infoBlocks": [
            {
              "label": "展品定位",
              "value": "细小白色根须从种子外壳中伸出，呈现植物生命与土壤建立联系的第一刻。"
            },
            {
              "label": "互动方式",
              "value": "点击热点打开信息页；可在右侧编辑标题、图片、讲解词、标签和自定义信息块。"
            }
          ]
        }
      ]
    },
    {
      "id": "room_03_oriental_herbarium",
      "name": "东方本草馆",
      "shortName": "本草",
      "theme": "东方植物文化与本草美学",
      "panoramaUrl": "",
      "panoramaAlt": "请填入或上传 Room 03 东方本草馆空展位版 360° 全景图",
      "bgmUrl": "",
      "initialView": {
        "yaw": 0,
        "pitch": 0,
        "hfov": 105
      },
      "hotspots": [
        {
          "id": "P005_lotus_clear_bone",
          "title": "荷：水中清骨",
          "subtitle": "Lotus: Clear Bone in Water",
          "type": "oriental_botanical_exhibit",
          "yaw": -32,
          "pitch": -3,
          "imageUrl": "",
          "audioUrl": "",
          "tags": [
            "荷",
            "东方美学",
            "水生植物"
          ],
          "description": "以荷叶、荷花、莲蓬或局部结构构成清雅的植物展品，表达东方审美中的洁净、水性与精神性。",
          "guideText": "荷在东方文化中常被视为清雅与自持的象征。本展品更关注它的结构、线条与水中生长的气质。",
          "infoBlocks": [
            {
              "label": "展品定位",
              "value": "以荷叶、荷花、莲蓬或局部结构构成清雅的植物展品，表达东方审美中的洁净、水性与精神性。"
            },
            {
              "label": "互动方式",
              "value": "点击热点打开信息页；可在右侧编辑标题、图片、讲解词、标签和自定义信息块。"
            }
          ]
        },
        {
          "id": "P006_bamboo_wind_frame",
          "title": "竹：风中的骨架",
          "subtitle": "Bamboo: Frame in the Wind",
          "type": "oriental_botanical_structure",
          "yaw": 30,
          "pitch": -4,
          "imageUrl": "",
          "audioUrl": "",
          "tags": [
            "竹",
            "节间结构",
            "东方空间"
          ],
          "description": "通过竹节、竹叶与枝干关系呈现竹的线性美、节间结构和韧性。",
          "guideText": "竹的魅力不只在形象，也在结构。节与节之间形成有秩序的骨架，让植物拥有柔韧而清晰的空间感。",
          "infoBlocks": [
            {
              "label": "展品定位",
              "value": "通过竹节、竹叶与枝干关系呈现竹的线性美、节间结构和韧性。"
            },
            {
              "label": "互动方式",
              "value": "点击热点打开信息页；可在右侧编辑标题、图片、讲解词、标签和自定义信息块。"
            }
          ]
        }
      ]
    },
    {
      "id": "room_04_rainforest_network",
      "name": "雨林共生馆",
      "shortName": "雨林",
      "theme": "植物与生态网络",
      "panoramaUrl": "",
      "panoramaAlt": "请填入或上传 Room 04 雨林共生馆空展位版 360° 全景图",
      "bgmUrl": "",
      "initialView": {
        "yaw": 0,
        "pitch": 0,
        "hfov": 105
      },
      "hotspots": [
        {
          "id": "P007_epiphyte_garden",
          "title": "附生花园",
          "subtitle": "Epiphyte Garden",
          "type": "ecological_relationship",
          "yaw": -38,
          "pitch": 0,
          "imageUrl": "",
          "audioUrl": "",
          "tags": [
            "附生植物",
            "雨林",
            "垂直生态"
          ],
          "description": "附生植物依附在树皮、岩石或支架上生长，展示植物在垂直生态空间中的生存方式。",
          "guideText": "在雨林中，植物并不总是从地面开始。附生植物借助树干、岩石和空气湿度，在垂直空间中形成另一种花园。",
          "infoBlocks": [
            {
              "label": "展品定位",
              "value": "附生植物依附在树皮、岩石或支架上生长，展示植物在垂直生态空间中的生存方式。"
            },
            {
              "label": "互动方式",
              "value": "点击热点打开信息页；可在右侧编辑标题、图片、讲解词、标签和自定义信息块。"
            }
          ]
        },
        {
          "id": "P008_pollination_hidden_line",
          "title": "授粉暗线",
          "subtitle": "Pollination Hidden Line",
          "type": "ecological_network",
          "yaw": 34,
          "pitch": 2,
          "imageUrl": "",
          "audioUrl": "",
          "tags": [
            "授粉",
            "生态协作",
            "花与昆虫"
          ],
          "description": "通过花朵、授粉者剪影和细微关系线，表现植物与昆虫、鸟类之间隐藏的生态协作。",
          "guideText": "一朵花的形态，常常对应着某种授粉关系。看似安静的植物世界，其实布满了精密的生态暗线。",
          "infoBlocks": [
            {
              "label": "展品定位",
              "value": "通过花朵、授粉者剪影和细微关系线，表现植物与昆虫、鸟类之间隐藏的生态协作。"
            },
            {
              "label": "互动方式",
              "value": "点击热点打开信息页；可在右侧编辑标题、图片、讲解词、标签和自定义信息块。"
            }
          ]
        }
      ]
    },
    {
      "id": "room_05_future_botany",
      "name": "未来植境馆",
      "shortName": "未来",
      "theme": "AI、植物与未来生态",
      "panoramaUrl": "",
      "panoramaAlt": "请填入或上传 Room 05 未来植境馆空展位版 360° 全景图",
      "bgmUrl": "",
      "initialView": {
        "yaw": 0,
        "pitch": 0,
        "hfov": 105
      },
      "hotspots": [
        {
          "id": "P009_climate_adaptive_plant",
          "title": "气候适应型植物",
          "subtitle": "Climate-Adaptive Plant",
          "type": "future_botanical_specimen",
          "yaw": -26,
          "pitch": -2,
          "imageUrl": "",
          "audioUrl": "",
          "tags": [
            "未来植物",
            "气候适应",
            "AI 设定"
          ],
          "description": "一株根据未来气候想象生成的植物样本，视觉上体现耐旱、耐热、储水或城市环境适应特征。",
          "guideText": "当气候环境改变，植物也可能发展出新的适应策略。这个样本以植物逻辑为基础，想象未来城市中的生长方式。",
          "infoBlocks": [
            {
              "label": "展品定位",
              "value": "一株根据未来气候想象生成的植物样本，视觉上体现耐旱、耐热、储水或城市环境适应特征。"
            },
            {
              "label": "互动方式",
              "value": "点击热点打开信息页；可在右侧编辑标题、图片、讲解词、标签和自定义信息块。"
            }
          ]
        },
        {
          "id": "P010_vertical_forest_module",
          "title": "城市垂直森林模块",
          "subtitle": "Urban Vertical Forest Module",
          "type": "eco_architecture_model",
          "yaw": 35,
          "pitch": -4,
          "imageUrl": "",
          "audioUrl": "",
          "tags": [
            "生态建筑",
            "垂直绿化",
            "城市降温"
          ],
          "description": "一个未来城市垂直绿化模块模型，连接植物、建筑立面、城市微气候与可持续生活方式。",
          "guideText": "植物不只存在于自然环境中，也可以成为城市基础设施的一部分。垂直森林模块展示了建筑与植物共生的可能性。",
          "infoBlocks": [
            {
              "label": "展品定位",
              "value": "一个未来城市垂直绿化模块模型，连接植物、建筑立面、城市微气候与可持续生活方式。"
            },
            {
              "label": "互动方式",
              "value": "点击热点打开信息页；可在右侧编辑标题、图片、讲解词、标签和自定义信息块。"
            }
          ]
        }
      ]
    }
  ],
  "tourSequence": [
    {
      "roomId": "room_01_plant_gate",
      "hotspotId": "P001_life_ring",
      "duration": 7
    },
    {
      "roomId": "room_01_plant_gate",
      "hotspotId": "P002_digital_archive_wall",
      "duration": 7
    },
    {
      "roomId": "room_02_seed_archive",
      "hotspotId": "P003_sleeping_seed",
      "duration": 7
    },
    {
      "roomId": "room_02_seed_archive",
      "hotspotId": "P004_first_root",
      "duration": 7
    },
    {
      "roomId": "room_03_oriental_herbarium",
      "hotspotId": "P005_lotus_clear_bone",
      "duration": 7
    },
    {
      "roomId": "room_03_oriental_herbarium",
      "hotspotId": "P006_bamboo_wind_frame",
      "duration": 7
    },
    {
      "roomId": "room_04_rainforest_network",
      "hotspotId": "P007_epiphyte_garden",
      "duration": 7
    },
    {
      "roomId": "room_04_rainforest_network",
      "hotspotId": "P008_pollination_hidden_line",
      "duration": 7
    },
    {
      "roomId": "room_05_future_botany",
      "hotspotId": "P009_climate_adaptive_plant",
      "duration": 7
    },
    {
      "roomId": "room_05_future_botany",
      "hotspotId": "P010_vertical_forest_module",
      "duration": 7
    }
  ]
};

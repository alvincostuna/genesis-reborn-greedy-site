-- WEB MIGRATION 004: Reward Catalog Batch 001
-- PREPARED ONLY. Do not apply until Migration 003 is applied and all referenced assets exist.

insert into public.reader_collectible_catalog
  (collectible_key,title,image_url,asset_type,preview_url,download_url,rarity,min_episode,downloadable,active)
values
  ('RG-B001-CARD-001','A Second Chance','/assets/v27/rewards/a-second-chance.webp','PICTURE_CARD','/assets/v27/rewards/a-second-chance.webp','/assets/v27/rewards/a-second-chance.webp','COMMON',1,true,true),
  ('RG-B001-CARD-002','The Life He Never Lived','/assets/v27/rewards/the-life-he-never-lived.webp','PICTURE_CARD','/assets/v27/rewards/the-life-he-never-lived.webp','/assets/v27/rewards/the-life-he-never-lived.webp','UNCOMMON',1,true,true),
  ('RG-B001-CARD-003','Enter GENESIS','/assets/v27/rewards/enter-genesis.webp','PICTURE_CARD','/assets/v27/rewards/enter-genesis.webp','/assets/v27/rewards/enter-genesis.webp','COMMON',1,true,true),
  ('RG-B001-CARD-004','The First Grind','/assets/v27/rewards/the-first-grind.webp','PICTURE_CARD','/assets/v27/rewards/the-first-grind.webp','/assets/v27/rewards/the-first-grind.webp','UNCOMMON',3,true,true),
  ('RG-B001-CHAR-001','Flavio Reyes — Beginning','/assets/v27/rewards/flavio-beginning.webp','CHARACTER_PICTURE','/assets/v27/rewards/flavio-beginning.webp','/assets/v27/rewards/flavio-beginning.webp','COMMON',1,true,true),
  ('RG-B001-CHAR-002','Maya — Stay With Me','/assets/v27/rewards/maya-stay-with-me.webp','CHARACTER_PICTURE','/assets/v27/rewards/maya-stay-with-me.webp','/assets/v27/rewards/maya-stay-with-me.webp','RARE',1,true,true),
  ('RG-B001-CHAR-003','Nico — First Companion','/assets/v27/rewards/nico-first-companion.webp','CHARACTER_PICTURE','/assets/v27/rewards/nico-first-companion.webp','/assets/v27/rewards/nico-first-companion.webp','UNCOMMON',3,true,true),
  ('RG-B001-MON-001','Gnawer — Field Study','/assets/v27/rewards/gnawer-field-study.webp','MONSTER_PICTURE','/assets/v27/rewards/gnawer-field-study.webp','/assets/v27/rewards/gnawer-field-study.webp','COMMON',3,true,true),
  ('RG-B001-DESK-001','Moonlit GENESIS','/assets/v27/rewards/moonlit-genesis.webp','DESKTOP_WALLPAPER','/assets/v27/rewards/moonlit-genesis.webp','/assets/v27/rewards/moonlit-genesis.webp','RARE',0,true,true),
  ('RG-B001-DESK-002','City Beyond the Falls','/assets/v27/rewards/city-beyond-the-falls.webp','DESKTOP_WALLPAPER','/assets/v27/rewards/city-beyond-the-falls.webp','/assets/v27/rewards/city-beyond-the-falls.webp','EPIC',1,true,true),
  ('RG-B001-MOB-001','Reborn Under Moonlight','/assets/v27/rewards/reborn-under-moonlight.webp','MOBILE_WALLPAPER','/assets/v27/rewards/reborn-under-moonlight.webp','/assets/v27/rewards/reborn-under-moonlight.webp','RARE',0,true,true),
  ('RG-B001-MOB-002','The Road Ahead','/assets/v27/rewards/the-road-ahead.webp','MOBILE_WALLPAPER','/assets/v27/rewards/the-road-ahead.webp','/assets/v27/rewards/the-road-ahead.webp','UNCOMMON',1,true,true),
  ('RG-B001-BG-001','Genesis Blue — Astral Hall','/assets/v27/rewards/genesis-blue-astral-hall.webp','BACKGROUND','/assets/v27/rewards/genesis-blue-astral-hall.webp','/assets/v27/rewards/genesis-blue-astral-hall.webp','COMMON',0,true,true),
  ('RG-B001-BG-002','Forged Gold — Night Citadel','/assets/v27/rewards/forged-gold-night-citadel.webp','BACKGROUND','/assets/v27/rewards/forged-gold-night-citadel.webp','/assets/v27/rewards/forged-gold-night-citadel.webp','UNCOMMON',1,true,true),
  ('RG-B001-SPEC-001','Reborn Greedy — Founding Illustration','/assets/v27/rewards/reborn-greedy-founding.webp','SPECIAL_ART','/assets/v27/rewards/reborn-greedy-founding.webp','/assets/v27/rewards/reborn-greedy-founding.webp','LEGENDARY',5,true,true)
on conflict(collectible_key) do update
set title=excluded.title,
    image_url=excluded.image_url,
    asset_type=excluded.asset_type,
    preview_url=excluded.preview_url,
    download_url=excluded.download_url,
    rarity=excluded.rarity,
    min_episode=excluded.min_episode,
    downloadable=excluded.downloadable,
    active=excluded.active;
